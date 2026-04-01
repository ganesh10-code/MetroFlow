import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os
from config import MODEL_PATH

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
# Load data
data = pd.read_csv("generated/train_daily_profile.csv")

# 🔥 FEATURE ENGINEERING
data["job_severity_score"] = data["open_jobs"] * 2
data["mileage_ratio"] = data["mileage_today"] / 300


# 🔥 TARGET (NOW COMES FROM DATA)
y = data["risk_label"]

# 🔥 FEATURES (NO DIRECT LEAKAGE)
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
# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Model
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)

print("\n📊 Model Evaluation")
print("Accuracy:", model.score(X_test, y_test))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Save model
joblib.dump(model, MODEL_PATH)

print("\n✅ Model saved successfully")