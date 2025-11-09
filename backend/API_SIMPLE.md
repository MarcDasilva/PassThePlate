# Simple API Endpoint

## GET `/highest-need`

Returns the location with the highest food instability based on today's date.

**No parameters required** - automatically uses today's date and a default set of locations.

**No database required** - uses only the ML model for predictions.

### Usage

```bash
curl http://localhost:8000/highest-need
```

That's it! Just fetch the endpoint and it returns the location with highest need.

### How It Works

1. **Uses today's date** - Automatically uses the current month/season for predictions
2. **Checks default locations** - Predicts for a set of major US cities
3. **Predicts food instability** - Uses ML model to predict need score for each location
4. **Returns highest** - Returns the location with the highest predicted need score

### Response

```json
{
  "predicted_need_score": 0.85,
  "confidence": 0.9,
  "latitude": 40.7128,
  "longitude": -74.006,
  "location_name": "Food assistance needed in downtown area...",
  "request_count": 15,
  "donation_count": 3,
  "month": 12,
  "season": "winter",
  "food_insecurity_rate": 0.15,
  "poverty_rate": 0.18,
  "model_version": "1.0.0"
}
```

### Response Fields

- `predicted_need_score` (float): Food instability score from 0-1 (higher = more need)
- `confidence` (float): Model confidence in the prediction (0-1)
- `latitude` (float): Latitude coordinate of the location
- `longitude` (float): Longitude coordinate of the location
- `location_name` (string, optional): Description or name of the location
- `request_count` (int): Number of requests at this location
- `donation_count` (int): Number of donations at this location
- `month` (int): Current month (1-12)
- `season` (string): Current season (spring, summer, fall, winter)
- `food_insecurity_rate` (float, optional): Estimated food insecurity rate (0-1)
- `poverty_rate` (float, optional): Estimated poverty rate (0-1)
- `model_version` (string): Version of the ML model used

### Default Locations

The endpoint checks these major US cities:

- New York, NY
- Los Angeles, CA
- Chicago, IL
- Houston, TX
- Phoenix, AZ
- Philadelphia, PA
- Dallas, TX
- San Francisco, CA
- Miami, FL
- Seattle, WA
- Washington, DC
- Boston, MA
- Las Vegas, NV
- Portland, OR
- Denver, CO

### Current Date

- Automatically uses today's date for predictions
- Uses the current month/season (e.g., December = winter)
- Seasonal patterns are automatically factored into predictions
- Results change based on the current date

### Error Responses

**500 - Server error (model not found):**

```json
{
  "detail": "Model not found. Please train the model first."
}
```

**500 - Server error:**

```json
{
  "detail": "Error finding highest need location: <error message>"
}
```

### Example: JavaScript/TypeScript

```typescript
async function getHighestNeedLocation() {
  const response = await fetch("http://localhost:8000/highest-need");
  const data = await response.json();

  console.log(
    `Highest need location: ${
      data.location_name || `(${data.latitude}, ${data.longitude})`
    }`
  );
  console.log(`Need score: ${data.predicted_need_score}`);
  console.log(`Season: ${data.season}, Month: ${data.month}`);

  return data;
}
```

### Example: Python

```python
import requests

response = requests.get('http://localhost:8000/highest-need')
data = response.json()

print(f"Highest need location: {data['location_name']}")
print(f"Need score: {data['predicted_need_score']:.2f}")
print(f"Season: {data['season']}, Month: {data['month']}")
```

### Requirements

- The ML model must be trained (run `python scripts/train_model.py`)
- No database connection needed - all predictions use the ML model only
