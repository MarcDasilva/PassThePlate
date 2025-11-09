"""
Collect and merge data from multiple sources for ML training
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import requests
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

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

def collect_your_database_data():
    """
    Collect data from your Supabase database
    """
    if not SUPABASE_AVAILABLE:
        print("Warning: Supabase package not installed. Skipping database collection.")
        return None
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Warning: Supabase credentials not found. Skipping database collection.")
        return None
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get donations data
        donations_response = supabase.table('donations').select('*').execute()
        donations_df = pd.DataFrame(donations_response.data)
        
        # Get requests data
        requests_response = supabase.table('requests').select('*').execute()
        requests_df = pd.DataFrame(requests_response.data)
        
        # Get monetary donations
        monetary_response = supabase.table('monetary_donations').select('*').execute()
        monetary_df = pd.DataFrame(monetary_response.data)
        
        print(f"Collected {len(donations_df)} donations")
        print(f"Collected {len(requests_df)} requests")
        print(f"Collected {len(monetary_df)} monetary donations")
        
        return {
            'donations': donations_df,
            'requests': requests_df,
            'monetary_donations': monetary_df
        }
    except Exception as e:
        print(f"Error collecting database data: {e}")
        return None

def process_location_data(df: pd.DataFrame, lat_col: str, lng_col: str, date_col: str):
    """
    Process location-based data to extract features
    """
    if df.empty:
        return pd.DataFrame()
    
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df['month'] = df[date_col].dt.month
    df['season'] = df['month'].apply(get_season)
    df['year'] = df[date_col].dt.year
    
    # Round coordinates to ~1km precision (0.01 degrees ≈ 1km)
    df['lat_rounded'] = df[lat_col].round(2)
    df['lng_rounded'] = df[lng_col].round(2)
    
    return df

def aggregate_by_location(df: pd.DataFrame, lat_col: str, lng_col: str, date_col: str):
    """
    Aggregate data by location and time period
    """
    df = process_location_data(df, lat_col, lng_col, date_col)
    
    if df.empty:
        return pd.DataFrame()
    
    # Group by location and month
    grouped = df.groupby(['lat_rounded', 'lng_rounded', 'month', 'season', 'year']).agg({
        lat_col: 'first',
        lng_col: 'first',
    }).reset_index()
    
    grouped['count'] = df.groupby(['lat_rounded', 'lng_rounded', 'month', 'season', 'year']).size().values
    
    return grouped

def estimate_food_insecurity_rate(lat: float, lng: float) -> float:
    """
    Estimate food insecurity rate for a location
    Uses Gemini API or defaults to estimated rate
    """
    api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        # Default estimation based on location
        # Urban areas typically have higher rates
        # This is a placeholder - replace with actual data
        return 0.12  # 12% default
    
    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
            json={
                "contents": [{
                    "parts": [{
                        "text": f"Based on coordinates ({lat}, {lng}), estimate the food insecurity rate (0-1 scale). Consider geographic location, urban/rural status, and regional patterns. Return ONLY a number between 0 and 1."
                    }]
                }]
            },
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '0.12')
            rate = float(text.strip().replace('%', ''))
            if rate > 1:
                rate = rate / 100
            return max(0, min(1, rate))
    except Exception as e:
        print(f"Error estimating food insecurity: {e}")
    
    return 0.12  # Default

def create_training_dataset():
    """
    Create training dataset from all sources
    """
    print("Creating training dataset...")
    
    # Collect your database data
    db_data = collect_your_database_data()
    
    if not db_data:
        print("No database data available. Using synthetic data generation.")
        return create_synthetic_dataset()
    
    # Process donations
    donations_agg = aggregate_by_location(
        db_data['donations'],
        'latitude',
        'longitude',
        'created_at'
    )
    
    # Process requests
    requests_agg = aggregate_by_location(
        db_data['requests'],
        'latitude',
        'longitude',
        'created_at'
    )
    
    # Process monetary donations
    monetary_agg = aggregate_by_location(
        db_data['monetary_donations'],
        'to_latitude',
        'to_longitude',
        'created_at'
    )
    
    # Merge data
    training_data = []
    
    # Get unique locations
    all_locations = set()
    for df in [donations_agg, requests_agg, monetary_agg]:
        if not df.empty:
            for _, row in df.iterrows():
                loc_key = (row['lat_rounded'], row['lng_rounded'])
                all_locations.add(loc_key)
    
    print(f"Processing {len(all_locations)} unique locations...")
    
    for lat, lng in list(all_locations)[:100]:  # Limit for now
        for month in range(1, 13):
            season = get_season(month)
            
            # Get counts for this location/month
            donations_count = len(donations_agg[
                (donations_agg['lat_rounded'] == lat) &
                (donations_agg['lng_rounded'] == lng) &
                (donations_agg['month'] == month)
            ]) if not donations_agg.empty else 0
            
            requests_count = len(requests_agg[
                (requests_agg['lat_rounded'] == lat) &
                (requests_agg['lng_rounded'] == lng) &
                (requests_agg['month'] == month)
            ]) if not requests_agg.empty else 0
            
            monetary_count = len(monetary_agg[
                (monetary_agg['lat_rounded'] == lat) &
                (monetary_agg['lng_rounded'] == lng) &
                (monetary_agg['month'] == month)
            ]) if not monetary_agg.empty else 0
            
            # Estimate food insecurity rate
            food_insecurity_rate = estimate_food_insecurity_rate(lat, lng)
            
            # Calculate target variable (need score)
            # Higher need = more requests, less donations, higher food insecurity
            need_score = min(1.0, max(0.0,
                (requests_count * 0.3 + 
                 (1 - min(1, donations_count / 10)) * 0.3 +
                 food_insecurity_rate * 0.4)
            ))
            
            training_data.append({
                'latitude': lat,
                'longitude': lng,
                'month': month,
                'season': season,
                'food_insecurity_rate': food_insecurity_rate,
                'poverty_rate': food_insecurity_rate * 1.2,  # Estimate
                'historical_donations': donations_count,
                'historical_requests': requests_count,
                'monetary_donations': monetary_count,
                'population': 1000,  # Placeholder - can be enhanced
                'need_score': need_score,  # Target variable
            })
    
    df = pd.DataFrame(training_data)
    
    # Save to CSV
    output_path = DATA_DIR / "training_data.csv"
    df.to_csv(output_path, index=False)
    print(f"\nTraining dataset saved to: {output_path}")
    print(f"Total samples: {len(df)}")
    print(f"\nFeature statistics:")
    print(df.describe())
    
    return df

def create_synthetic_dataset():
    """
    Create synthetic training data if no real data available
    """
    print("Creating synthetic training dataset...")
    
    np.random.seed(42)
    n_samples = 1000
    
    data = []
    for _ in range(n_samples):
        lat = np.random.uniform(25, 50)  # US latitude range
        lng = np.random.uniform(-125, -65)  # US longitude range
        month = np.random.randint(1, 13)
        season = get_season(month)
        
        # Synthetic features
        food_insecurity_rate = np.random.uniform(0.05, 0.25)
        poverty_rate = food_insecurity_rate * np.random.uniform(1.1, 1.5)
        historical_donations = np.random.poisson(5)
        historical_requests = np.random.poisson(8)
        population = np.random.randint(500, 50000)
        
        # Calculate need score (target)
        seasonal_multiplier = {'winter': 1.3, 'fall': 1.2, 'spring': 1.0, 'summer': 0.9}[season]
        donation_factor = max(0.1, 1 - (historical_donations / 20))
        
        need_score = min(1.0, (
            food_insecurity_rate * 0.4 +
            poverty_rate * 0.3 +
            donation_factor * 0.2 +
            min(1, population / 10000) * 0.1
        ) * seasonal_multiplier)
        
        data.append({
            'latitude': lat,
            'longitude': lng,
            'month': month,
            'season': season,
            'food_insecurity_rate': food_insecurity_rate,
            'poverty_rate': poverty_rate,
            'historical_donations': historical_donations,
            'historical_requests': historical_requests,
            'monetary_donations': np.random.poisson(3),
            'population': population,
            'need_score': need_score,
        })
    
    df = pd.DataFrame(data)
    output_path = DATA_DIR / "training_data.csv"
    df.to_csv(output_path, index=False)
    print(f"Synthetic dataset saved to: {output_path}")
    return df

if __name__ == "__main__":
    print("Data Collection Script")
    print("=" * 50)
    df = create_training_dataset()
    print("\nData collection complete!")

