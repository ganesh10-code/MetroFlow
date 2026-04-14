# backend/ml/planner_engine.py

import pandas as pd
import joblib
import json
from sqlalchemy import create_engine, text

from ml.config import DATABASE_URL, MODEL_PATH

engine = create_engine(DATABASE_URL)


# ==========================================================
# LOAD MODEL
# ==========================================================
def load_model():
    return joblib.load(MODEL_PATH)


# ==========================================================
# OCR COUNTS
# supports:
# run_count
# standby_count
# maintenance_count (new optional column)
# ==========================================================
def get_ocr_counts(total_trains):

    base_run = 18
    base_standby = 4
    base_maint = max(0, total_trains - 22)

    with engine.begin() as conn:

        try:
            row = conn.execute(text("""
                SELECT
                    run_count,
                    standby_count,
                    COALESCE(
                        maintenance_count,
                        0
                    ) AS maintenance_count
                FROM operations_control_room
                ORDER BY updated_at DESC
                LIMIT 1
            """)).fetchone()

            if row:

                run = int(row[0] or 0)
                standby = int(row[1] or 0)
                maint = int(row[2] or 0)

                # if maint not set -> compute balance
                if maint <= 0:
                    maint = max(
                        0,
                        total_trains - run - standby
                    )

                # normalize totals
                total = run + standby + maint

                if total != total_trains:
                    diff = total_trains - total
                    maint += diff

                return run, standby, maint

        except Exception:
            pass

    return base_run, base_standby, base_maint


