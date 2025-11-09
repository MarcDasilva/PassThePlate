"""
Prediction functions for food necessity model
"""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

MODELS_DIR = Path(__file__).parent
MODEL_PATH = MODELS_DIR / "food_necessity_model.pkl"
METADATA_PATH = MODELS_DIR / "model_metadata.pkl"

def get_season(month: int) -> str:
    """Get season from month"""
    if month >= 3 and month <= 5:
        return 'spring'
    elif month >= 6 and month <= 8:
        return 'summer'
    elif month >= 9 and month <= 11:
        return 'fall'
    else:
        return 'winter'

def load_model():
    """Load trained model and metadata"""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}. Please train the model first.")
    
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Metadata not found: {METADATA_PATH}")
    
    model = joblib.load(MODEL_PATH)
    metadata = joblib.load(METADATA_PATH)
    
    return model, metadata

def predict_need(
    latitude: float,
    longitude: float,
    month: int = None,
    food_insecurity_rate: float = None,
    poverty_rate: float = None,
    historical_donations: int = 0,
    historical_requests: int = 0,
    monetary_donations: int = 0,
    population: int = 1000
) -> dict:
    """
    Predict food necessity score for a location
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        month: Month (1-12), defaults to current month
        food_insecurity_rate: Food insecurity rate (0-1), estimated if not provided
        poverty_rate: Poverty rate (0-1), estimated if not provided
        historical_donations: Number of historical donations
        historical_requests: Number of historical requests
        monetary_donations: Number of monetary donations
        population: Population estimate
    
    Returns:
        dict with prediction and metadata
    """
    try:
        model, metadata = load_model()
    except FileNotFoundError as e:
        # Fallback to simple prediction if model not trained
        return predict_need_simple(
            latitude, longitude, month,
            food_insecurity_rate, poverty_rate,
            historical_donations, historical_requests,
            monetary_donations, population
        )
    
    # Use current month if not provided
    if month is None:
        month = pd.Timestamp.now().month
    
    season = get_season(month)
    le_season = metadata['label_encoder_season']
    season_encoded = le_season.transform([season])[0]
    
    # Estimate rates if not provided
    if food_insecurity_rate is None:
        food_insecurity_rate = 0.12  # Default estimate
    if poverty_rate is None:
        poverty_rate = food_insecurity_rate * 1.2
    
    # Feature engineering
    donation_ratio = historical_donations / (historical_requests + 1)
    donation_deficit = historical_requests - historical_donations
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)
    
    # Create feature vector
    features = pd.DataFrame([{
        'latitude': latitude,
        'longitude': longitude,
        'month': month,
        'season_encoded': season_encoded,
        'food_insecurity_rate': food_insecurity_rate,
        'poverty_rate': poverty_rate,
        'historical_donations': historical_donations,
        'historical_requests': historical_requests,
        'monetary_donations': monetary_donations,
        'population': population,
        'donation_ratio': donation_ratio,
        'donation_deficit': donation_deficit,
        'month_sin': month_sin,
        'month_cos': month_cos,
    }])
    
    # Ensure feature order matches training
    feature_columns = metadata['feature_columns']
    features = features[feature_columns]
    
    # Predict
    need_score = model.predict(features)[0]
    need_score = max(0, min(1, need_score))  # Clamp to [0, 1]
    
    # Calculate confidence (based on data availability)
    confidence = 0.9 if food_insecurity_rate else 0.7
    
    return {
        'predicted_need_score': float(need_score),
        'confidence': confidence,
        'month': month,
        'season': season,
        'latitude': latitude,
        'longitude': longitude,
        'model_version': metadata.get('model_version', '1.0.0'),
        'features_used': {
            'food_insecurity_rate': food_insecurity_rate,
            'poverty_rate': poverty_rate,
            'historical_donations': historical_donations,
            'historical_requests': historical_requests,
            'population': population,
        }
    }

def predict_need_simple(
    latitude: float,
    longitude: float,
    month: int = None,
    food_insecurity_rate: float = None,
    poverty_rate: float = None,
    historical_donations: int = 0,
    historical_requests: int = 0,
    monetary_donations: int = 0,
    population: int = 1000
) -> dict:
    """
    Simple prediction fallback (weighted factors)
    Used when ML model is not available
    """
    if month is None:
        month = pd.Timestamp.now().month
    
    season = get_season(month)
    seasonal_multiplier = {
        'winter': 1.3,
        'fall': 1.2,
        'spring': 1.0,
        'summer': 0.9
    }[season]
    
    if food_insecurity_rate is None:
        food_insecurity_rate = 0.12
    if poverty_rate is None:
        poverty_rate = food_insecurity_rate * 1.2
    
    donation_factor = max(0.1, 1 - (historical_donations / 20))
    population_factor = min(1, population / 10000)
    
need_score = ( food_insecurity_rate * 0.38 + poverty_rate * 0.33 + donation_factor * 0.21 + population_factor * 0.08 ) * seasonal_multiplier
    
    need_score = max(0, min(1, need_score))
    
    return {
        'predicted_need_score': float(need_score),
        'confidence': 0.6,
        'month': month,
        'season': season,
        'latitude': latitude,
        'longitude': longitude,
        'model_version': 'simple',
        'features_used': {
            'food_insecurity_rate': food_insecurity_rate,
            'poverty_rate': poverty_rate,
            'historical_donations': historical_donations,
            'historical_requests': historical_requests,
            'population': population,
        }
    }

