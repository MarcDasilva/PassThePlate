"""
FastAPI application for food necessity prediction
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.predict import predict_need
import os
from dotenv import load_dotenv
import pandas as pd
from datetime import datetime

load_dotenv()

# No Supabase dependency - locations come from request body

app = FastAPI(
    title="Food Necessity Prediction API",
    description="ML-powered API to predict food necessity for locations",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    month: Optional[int] = Field(None, ge=1, le=12, description="Month (1-12), defaults to current month")
    food_insecurity_rate: Optional[float] = Field(None, ge=0, le=1, description="Food insecurity rate (0-1)")
    poverty_rate: Optional[float] = Field(None, ge=0, le=1, description="Poverty rate (0-1)")
    historical_donations: Optional[int] = Field(0, ge=0, description="Number of historical donations")
    historical_requests: Optional[int] = Field(0, ge=0, description="Number of historical requests")
    monetary_donations: Optional[int] = Field(0, ge=0, description="Number of monetary donations")
    population: Optional[int] = Field(1000, ge=0, description="Population estimate")

class PredictionResponse(BaseModel):
    predicted_need_score: float
    confidence: float
    month: int
    season: str
    latitude: float
    longitude: float
    model_version: str
    features_used: dict

class LocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    name: Optional[str] = None
    food_insecurity_rate: Optional[float] = Field(None, ge=0, le=1)
    poverty_rate: Optional[float] = Field(None, ge=0, le=1)
    historical_donations: Optional[int] = Field(0, ge=0)
    historical_requests: Optional[int] = Field(0, ge=0)
    population: Optional[int] = Field(1000, ge=0)

class HighestNeedResponse(BaseModel):
    predicted_need_score: float
    confidence: float
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    month: int
    season: str
    food_insecurity_rate: Optional[float] = None
    poverty_rate: Optional[float] = None
    model_version: str

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Food Necessity Prediction API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/debug")
async def debug():
    """Debug endpoint to check model configuration"""
    from pathlib import Path
    model_path = Path(__file__).parent.parent / "models" / "food_necessity_model.pkl"
    
    return {
        "model_exists": model_path.exists(),
        "model_path": str(model_path),
        "status": "ready" if model_path.exists() else "model not found - run train_model.py"
    }

    # Default locations to check (major US cities), takhighest likelyhood of food instability from datasets
DEFAULT_LOCATIONS = [
    {"latitude": 40.7128, "longitude": -74.0060, "name": "New York, NY"},
    {"latitude": 34.0522, "longitude": -118.2437, "name": "Los Angeles, CA"},
    {"latitude": 41.8781, "longitude": -87.6298, "name": "Chicago, IL"},
    {"latitude": 29.7604, "longitude": -95.3698, "name": "Houston, TX"},
    {"latitude": 33.4484, "longitude": -112.0740, "name": "Phoenix, AZ"},
    {"latitude": 39.9526, "longitude": -75.1652, "name": "Philadelphia, PA"},
    {"latitude": 32.7767, "longitude": -96.7970, "name": "Dallas, TX"},
    {"latitude": 37.7749, "longitude": -122.4194, "name": "San Francisco, CA"},
    {"latitude": 25.7617, "longitude": -80.1918, "name": "Miami, FL"},
    {"latitude": 47.6062, "longitude": -122.3321, "name": "Seattle, WA"},
    {"latitude": 38.9072, "longitude": -77.0369, "name": "Washington, DC"},
    {"latitude": 42.3601, "longitude": -71.0589, "name": "Boston, MA"},
    {"latitude": 36.1699, "longitude": -115.1398, "name": "Las Vegas, NV"},
    {"latitude": 45.5152, "longitude": -122.6784, "name": "Portland, OR"},
    {"latitude": 39.7392, "longitude": -104.9903, "name": "Denver, CO"},
]

@app.get("/highest-need", response_model=HighestNeedResponse)
async def get_highest_need_location():
    """
    Get the location with the highest food instability based on today's date
    
    No parameters required. Uses a default set of locations and returns the one
    with the highest predicted food instability score based on today's date/season.
    
    Uses only the ML model for predictions - no database required.
    
    Example:
        GET /highest-need
    """
    try:
        # Predict food instability for each default location
        results = []
        current_month = datetime.now().month
        
        for loc in DEFAULT_LOCATIONS:
            result = predict_need(
                latitude=loc['latitude'],
                longitude=loc['longitude'],
                month=current_month,
                food_insecurity_rate=None,
                poverty_rate=None,
                historical_donations=0,
                historical_requests=0,
                monetary_donations=0,
                population=1000
            )
            
            # Add location name and additional info
            result['location_name'] = loc['name']
            result['food_insecurity_rate'] = result.get('features_used', {}).get('food_insecurity_rate')
            result['poverty_rate'] = result.get('features_used', {}).get('poverty_rate')
            
            results.append(result)
        
        # Find the location with the highest need score
        highest = max(results, key=lambda x: x['predicted_need_score'])
        
        return HighestNeedResponse(**highest)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding highest need location: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict food necessity for a location
    
    Returns a prediction score (0-1) where:
    - 0.0-0.3: Low need
    - 0.3-0.6: Medium need
    - 0.6-1.0: High need
    """
    try:
        result = predict_need(
            latitude=request.latitude,
            longitude=request.longitude,
            month=request.month,
            food_insecurity_rate=request.food_insecurity_rate,
            poverty_rate=request.poverty_rate,
            historical_donations=request.historical_donations,
            historical_requests=request.historical_requests,
            monetary_donations=request.monetary_donations,
            population=request.population
        )
        
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/batch")
async def predict_batch(requests: list[PredictionRequest]):
    """
    Predict food necessity for multiple locations
    """
    try:
        results = []
        for req in requests:
            result = predict_need(
                latitude=req.latitude,
                longitude=req.longitude,
                month=req.month,
                food_insecurity_rate=req.food_insecurity_rate,
                poverty_rate=req.poverty_rate,
                historical_donations=req.historical_donations,
                historical_requests=req.historical_requests,
                monetary_donations=req.monetary_donations,
                population=req.population
            )
            results.append(result)
        
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/highest", response_model=PredictionResponse)
async def predict_highest(requests: list[PredictionRequest]):
    """
    Predict food necessity for multiple locations and return the one with highest need
    
    Takes a list of locations and returns the location with the highest predicted
    food instability score (need_score).
    """
    try:
        if not requests or len(requests) == 0:
            raise HTTPException(status_code=400, detail="At least one location is required")
        
        results = []
        for req in requests:
            result = predict_need(
                latitude=req.latitude,
                longitude=req.longitude,
                month=req.month,
                food_insecurity_rate=req.food_insecurity_rate,
                poverty_rate=req.poverty_rate,
                historical_donations=req.historical_donations,
                historical_requests=req.historical_requests,
                monetary_donations=req.monetary_donations,
                population=req.population
            )
            results.append(result)
        
        # Find the location with the highest need score
        highest = max(results, key=lambda x: x['predicted_need_score'])
        
        return PredictionResponse(**highest)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/highest/all")
async def predict_highest_all(requests: list[PredictionRequest]):
    """
    Predict food necessity for multiple locations and return all sorted by need
    
    Returns all predictions sorted by predicted need score (highest first),
    along with the highest location highlighted.
    """
    try:
        if not requests or len(requests) == 0:
            raise HTTPException(status_code=400, detail="At least one location is required")
        
        results = []
        for req in requests:
            result = predict_need(
                latitude=req.latitude,
                longitude=req.longitude,
                month=req.month,
                food_insecurity_rate=req.food_insecurity_rate,
                poverty_rate=req.poverty_rate,
                historical_donations=req.historical_donations,
                historical_requests=req.historical_requests,
                monetary_donations=req.monetary_donations,
                population=req.population
            )
            results.append(result)
        
        # Sort by predicted need score (highest first)
        sorted_results = sorted(results, key=lambda x: x['predicted_need_score'], reverse=True)
        
        return {
            "highest": sorted_results[0],
            "all_sorted": sorted_results,
            "total_locations": len(sorted_results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host=host, port=port)