# ==========================================================
# FETCH DATA
# ==========================================================
def fetch_latest_planning_data():

    with engine.begin() as conn:

        for table in [
            "real_daily_features",
            "synthetic_daily_features"
        ]:

            exists = conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name='{table}'
                )
            """)).scalar()

            if exists:

                cnt = conn.execute(
                    text(f"SELECT COUNT(*) FROM {table}")
                ).scalar()

                if cnt > 0:

                    df = pd.read_sql(
                        f"SELECT * FROM {table}",
                        conn
                    )

                    latest = df["date"].max()

                    return df[
                        df["date"] == latest
                    ].copy()

    raise Exception("No planning data available")


# ==========================================================
# POPUP TABLES
# ==========================================================
def get_department_popup_data(dept):

    mapping = {
        "maintenance_logs": "maintenance_logs",
        "cleaning_logs": "cleaning_logs",
        "fitness_logs": "fitness_logs",
        "branding_logs": "branding_logs",
        "operations_control_room":
            "operations_control_room"
    }

    table = mapping.get(dept.lower())

    if not table:
        return {"department": dept, "rows": []}

    with engine.begin() as conn:

        try:
            df = pd.read_sql(
                f"""
                SELECT *
                FROM {table}
                ORDER BY id DESC
                LIMIT 100
                """,
                conn
            )

            return {
                "department": dept,
                "rows": df.to_dict(
                    orient="records"
                )
            }

        except Exception:
            return {
                "department": dept,
                "rows": []
            }


# ==========================================================
# FEATURES
# ==========================================================
def prepare_features(df):

    defaults = {
        "open_jobs": 0,
        "mileage_today": 0,
        "branding_priority": 0,
        "shunting_time": 0,
        "cleaning_required": 0,
        "compliance_status": "FIT"
    }

    for col, val in defaults.items():
        if col not in df.columns:
            df[col] = val

    df["open_jobs"] = df["open_jobs"].fillna(0)
    df["mileage_today"] = df["mileage_today"].fillna(0)
    df["branding_priority"] = df[
        "branding_priority"
    ].fillna(0)
    df["shunting_time"] = df[
        "shunting_time"
    ].fillna(0)
    df["cleaning_required"] = df[
        "cleaning_required"
    ].fillna(0)

    df["job_severity_score"] = (
        df["open_jobs"] * 2
    )

    df["mileage_ratio"] = (
        df["mileage_today"] / 300
    )

    return df


# ==========================================================
# PRIORITY SCORE
# ==========================================================
def compute_priority_score(row):

    # SAFETY FIRST:
    # risk gets strongest weight
    # business value is secondary

    score = (
        20
        - (row["risk_score"] * 10.0)
        - (row["open_jobs"] * 0.9)
        - (row["cleaning_required"] * 1.2)
        - (row["shunting_time"] * 0.06)
        + (row["branding_priority"] * 0.45)
        + (row["mileage_ratio"] * 0.35)
    )

    # compliance warning penalty
    if row["compliance_status"] != "FIT":
        score -= 8

    return round(score, 4)


# ==========================================================
# MAINTENANCE RULE
# STRICT ONLY FOR REAL BLOCKERS
# ==========================================================
def must_go_maintenance(row):

    if row["compliance_status"] != "FIT":
        return True

    if row["open_jobs"] >= 8:
        return True

    return False


# ==========================================================
# WHAT IF
# ==========================================================
def apply_simulation(df, config):

    if not config:
        return df

    scenario = config.get("scenario")

    if scenario == "TRAIN_FAILURE":
        df.loc[df.index[:2], "open_jobs"] += 6

    elif scenario == "WEATHER":
        df["shunting_time"] += 8

    elif scenario == "CLEANING_DELAY":
        df["cleaning_required"] = 1

    elif scenario == "SIGNALLING_FAILURE":
        df.loc[df.index[:3], "open_jobs"] += 4

    elif scenario == "VIP_BRANDING_DAY":
        df["branding_priority"] += 2

    elif scenario == "MULTIPLE_BREAKDOWN":
        df.loc[df.index[:4], "open_jobs"] += 5

    return df


# ==========================================================
# STRICT COUNT ASSIGNMENT
# ==========================================================
def optimize_plan(
    df,
    run_target,
    standby_target,
    maint_target
):

    df = df.copy()
    df["decision"] = "STANDBY"

    df["priority_score"] = df.apply(
        compute_priority_score,
        axis=1
    )

    # --------------------------------------------------
    # Forced maintenance (true blockers only)
    # --------------------------------------------------
    forced = df.apply(
        must_go_maintenance,
        axis=1
    )

    forced_idx = df[forced].index.tolist()

    for idx in forced_idx:
        df.loc[idx, "decision"] = "MAINTENANCE"

    current_maint = len(forced_idx)

    # --------------------------------------------------
    # If too many forced maintenance,
    # recover least risky best trains first
    # --------------------------------------------------
    if current_maint > maint_target:

        extra = current_maint - maint_target

        forced_sorted = df.loc[
            forced_idx
        ].sort_values(
            by=["risk_score", "priority_score"],
            ascending=[True, False]
        )

        move_back = forced_sorted.head(extra).index

        for idx in move_back:
            df.loc[idx, "decision"] = "STANDBY"

    # --------------------------------------------------
    # Need more maintenance
    # choose riskiest / weakest standby trains
    # --------------------------------------------------
    elif current_maint < maint_target:

        need = maint_target - current_maint

        candidates = df[
            df["decision"] == "STANDBY"
        ].sort_values(
            by=["risk_score", "priority_score"],
            ascending=[False, True]
        )

        for idx in candidates.head(need).index:
            df.loc[idx, "decision"] = "MAINTENANCE"

    # --------------------------------------------------
    # RUN trains = safest first
    # then priority
    # --------------------------------------------------
    standby_pool = df[
        df["decision"] == "STANDBY"
    ].sort_values(
        by=["risk_score", "priority_score"],
        ascending=[True, False]
    )

    for idx in standby_pool.head(run_target).index:
        df.loc[idx, "decision"] = "RUN"

    return df


# ==========================================================
# SAVE VERSION
# ==========================================================
def save_plan_version(
    version_type,
    rows,
    notes=None
):

    payload = {
        "notes": notes,
        "rows": rows
    }

    with engine.begin() as conn:

        conn.execute(text("""
            INSERT INTO plan_versions(
                version_type,
                notes
            )
            VALUES(
                :v,
                :n
            )
        """), {
            "v": version_type,
            "n": json.dumps(
                payload,
                default=str
            )
        })


# ==========================================================
# GENERATE PLAN
# ==========================================================
def generate_temp_plan(config=None):

    df = fetch_latest_planning_data()

    df = prepare_features(df)

    model = load_model()

    X = df[
        [
            "open_jobs",
            "mileage_today",
            "branding_priority",
            "shunting_time",
            "job_severity_score",
            "mileage_ratio"
        ]
    ]

    df["risk_score"] = (
        model.predict_proba(X)[:, 1]
    )

    df = apply_simulation(df, config)

    total = len(df)

    run_count, standby_count, maint_count = (
        get_ocr_counts(total)
    )

    if config and config.get("scenario") == "PEAK_HOUR":
        run_count += 2
        maint_count = max(
            0,
            total - run_count - standby_count
        )

    if config and config.get("scenario") == "STAFF_SHORTAGE":
        run_count = max(1, run_count - 3)
        maint_count = max(
            0,
            total - run_count - standby_count
        )

    df = optimize_plan(
        df,
        run_count,
        standby_count,
        maint_count
    )

    df["override_flag"] = False

    rows = df.to_dict(
        orient="records"
    )

    if config:
        save_plan_version(
            "SIMULATION",
            rows,
            config.get("scenario")
        )
    else:
        save_plan_version(
            "GENERATED",
            rows,
            "Initial generated plan"
        )

    return df


# ==========================================================
# SAVE FINAL
# ==========================================================
def save_final_plan(df):

    with engine.begin() as conn:

        result = conn.execute(text("""
            INSERT INTO plans(
                date,
                total_trains,
                maintenance_count,
                standby_count,
                run_count,
                avg_risk_score
            )
            VALUES(
                :date,:total,:m,:s,:r,:avg
            )
            RETURNING id
        """), {
            "date": str(df["date"].iloc[0]),
            "total": int(len(df)),
            "m": int(
                (df["decision"]
                 == "MAINTENANCE").sum()
            ),
            "s": int(
                (df["decision"]
                 == "STANDBY").sum()
            ),
            "r": int(
                (df["decision"]
                 == "RUN").sum()
            ),
            "avg": float(
                df["risk_score"].mean()
            )
        })

        pid = int(result.fetchone()[0])

        for _, row in df.iterrows():

            conn.execute(text("""
                INSERT INTO plan_details(
                    plan_id,
                    train_id,
                    decision,
                    risk_score,
                    priority_score,
                    reason
                )
                VALUES(
                    :pid,:tid,:d,:r,:p,:reason
                )
            """), {
                "pid": pid,
                "tid": str(row["train_id"]),
                "d": str(row["decision"]),
                "r": float(row["risk_score"]),
                "p": float(row["priority_score"]),
                "reason":
                    "Manual Override"
                    if row["override_flag"]
                    else "Optimizer"
            })

    save_plan_version(
        "FINALIZED",
        df.to_dict(
            orient="records"
        ),
        "Final approved plan"
    )

    return pid


# ==========================================================
# COMPARE
# ==========================================================
def compare_plans(
    original_rows,
    final_rows
):

    o = pd.DataFrame(original_rows)
    f = pd.DataFrame(final_rows)

    return {
        "generated_run":
            int(
                (o["decision"] == "RUN").sum()
            ),
        "final_run":
            int(
                (f["decision"] == "RUN").sum()
            ),
        "generated_standby":
            int(
                (o["decision"] == "STANDBY").sum()
            ),
        "final_standby":
            int(
                (f["decision"] == "STANDBY").sum()
            ),
        "override_changes":
            int(
                (o["decision"]
                 != f["decision"]).sum()
            ),
        "avg_risk_generated":
            round(
                float(
                    o["risk_score"].mean()
                ),
                2
            ),
        "avg_risk_final":
            round(
                float(
                    f["risk_score"].mean()
                ),
                2
            )
    }