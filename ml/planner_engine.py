import pandas as pd
import joblib
from config import MODEL_PATH

# Load trained model
model = joblib.load(MODEL_PATH)


def prepare_features(df):
    df["job_severity_score"] = df["open_jobs"] * 2
    df["mileage_ratio"] = df["mileage_today"] / 300
    return df

def generate_explanation(row):

    reasons = []

    if row["open_jobs"] > 3:
        reasons.append("high maintenance workload")

    if row["mileage_today"] > 280:
        reasons.append("heavy daily mileage usage")

    if row["cleaning_required"] == 1:
        reasons.append("cleaning delay")

    if row["branding_priority"] >= 3:
        reasons.append("important branding commitment")

    if row["shunting_time"] > 8:
        reasons.append("high shunting effort required")

    if not reasons:
        return "The train is in stable condition with no immediate operational concerns."

    # 🔥 Convert to sentence
    explanation = "The train is prioritized due to " + ", ".join(reasons) + "."

    return explanation

def generate_plan():

    # 🔹 Load data
    df = pd.read_csv("generated/train_daily_profile.csv")

    # 🔹 Use latest day
    latest_date = df["date"].max()
    df = df[df["date"] == latest_date].copy()

    # 🔹 Feature engineering
    df = prepare_features(df)

    # 🔹 Model input
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

    # 🔥 Get probability instead of hard label
    df["risk_score"] = model.predict_proba(X)[:, 1]

    # 🔥 Sort by highest risk
    df = df.sort_values(by="risk_score", ascending=False).reset_index(drop=True)

    decisions = []

    TOTAL_TRAINS = len(df)
    MAINTENANCE_LIMIT = int(0.2 * TOTAL_TRAINS)   # 20%
    STANDBY_LIMIT = int(0.2 * TOTAL_TRAINS)       # 20%

    maintenance_count = 0
    standby_count = 0

    # 🔥 Decision loop
    for _, row in df.iterrows():

        if maintenance_count < MAINTENANCE_LIMIT:
            decision = "MAINTENANCE"
            maintenance_count += 1

        elif standby_count < STANDBY_LIMIT:
            decision = "STANDBY"
            standby_count += 1

        else:
            decision = "RUN"

        # 🔥 Generate explanation (GenAI-style)
        explanation = generate_explanation(row)

        decisions.append({
            "train_id": row["train_id"],
            "decision": decision,
            "risk_score": round(row["risk_score"], 2),
            "reason": explanation
        })

    result = pd.DataFrame(decisions)

    result = result.sort_values(
        by="train_id",
        key=lambda col: col.str.extract(r'(\d+)').astype(int)[0]
    )

    return result


if __name__ == "__main__":
    plan = generate_plan()

    print("\n🚆 TRAIN INDUCTION PLAN:\n")
    print(plan.to_string(index=False))