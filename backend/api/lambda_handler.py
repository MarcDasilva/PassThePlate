"""
AWS Lambda handler for food necessity prediction
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.predict import predict_need

def lambda_handler(event, context):
    """
    AWS Lambda handler function
    Supports single prediction, batch prediction, and finding highest need location
    """
    try:
        # Parse request
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        # Check if this is a batch request (list of locations)
        locations = body.get('locations', [])
        endpoint = body.get('endpoint', 'predict')  # 'predict', 'batch', 'highest'
        
        # Single location prediction
        if not locations:
            latitude = body.get('latitude')
            longitude = body.get('longitude')
            month = body.get('month')
            food_insecurity_rate = body.get('food_insecurity_rate')
            poverty_rate = body.get('poverty_rate')
            historical_donations = body.get('historical_donations', 0)
            historical_requests = body.get('historical_requests', 0)
            monetary_donations = body.get('monetary_donations', 0)
            population = body.get('population', 1000)
            
            if latitude is None or longitude is None:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'latitude and longitude are required'
                    })
                }
            
            # Make prediction
            result = predict_need(
                latitude=latitude,
                longitude=longitude,
                month=month,
                food_insecurity_rate=food_insecurity_rate,
                poverty_rate=poverty_rate,
                historical_donations=historical_donations,
                historical_requests=historical_requests,
                monetary_donations=monetary_donations,
                population=population
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result)
            }
        
        # Batch prediction
        results = []
        for loc in locations:
            result = predict_need(
                latitude=loc.get('latitude'),
                longitude=loc.get('longitude'),
                month=loc.get('month'),
                food_insecurity_rate=loc.get('food_insecurity_rate'),
                poverty_rate=loc.get('poverty_rate'),
                historical_donations=loc.get('historical_donations', 0),
                historical_requests=loc.get('historical_requests', 0),
                monetary_donations=loc.get('monetary_donations', 0),
                population=loc.get('population', 1000)
            )
            results.append(result)
        
        # Return highest if requested
        if endpoint == 'highest':
            highest = max(results, key=lambda x: x['predicted_need_score'])
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(highest)
            }
        
        # Return all results sorted by need (highest first)
        if endpoint == 'highest/all':
            sorted_results = sorted(results, key=lambda x: x['predicted_need_score'], reverse=True)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'highest': sorted_results[0],
                    'all_sorted': sorted_results,
                    'total_locations': len(sorted_results)
                })
            }
        
        # Return all results
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'predictions': results
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }

