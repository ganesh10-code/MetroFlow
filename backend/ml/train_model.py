import pandas as pd
import joblib
import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from datetime import datetime
from sqlalchemy import create_engine, text
from ml.config import DATABASE_URL

engine = create_engine(DATABASE_URL)


def should_retrain():
    """
    Smart retraining:
    - Retrain if:
        1. No model exists
        2. Last trained > 24 hrs ago
        3. New data added
    """

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    model_path = os.path.join(BASE_DIR, "trained_models", "risk_model.pkl")

    if not os.path.exists(model_path):
        print("⚠️ No model found → training required")
        return True

    with engine.begin() as conn:
        result = conn.execute(text("SELECT * FROM model_metadata ORDER BY id DESC LIMIT 1")).fetchone()

        if not result:
            return True

        last_trained = result._mapping["last_trained_at"]
        data_points = result._mapping["data_points"]

        # Check time condition (24 hours)
        if (datetime.utcnow() - last_trained).total_seconds() > 86400:
            print("⏰ Retraining due to time threshold")
            return True

        # Check data growth
        count = conn.execute(text("SELECT COUNT(*) FROM real_daily_features")).scalar()

        if count > data_points + 100:
            print("📈 Retraining due to new data")
            return True

    print("⏭️ Skipping retraining")
    return False


def load_data():
    """
    Load REAL + SYNTHETIC data (from DB or CSV fallback)
    """

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    synthetic_path = os.path.join(BASE_DIR, "generated", "synthetic_daily_features.csv")

    # -------------------------
    # Load REAL data from DB
    # -------------------------
    try:
        real_df = pd.read_sql("SELECT * FROM real_daily_features", engine)
    except:
        real_df = pd.DataFrame()

    # -------------------------
    # Load SYNTHETIC fallback
    # -------------------------
    if os.path.exists(synthetic_path):
        synth_df = pd.read_csv(synthetic_path)
    else:
        synth_df = pd.DataFrame()

    # -------------------------
    # Selection Logic
    # -------------------------
    if len(real_df) > 500:
        print("✅ Using REAL data only")
        data = real_df

    elif len(real_df) > 0:
        print("⚠️ Hybrid training (REAL + SYNTHETIC)")
        data = pd.concat([real_df, synth_df], ignore_index=True)

    else:
        print("⚠️ Using SYNTHETIC only")
        data = synth_df

    if len(data) == 0:
        raise Exception("❌ No data available for training")

    return data


def inject_realistic_noise(data):
    """
    Add real-world uncertainty:
    - sensor noise
    - random failures
    - seasonality
    """

    # -------------------------
    # 1. Random noise (sensor error)
    # -------------------------
    noise_factor = 0.05

    data["mileage_today"] = data["mileage_today"] * (
        1 + np.random.normal(0, noise_factor, len(data))
    )

    data["open_jobs"] = data["open_jobs"] + np.random.randint(-1, 2, len(data))
    data["open_jobs"] = data["open_jobs"].clip(lower=0)

    # -------------------------
    # 2. Rare unexpected failures
    # -------------------------
    failure_indices = np.random.choice(
        data.index, size=int(0.05 * len(data)), replace=False
    )
    data.loc[failure_indices, "risk_label"] = 1

    # -------------------------
    # 3. Seasonality (day-based)
    # -------------------------
    if "date" in data.columns:
        data["day"] = pd.to_datetime(data["date"]).dt.dayofweek

        # weekends → slightly higher risk
        weekend_idx = data["day"].isin([5, 6])
        data.loc[weekend_idx, "risk_label"] = np.where(
            np.random.rand(sum(weekend_idx)) > 0.7,
            1,
            data.loc[weekend_idx, "risk_label"]
        )

    return data


def train_model():

    if not should_retrain():
        return

    print("🤖 Training ML model...")

    data = load_data()

    # -------------------------
    # Data Cleaning
    # -------------------------
    data = data.dropna()

    # -------------------------
    # 🔥 Inject Noise
    # -------------------------
    data = inject_realistic_noise(data)

    # -------------------------
    # Feature Engineering
    # -------------------------
    data["job_severity_score"] = data["open_jobs"] * 2
    data["mileage_ratio"] = data["mileage_today"] / 300

    # -------------------------
    # Features
    # -------------------------
    X = data[
        [
            "open_jobs",
            "mileage_today",
            "branding_priority",
            "shunting_time",
            "job_severity_score",
            "mileage_ratio"
        ]
    ]

    y = data["risk_label"]

    # -------------------------
    # Train/Test Split (safe)
    # -------------------------
    class_counts = y.value_counts()

    print("📊 Class Distribution:")
    print(class_counts.to_dict())

    # If any class has <2 rows, disable stratify
    if class_counts.min() < 2:
        print("⚠️ Rare class detected → using normal split")

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42
        )

    else:
        print("✅ Using stratified split")

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y
        )

    # -------------------------
    # Model (regularized)
    # -------------------------
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,              # 🔥 reduced (prevent overfit)
        min_samples_split=10,     # 🔥 regularization
        min_samples_leaf=5,       # 🔥 regularization
        random_state=42,
        class_weight="balanced"
    )

    model.fit(X_train, y_train)

    # -------------------------
    # Evaluation
    # -------------------------
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"📊 Accuracy: {acc:.4f}")

    # -------------------------
    # Save Model
    # -------------------------
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    model_path = os.path.join(BASE_DIR, "trained_models", "risk_model.pkl")

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)

    print("✅ Model saved")

    # -------------------------
    # Save Metadata
    # -------------------------
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO model_metadata (last_trained_at, data_points)
            VALUES (:time, :count)
        """), {
            "time": datetime.utcnow(),
            "count": len(data)
        })

    print("📦 Model metadata updated")