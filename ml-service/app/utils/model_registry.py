import os
import time
import logging
import xgboost as xgb

logger = logging.getLogger(__name__)

class ModelRegistry:
    def __init__(self):
        self.models = {}
        self.last_loaded = {}
        self.model_paths = {
            "confidence": "app/models/confidence_model.json",
            "panic": "app/models/panic_model.json",
            "priority": "app/models/priority_model.json",
            "prediction": "app/models/score_prediction_model.json"
        }

    def get_model(self, name: str):
        path = self.model_paths.get(name)
        if not path:
            logger.error(f"Model name '{name}' is not registered in registry paths.")
            return None

        # Check if model file exists
        if not os.path.exists(path):
            logger.warning(f"Model file for '{name}' not found at path: {path}")
            return None

        try:
            mtime = os.path.getmtime(path)
            # If the model is not loaded, or the file on disk is newer than our cache
            if name not in self.models or mtime > self.last_loaded.get(name, 0):
                logger.info(f"Model file '{name}' has changed or is new. Reloading...")
                
                # Instantiate correct xgboost class (all original models loaded as XGBRegressor)
                model = xgb.XGBRegressor()
                
                model.load_model(path)
                self.models[name] = model
                self.last_loaded[name] = mtime
                logger.info(f"Successfully loaded/reloaded ML model '{name}'")
        except Exception as e:
            logger.error(f"Error loading/reloading model '{name}' from disk: {e}")
            # If we already have a loaded model, keep it as fallback rather than failing
            if name not in self.models:
                self.models[name] = None
        
        return self.models.get(name)

model_registry = ModelRegistry()
