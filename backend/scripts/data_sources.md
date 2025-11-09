# Data Sources for Food Necessity Prediction

## 1. USDA Economic Research Service - Food Security Data
**URL**: https://www.ers.usda.gov/data-products/food-security-in-the-united-states/
**Download**: 
- Go to "Data Files" section
- Download "Food Security Statistics by State" CSV
- Download "Food Security Statistics by County" CSV (if available)

**Data Fields**:
- Food insecurity rate (%)
- Very low food security rate (%)
- State/County codes
- Year

**How to Access**:
1. Visit the USDA ERS website
2. Navigate to "Food Security in the United States"
3. Download CSV files from "Data Files" section
4. Files are typically named like: `foodsecurity_state_YYYY.csv`

## 2. Feeding America - Map the Meal Gap
**URL**: https://www.feedingamerica.org/research/map-the-meal-gap
**API**: Available through their research portal
**Data**: County-level food insecurity rates

**How to Access**:
1. Visit Feeding America website
2. Navigate to "Map the Meal Gap" research
3. Download county-level data
4. Or use their API if available

## 3. U.S. Census Bureau - Poverty Statistics
**URL**: https://www.census.gov/data/datasets.html
**Search**: "Poverty Statistics by County"
**Data**: Poverty rates by county

**How to Access**:
1. Visit data.census.gov
2. Search for "Poverty Statistics"
3. Filter by county level
4. Download CSV or use API

## 4. Your Own Database
**Source**: Your Supabase database
**Tables**:
- `donations` - Historical donation data
- `requests` - Request patterns
- `monetary_donations` - Monetary donation history

**Fields to Extract**:
- Location (latitude, longitude)
- Timestamp (for seasonal patterns)
- Category/type
- Value/amount

## 5. Additional Public Datasets

### World Food Programme Data
**URL**: https://www.wfp.org/publications
**Data**: Global hunger statistics (can be adapted for US)

### Data.gov
**URL**: https://data.gov
**Search**: "food security", "hunger", "food assistance"
**Multiple datasets available**

## Data Collection Scripts

Use the scripts in this directory to automatically download and process data:
- `download_usda_data.py` - Downloads USDA food security data
- `download_census_data.py` - Downloads Census poverty data
- `process_your_data.py` - Processes your own database data
- `merge_datasets.py` - Combines all data sources

