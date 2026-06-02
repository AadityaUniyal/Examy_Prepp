import os
import pandas as pd
import numpy as np
import xgboost as xgb
import logging
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retrain_models():
    csv_path = "data/training_data.csv"
    if not os.path.exists(csv_path):
        logger.error(f"Training data not found at {csv_path}")
        return
        
    df = pd.read_csv(csv_path)
    logger.info(f"Loaded training dataset of size {df.shape}")
    
    if len(df) < 5:
        logger.warning("Dataset is too small to retrain model. Creating synthetic records from baseline rules to expand.")
        synthetic_records = []
        for i in range(100):
            self_conf = np.random.uniform(1.0, 10.0)
            quiz_score = np.random.uniform(30.0, 100.0)
            time_spent = np.random.uniform(10.0, 300.0)
            complexity = np.random.uniform(0.1, 0.9)
            num_revs = np.random.randint(0, 8)
            calibrated_target = (self_conf / 10.0) * 0.4 + (quiz_score / 100.0) * 0.4 + (1.0 - complexity) * 0.2
            exam_target = (calibrated_target * 0.6 + (time_spent / 300.0) * 0.2 + np.random.uniform(0, 0.2)) * 100
            
            synthetic_records.append({
                "confidenceBefore": self_conf,
                "confidenceAfter": self_conf + np.random.uniform(-1, 1),
                "sessionCompleted": True,
                "timeSpentMins": time_spent,
                "scheduledMins": time_spent * 1.2,
                "energyRating": np.random.randint(1, 5),
                "examScore": exam_target
            })
        df = pd.concat([df, pd.DataFrame(synthetic_records)], ignore_index=True)
        logger.info(f"Expanded dataset with synthetic baseline. Total records: {len(df)}")

    try:
        X = np.column_stack([
            df["confidenceAfter"].fillna(5.0),
            df["examScore"].fillna(70.0),
            df["timeSpentMins"].fillna(120.0),
            np.ones(len(df)) * 2,
            df["energyRating"].fillna(4.0),
            np.ones(len(df)) * 0.5,
            df["timeSpentMins"].fillna(120.0) / 2,
            np.ones(len(df)) * 5,
            np.ones(len(df)) * 2,
            np.zeros(len(df))
        ])
        y = df["examScore"].fillna(70.0).values / 100.0
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        old_model_path = "app/models/confidence_model.json"
        old_mse = float("inf")
        if os.path.exists(old_model_path):
            try:
                old_model = xgb.XGBRegressor()
                old_model.load_model(old_model_path)
                old_preds = old_model.predict(X_test)
                old_mse = mean_squared_error(y_test, old_preds)
                logger.info(f"Existing model test MSE: {old_mse:.5f}")
            except Exception as e:
                logger.warning(f"Could not load existing model for evaluation: {e}")
        
        logger.info("Training new confidence XGBoost model...")
        new_model = xgb.XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42)
        new_model.fit(X_train, y_train)
        
        new_preds = new_model.predict(X_test)
        new_mse = mean_squared_error(y_test, new_preds)
        logger.info(f"New model test MSE: {new_mse:.5f}")
        
        if new_mse < old_mse or old_mse == float("inf"):
            os.makedirs("app/models", exist_ok=True)
            new_model.save_model(old_model_path)
            logger.info(f"VALIDATION PASSED: Saved new confidence model to {old_model_path}")
        else:
            logger.info("VALIDATION FAILED: New model did not outperform old model. Deployment skipped.")
            
    except Exception as e:
        logger.error(f"Error during retraining: {e}")
        raise

if __name__ == "__main__":
    retrain_models()
