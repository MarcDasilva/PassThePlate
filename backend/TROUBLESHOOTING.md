# Troubleshooting Guide

## "No locations found in database" Error

If you're getting this error, check the following:

### 1. Check Database Connection

Run the debug endpoint to see what's wrong:

```bash
curl http://localhost:8000/debug
```

This will show you:
- Whether Supabase package is installed
- Whether credentials are set
- How many locations were found
- Any errors

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add your Supabase credentials. You can find these in your frontend `.env.local` file:

```env
# Get these from your frontend .env.local file
# They should be named NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY there
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Optional
GEMINI_API_KEY=your_gemini_key_here
```

**To find your Supabase credentials:**

1. Check your frontend `.env.local` file:
   ```bash
   cat frontend/.env.local
   ```

2. Or check your Supabase dashboard:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → API
   - Copy the "Project URL" → `SUPABASE_URL`
   - Copy the "anon public" key → `SUPABASE_KEY`

### 3. Verify Database Has Data

Make sure you have requests or donations in your database with latitude/longitude:

```sql
-- Check if you have requests with locations
SELECT COUNT(*) FROM requests WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Check if you have donations with locations
SELECT COUNT(*) FROM donations WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### 4. Install Dependencies

Make sure Supabase package is installed:

```bash
cd backend
pip install -r requirements.txt
```

### 5. Check API Server Logs

When you run the API, check the console output for errors:

```bash
python api/app.py
```

Look for error messages like:
- "Supabase package not installed"
- "Supabase credentials not found"
- Database connection errors

## Common Issues

### Issue: "Supabase package not installed"
**Solution:**
```bash
pip install supabase
```

### Issue: "Supabase credentials not found"
**Solution:**
1. Create `.env` file in `backend` directory
2. Add `SUPABASE_URL` and `SUPABASE_KEY`
3. Restart the API server

### Issue: "No locations found" but database has data
**Possible causes:**
1. Requests/donations don't have latitude/longitude
2. Database connection is failing silently
3. Wrong table names

**Solution:**
1. Check debug endpoint: `curl http://localhost:8000/debug`
2. Verify table names match: `requests` and `donations`
3. Check that records have `latitude` and `longitude` fields

### Issue: Model not found
**Solution:**
```bash
cd backend
python scripts/collect_data.py
python scripts/train_model.py
```

This will create the model file at `models/food_necessity_model.pkl`

## Testing the Setup

1. **Check debug endpoint:**
   ```bash
   curl http://localhost:8000/debug
   ```

2. **Check health:**
   ```bash
   curl http://localhost:8000/health
   ```

3. **Test highest-need endpoint:**
   ```bash
   curl http://localhost:8000/highest-need
   ```

## Still Having Issues?

1. Check the API server logs for detailed error messages
2. Verify your Supabase project is active
3. Make sure your database tables have the correct schema
4. Check that RLS (Row Level Security) policies allow reading from `requests` and `donations` tables

