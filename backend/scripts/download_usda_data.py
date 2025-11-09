"""
Download USDA Food Security Data
This script downloads food security statistics from USDA ERS website
"""

import requests
import pandas as pd
import os
from pathlib import Path
from bs4 import BeautifulSoup
import time

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

def download_usda_food_security_data():
    """
    Download USDA food security data
    Note: This is a template - you'll need to manually download the CSV files
    from https://www.ers.usda.gov/data-products/food-security-in-the-united-states/
    """
    print("USDA Food Security Data Download")
    print("=" * 50)
    print("\nManual Download Required:")
    print("1. Visit: https://www.ers.usda.gov/data-products/food-security-in-the-united-states/")
    print("2. Navigate to 'Data Files' section")
    print("3. Download CSV files for food security statistics")
    print("4. Save files to:", DATA_DIR)
    print("\nAlternatively, you can use the USDA API if available.")
    
    # Example: If you have direct CSV URLs, you can download them:
    # urls = [
    #     "https://www.ers.usda.gov/webdocs/DataFiles/.../foodsecurity_state.csv",
    # ]
    # 
    # for url in urls:
    #     response = requests.get(url)
    #     filename = url.split("/")[-1]
    #     filepath = DATA_DIR / filename
    #     with open(filepath, 'wb') as f:
    #         f.write(response.content)
    #     print(f"Downloaded: {filename}")

def process_usda_data(filepath):
    """
    Process downloaded USDA CSV file
    """
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return None
    
    try:
        df = pd.read_csv(filepath)
        print(f"Loaded {len(df)} rows from {filepath}")
        
        # Standardize column names (adjust based on actual CSV structure)
        # Typical columns: State, County, Food_Insecurity_Rate, Year, etc.
        
        return df
    except Exception as e:
        print(f"Error processing file: {e}")
        return None

if __name__ == "__main__":
    download_usda_food_security_data()
    
    # Process any existing files
    csv_files = list(DATA_DIR.glob("*.csv"))
    for csv_file in csv_files:
        if "food" in csv_file.name.lower() or "security" in csv_file.name.lower():
            print(f"\nProcessing: {csv_file.name}")
            df = process_usda_data(csv_file)
            if df is not None:
                print(f"Columns: {df.columns.tolist()}")
                print(f"Shape: {df.shape}")

