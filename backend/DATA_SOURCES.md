# Data Sources for Food Necessity Prediction

## Real Data Sources You Can Use

### 1. USDA Economic Research Service - Food Security Data
**Best for: Food insecurity rates by location**

**Website**: https://www.ers.usda.gov/data-products/food-security-in-the-united-states/

**How to Download**:
1. Visit the website above
2. Click on "Data Files" tab
3. Download CSV files:
   - "Food Security Statistics by State" (annual data)
   - "Food Security Statistics by County" (if available)

**Data Fields**:
- State/County codes
- Food insecurity rate (%)
- Very low food security rate (%)
- Year

**Direct Download Links** (may change):
- State-level: https://www.ers.usda.gov/webdocs/DataFiles/52720/foodsecurity_state.csv
- County-level: Check the website for latest files

**API**: Not publicly available, but CSV files are updated annually

---

### 2. Feeding America - Map the Meal Gap
**Best for: County-level food insecurity data**

**Website**: https://www.feedingamerica.org/research/map-the-meal-gap

**How to Access**:
1. Visit the website
2. Navigate to "Research" → "Map the Meal Gap"
3. Download county-level data
4. Or use their interactive map to export data

**Data Fields**:
- County name and FIPS code
- Food insecurity rate
- Food insecurity cost
- Child food insecurity rate

**Note**: May require registration or contact for bulk data access

---

### 3. U.S. Census Bureau - Poverty Statistics
**Best for: Poverty rates by county**

**Website**: https://data.census.gov

**How to Download**:
1. Visit data.census.gov
2. Search for "Poverty Statistics by County"
3. Filter by:
   - Geography: County
   - Topic: Poverty
   - Year: Latest available
4. Download as CSV

**Data Fields**:
- County FIPS code
- Poverty rate (%)
- Number of people in poverty
- Median household income

**API**: Available through Census API
- Documentation: https://www.census.gov/data/developers/data-sets.html
- Example: https://api.census.gov/data/2021/acs/acs5/subject?get=NAME,S1701_C01_001E&for=county:*&key=YOUR_KEY

---

### 4. Your Own Database (Supabase)
**Best for: Historical donation patterns**

**How to Access**:
- Use the `collect_data.py` script with your Supabase credentials
- The script automatically extracts:
  - Donation locations and timestamps
  - Request patterns
  - Monetary donation history

**Data Fields**:
- Latitude/Longitude
- Timestamp
- Category/Type
- Value/Amount

---

### 5. Additional Public Datasets

#### World Food Programme Data
**Website**: https://www.wfp.org/publications
**Data**: Global hunger statistics (can be adapted for US)

#### Data.gov
**Website**: https://data.gov
**Search Terms**: "food security", "hunger", "food assistance"
**Multiple datasets available**

#### Kaggle Datasets
**Website**: https://www.kaggle.com/datasets
**Search**: "food insecurity", "hunger", "poverty"
**Examples**:
- Food Insecurity Dataset
- US Poverty Statistics
- County-level Economic Data

---

## Quick Data Collection Scripts

### Option 1: Use Your Database (Recommended)
```bash
# Set up .env with your Supabase credentials
python scripts/collect_data.py
```

### Option 2: Download Public Data Manually
1. Download USDA CSV files to `backend/data/`
2. Download Census CSV files to `backend/data/`
3. Run: `python scripts/collect_data.py`

### Option 3: Use Synthetic Data (For Testing)
```bash
# The script will automatically generate synthetic data if no real data is available
python scripts/collect_data.py
```

---

## Data Format Expected

The training script expects a CSV file (`data/training_data.csv`) with these columns:

- `latitude`: Float (-90 to 90)
- `longitude`: Float (-180 to 180)
- `month`: Integer (1-12)
- `season`: String (spring, summer, fall, winter)
- `food_insecurity_rate`: Float (0-1)
- `poverty_rate`: Float (0-1)
- `historical_donations`: Integer
- `historical_requests`: Integer
- `monetary_donations`: Integer
- `population`: Integer
- `need_score`: Float (0-1) - **Target variable**

---

## Tips for Better Data

1. **More Data = Better Model**: Collect at least 1000 samples
2. **Geographic Diversity**: Include data from different regions
3. **Temporal Diversity**: Include data from different months/seasons
4. **Feature Engineering**: The script automatically creates:
   - Donation ratios
   - Seasonal patterns
   - Geographic features

---

## Next Steps

1. **Start with Your Database**: Use `collect_data.py` to extract your data
2. **Add Public Data**: Download USDA and Census data
3. **Merge Data**: The script automatically merges all sources
4. **Train Model**: Run `train_model.py` to train the ML model
5. **Evaluate**: Check model metrics (R², MAE, RMSE)

---

## Questions?

- Check `QUICKSTART.md` for setup instructions
- See `scripts/data_sources.md` for more details
- Review `scripts/collect_data.py` to understand data processing

