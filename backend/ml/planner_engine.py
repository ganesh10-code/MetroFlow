# backend/ml/planner_engine.py
from datetime import datetime
from zoneinfo import ZoneInfo
import pandas as pd
import joblib
import json
import os
import sys
from sqlalchemy import create_engine, text
from ml.config import DATABASE_URL, MODEL_PATH

ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from pipeline.real_feature_pipeline import generate_real_daily_features


engine = create_engine(DATABASE_URL)

IST = ZoneInfo("Asia/Kolkata")

def ist_now():
    return datetime.now(IST)
def ist_today():
    return ist_now().date()

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
# REPLACE EXISTING get_ocr_counts()

def get_ocr_counts(total_trains):

    today = ist_today()

    base_run = 18
    base_standby = 4
    base_maint = max(0, total_trains - 22)

    with engine.begin() as conn:

        try:
            row = conn.execute(text("""
                SELECT
                    run_count,
                    standby_count,
                    COALESCE(maintenance_count, 0)
                FROM operations_control_room
                WHERE log_date = :today
                LIMIT 1
            """), {
                "today": today
            }).fetchone()

            if row:

                run = int(row[0] or 0)
                standby = int(row[1] or 0)
                maint = int(row[2] or 0)

                if maint <= 0:
                    maint = max(
                        0,
                        total_trains - run - standby
                    )

                total = run + standby + maint

                if total != total_trains:
                    maint += (total_trains - total)

                return run, standby, maint

        except Exception:
            pass

    return base_run, base_standby, base_maint

# ==========================================================
# FETCH LATEST PLANNING DATA
# ==========================================================

def fetch_latest_planning_data():

    today = ist_today()

    with engine.begin() as conn:

        # --------------------------------------
        # Dynamic fleet size
        # --------------------------------------
        fleet_count = conn.execute(text("""
            SELECT COUNT(*)
            FROM master_train_data
        """)).scalar()

        # --------------------------------------
        # Check all departments submitted
        # full fleet today
        # --------------------------------------
        counts = conn.execute(text("""
            SELECT
            (SELECT COUNT(DISTINCT train_id)
             FROM maintenance_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM cleaning_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM fitness_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM branding_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM mileage_logs
             WHERE log_date=:today)
        """), {
            "today": today
        }).fetchone()

        all_ready = all(
            int(x or 0) >= int(fleet_count)
            for x in counts
        )

        # --------------------------------------
        # USE REAL DATA ONLY IF ALL READY
        # --------------------------------------
        if all_ready:

            generate_real_daily_features()

            cnt = conn.execute(text("""
                SELECT COUNT(*)
                FROM real_daily_features
                WHERE date = :today
            """), {
                "today": today
            }).scalar()

            if cnt > 0:
                return pd.read_sql(text("""
                    SELECT *
                    FROM real_daily_features
                    WHERE date = :today
                    ORDER BY train_id
                """), conn, params={
                    "today": today
                })

        # --------------------------------------
        # FALLBACK SYNTHETIC
        # --------------------------------------
        cnt = conn.execute(text("""
            SELECT COUNT(*)
            FROM synthetic_daily_features
            WHERE date = :today
        """), {
            "today": today
        }).scalar()

        if cnt > 0:
            return pd.read_sql(text("""
                SELECT *
                FROM synthetic_daily_features
                WHERE date = :today
                ORDER BY train_id
            """), conn, params={
                "today": today
            })

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
        "operations_control_room": "operations_control_room",
        "mileage_logs": "mileage_logs"
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
# REPLACE EXISTING save_final_plan()

def save_final_plan(df):

    today = str(df["date"].iloc[0])

    with engine.begin() as conn:

        # -----------------------------------
        # UPSERT plans
        # -----------------------------------
        conn.execute(text("""
            INSERT INTO plans(
                date,
                total_trains,
                maintenance_count,
                standby_count,
                run_count,
                avg_risk_score,
                created_at,
                updated_at
            )
            VALUES(
                :date,:total,:m,:s,:r,:avg,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )

            ON CONFLICT (date)

            DO UPDATE SET
                total_trains = EXCLUDED.total_trains,
                maintenance_count = EXCLUDED.maintenance_count,
                standby_count = EXCLUDED.standby_count,
                run_count = EXCLUDED.run_count,
                avg_risk_score = EXCLUDED.avg_risk_score,
                updated_at = CURRENT_TIMESTAMP
        """), {
            "date": today,
            "total": int(len(df)),
            "m": int((df["decision"] == "MAINTENANCE").sum()),
            "s": int((df["decision"] == "STANDBY").sum()),
            "r": int((df["decision"] == "RUN").sum()),
            "avg": float(df["risk_score"].mean())
        })

        # -----------------------------------
        # Get plan id
        # -----------------------------------
        pid = conn.execute(text("""
            SELECT id
            FROM plans
            WHERE date = :date
        """), {
            "date": today
        }).scalar()

        # -----------------------------------
        # UPSERT details
        # -----------------------------------
        for _, row in df.iterrows():

            conn.execute(text("""
                INSERT INTO plan_details(
                    plan_id,
                    train_id,
                    decision,
                    risk_score,
                    priority_score,
                    reason,
                    created_at,
                    updated_at
                )
                VALUES(
                    :pid,:tid,:d,:r,:p,:reason,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )

                ON CONFLICT (plan_id, train_id)

                DO UPDATE SET
                    decision = EXCLUDED.decision,
                    risk_score = EXCLUDED.risk_score,
                    priority_score = EXCLUDED.priority_score,
                    reason = EXCLUDED.reason,
                    updated_at = CURRENT_TIMESTAMP
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
        df.to_dict(orient="records"),
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