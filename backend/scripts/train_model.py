"""
Train ML model to predict food necessity
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import os
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

def load_training_data():
    """Load training data"""
    data_path = DATA_DIR / "training_data.csv"
    
    if not data_path.exists():
        raise FileNotFoundError(f"Training data not found: {data_path}")
    
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} training samples")
    return df

def prepare_features(df: pd.DataFrame):
    """Prepare features for training"""
    df = df.copy()
    
    # Encode season
    le_season = LabelEncoder()
    df['season_encoded'] = le_season.fit_transform(df['season'])
    
    # Feature engineering
    df['donation_ratio'] = df['historical_donations'] / (df['historical_requests'] + 1)
    df['donation_deficit'] = df['historical_requests'] - df['historical_donations']
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # Select features
    feature_columns = [
        'latitude',
        'longitude',
        'month',
        'season_encoded',
        'food_insecurity_rate',
        'poverty_rate',
        'historical_donations',
        'historical_requests',
        'monetary_donations',
        'population',
        'donation_ratio',
        'donation_deficit',
        'month_sin',
        'month_cos',
    ]
    
    X = df[feature_columns]
    y = df['need_score']
    
    return X, y, le_season, feature_columns

def train_models(X, y):
    """Train multiple models and select best"""
    print("\nTraining models...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    models = {
        'random_forest': RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        ),
        'gradient_boosting': GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            random_state=42
        ),
        'xgboost': xgb.XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        
        # Train
        model.fit(X_train, y_train)
        
        # Predict
        y_pred = model.predict(X_test)
        
        # Evaluate
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')
        
        results[name] = {
            'model': model,
            'mae': mae,
            'mse': mse,
            'rmse': rmse,
            'r2': r2,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
        }
        
        print(f"  MAE: {mae:.4f}")
        print(f"  RMSE: {rmse:.4f}")
        print(f"  R²: {r2:.4f}")
        print(f"  CV R²: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Select best model (highest R²)
    best_model_name = max(results.keys(), key=lambda k: results[k]['r2'])
    best_model = results[best_model_name]['model']
    
    print(f"\n{'='*50}")
    print(f"Best model: {best_model_name}")
    print(f"R² Score: {results[best_model_name]['r2']:.4f}")
    print(f"{'='*50}")
    
    return best_model, results[best_model_name], X.columns.tolist()

def save_model(model, feature_columns, le_season, metrics):
    """Save trained model"""
    model_path = MODELS_DIR / "food_necessity_model.pkl"
    metadata_path = MODELS_DIR / "model_metadata.pkl"
    
    # Save model
    joblib.dump(model, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save metadata
    metadata = {
        'feature_columns': feature_columns,
        'label_encoder_season': le_season,
        'metrics': metrics,
        'model_version': os.getenv('MODEL_VERSION', '1.0.0'),
        'trained_at': pd.Timestamp.now().isoformat(),
    }
    
    joblib.dump(metadata, metadata_path)
    print(f"Metadata saved to: {metadata_path}")
    
    return model_path, metadata_path

def main():
    """Main training pipeline"""
    print("Food Necessity Prediction Model Training")
    print("=" * 50)
    
    # Load data
    df = load_training_data()
    
    # Prepare features
    X, y, le_season, feature_columns = prepare_features(df)
    
    print(f"\nFeatures: {len(feature_columns)}")
    print(f"Target: need_score (range: {y.min():.3f} - {y.max():.3f})")
    
    # Train models
    best_model, metrics, feature_cols = train_models(X, y)
    
    # Save model
    model_path, metadata_path = save_model(best_model, feature_cols, le_season, metrics)
    
    print("\nTraining complete!")
    print(f"\nTo use the model:")
    print(f"  from models.predict import predict_need")
    print(f"  score = predict_need(latitude, longitude, month)")

if __name__ == "__main__":
    main()

