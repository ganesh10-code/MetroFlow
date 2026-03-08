import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib
from config import MODEL_PATH

data = pd.read_csv("generated/train_daily_profile.csv")

X = data[
    [
        "open_jobs",
        "mileage_today",
        "cleaning_required",
        "branding_priority",
        "shunting_time"
    ]
]

y = data["fitness_valid"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10
)

model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)

print("Model Accuracy:", accuracy)

joblib.dump(model, MODEL_PATH)

print("Model saved")