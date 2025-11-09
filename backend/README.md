# Food Necessity Prediction ML Backend

This backend contains a machine learning model that predicts food necessity for specific locations based on:

- Historical donation data
- Food insecurity statistics
- Seasonal patterns
- Geographic factors

## Data Sources

### Primary Data Sources:

1. **USDA Food Security Data**

   - URL: https://www.ers.usda.gov/data-products/food-security-in-the-united-states/
   - Download: Food Security Statistics by State/County
   - Format: CSV files with food insecurity rates by location

2. **Feeding America Map the Meal Gap**

   - URL: https://www.feedingamerica.org/research/map-the-meal-gap
   - Data: County-level food insecurity rates
   - API: Available for programmatic access

3. **Census Bureau Poverty Data**

   - URL: https://www.census.gov/data/datasets.html
   - Data: Poverty rates by county
   - Format: CSV/API

4. **Your Own Data**
   - Historical donations from your database
   - Request patterns
   - User behavior data

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up environment variables:

```bash
cp .env.example .env
# Add your API keys and database credentials
```

3. Collect data:

```bash
python scripts/collect_data.py
```

4. Train model:

```bash
python scripts/train_model.py
```

5. Start API server:

```bash
python api/app.py
```

## API Endpoints

### Simple Endpoint (Recommended)

- `GET /highest-need` - **Get location with highest food instability (no parameters required)**

This endpoint automatically uses today's date and a default set of locations, predicts food instability for each using the ML model, and returns the one with the highest need score. No database or parameters required.

### Other Endpoints

- `POST /predict` - Predict food necessity for a single location
- `POST /predict/batch` - Predict for multiple locations (returns all)
- `POST /predict/highest` - Find location with highest food instability
- `POST /predict/highest/all` - Get all locations sorted by need (highest first)

See `API_SIMPLE.md` for the simple endpoint usage, or `API_EXAMPLES.md` for detailed examples.

## AWS Deployment

See `config/aws_deployment.md` for deployment instructions.
