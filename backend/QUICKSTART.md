# Quick Start Guide

## Setup (5 minutes)

1. **Install dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

2. **Set up environment variables:**

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add your Supabase credentials (get these from your frontend `.env.local` file):

```env
# Get these from your frontend .env.local file
# They're named NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY there
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Optional
GEMINI_API_KEY=your_gemini_key_here
```

**To find your credentials:**

- Check `frontend/.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Or get them from your Supabase dashboard (Settings → API)

**Troubleshooting:** If you get "No locations found", run:

```bash
curl http://localhost:8000/debug
```

See `TROUBLESHOOTING.md` for more help.

3. **Collect data:**

```bash
# This will collect data from your database and create training data
python scripts/collect_data.py
```

4. **Train the model:**

```bash
# This will train the ML model and save it
python scripts/train_model.py
```

5. **Start the API:**

```bash
# Run the FastAPI server
python api/app.py
```

The API will be available at `http://localhost:8000`

## Test the API

```bash
# Health check
curl http://localhost:8000/health

# Get highest need location (no parameters needed!)
curl http://localhost:8000/highest-need

# Make a prediction (alternative)
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "month": 12
  }'
```

## Data Sources

### Option 1: Use Your Own Data (Recommended)

The script will automatically collect data from your Supabase database if you provide credentials in `.env`.

### Option 2: Use Public Data

1. Download USDA food security data:

   - Visit: https://www.ers.usda.gov/data-products/food-security-in-the-united-states/
   - Download CSV files from "Data Files" section
   - Save to `backend/data/` directory

2. Download Census poverty data:

   - Visit: https://data.census.gov
   - Search for "Poverty Statistics by County"
   - Download CSV files
   - Save to `backend/data/` directory

3. Run data collection:

```bash
python scripts/download_usda_data.py
python scripts/collect_data.py
```

### Option 3: Use Synthetic Data (For Testing)

If you don't have data yet, the script will automatically generate synthetic data for testing.

## Model Training

The training script will:

1. Load training data
2. Train multiple models (Random Forest, Gradient Boosting, XGBoost)
3. Select the best model based on R² score
4. Save the model to `models/food_necessity_model.pkl`

## API Endpoints

### Simple Endpoint (Recommended)

- `GET /highest-need` - **Get location with highest food instability (no parameters required)**

### Other Endpoints

- `GET /` - Health check
- `GET /health` - Health check
- `POST /predict` - Predict food necessity for a location
- `POST /predict/batch` - Predict for multiple locations
- `POST /predict/highest` - Find location with highest food instability
- `POST /predict/highest/all` - Get all locations sorted by need (highest first)

## Example Requests

### Single Prediction

```json
{
  "latitude": 40.7128,
  "longitude": -74.006,
  "month": 12,
  "food_insecurity_rate": 0.15,
  "historical_donations": 10,
  "historical_requests": 20,
  "population": 5000
}
```

### Find Highest Need Location

```bash
curl -X POST http://localhost:8000/predict/highest \
  -H "Content-Type: application/json" \
  -d '[
    {"latitude": 40.7128, "longitude": -74.0060, "month": 12},
    {"latitude": 34.0522, "longitude": -118.2437, "month": 12},
    {"latitude": 41.8781, "longitude": -87.6298, "month": 12}
  ]'
```

## Example Responses

### Single Prediction Response

```json
{
  "predicted_need_score": 0.75,
  "confidence": 0.9,
  "month": 12,
  "season": "winter",
  "latitude": 40.7128,
  "longitude": -74.006,
  "model_version": "1.0.0",
  "features_used": {
    "food_insecurity_rate": 0.15,
    "poverty_rate": 0.18,
    "historical_donations": 10,
    "historical_requests": 20,
    "population": 5000
  }
}
```

### Highest Need Location Response

```json
{
  "predicted_need_score": 0.85,
  "confidence": 0.9,
  "month": 12,
  "season": "winter",
  "latitude": 41.8781,
  "longitude": -87.6298,
  "model_version": "1.0.0",
  "features_used": {...}
}
```

See `API_EXAMPLES.md` for more detailed examples.

## Next Steps

1. **Integrate with Frontend:**

   - Update your frontend to call the prediction API
   - Use predictions to prioritize locations

2. **Deploy to AWS:**

   - See `config/aws_deployment.md` for deployment options
   - Choose Lambda (serverless) or EC2 (traditional)

3. **Improve Model:**
   - Add more data sources
   - Fine-tune hyperparameters
   - Retrain with new data periodically

## Troubleshooting

**Model not found error:**

- Make sure you've run `python scripts/train_model.py` first
- The model will be saved to `models/food_necessity_model.pkl`

**Supabase connection error:**

- Check your `.env` file has correct `SUPABASE_URL` and `SUPABASE_KEY`
- The script will use synthetic data if Supabase is not available

**Import errors:**

- Make sure all dependencies are installed: `pip install -r requirements.txt`
- Use a virtual environment: `python -m venv venv && source venv/bin/activate`
