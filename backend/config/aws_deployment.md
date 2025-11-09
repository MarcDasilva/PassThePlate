# AWS Deployment Guide

## Option 1: AWS Lambda + API Gateway (Serverless)

### Prerequisites
- AWS CLI installed and configured
- AWS account with appropriate permissions
- Docker (for building Lambda layers with ML dependencies)

### Steps

1. **Create Lambda Deployment Package**
```bash
# Install dependencies in a directory
mkdir lambda-package
pip install -r requirements.txt -t lambda-package/

# Copy your code
cp -r api/ models/ lambda-package/

# Create deployment package
cd lambda-package
zip -r ../lambda-deployment.zip .
cd ..
```

2. **Create Lambda Function**
```bash
aws lambda create-function \
  --function-name food-necessity-predictor \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler api.lambda_handler \
  --zip-file fileb://lambda-deployment.zip \
  --timeout 30 \
  --memory-size 512
```

3. **Create API Gateway**
- Go to API Gateway console
- Create new REST API
- Create resource `/predict`
- Create POST method
- Integrate with Lambda function
- Deploy to stage

## Option 2: AWS EC2 (Traditional Server)

### Steps

1. **Launch EC2 Instance**
- Choose Ubuntu 22.04 LTS
- Instance type: t3.medium or larger (for ML model)
- Security group: Allow HTTP (80) and HTTPS (443)

2. **Setup Server**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Python and dependencies
sudo apt update
sudo apt install python3-pip python3-venv -y

# Clone your repository
git clone your-repo-url
cd PassThePlate/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train model (first time)
python scripts/collect_data.py
python scripts/train_model.py
```

3. **Run API with systemd**
Create `/etc/systemd/system/food-predictor.service`:
```ini
[Unit]
Description=Food Necessity Prediction API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/PassThePlate/backend
Environment="PATH=/home/ubuntu/PassThePlate/backend/venv/bin"
ExecStart=/home/ubuntu/PassThePlate/backend/venv/bin/python api/app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable food-predictor
sudo systemctl start food-predictor
```

4. **Setup Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Option 3: AWS ECS/Fargate (Containerized)

### Steps

1. **Create Dockerfile**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "api/app.py"]
```

2. **Build and Push to ECR**
```bash
aws ecr create-repository --repository-name food-predictor
docker build -t food-predictor .
docker tag food-predictor:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/food-predictor:latest
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/food-predictor:latest
```

3. **Create ECS Task Definition and Service**
- Use ECS console or CLI
- Configure task with appropriate CPU/memory
- Set up load balancer

## Environment Variables

Set these in your deployment:
- `DATABASE_URL` or `SUPABASE_URL`/`SUPABASE_KEY`
- `GEMINI_API_KEY`
- `MODEL_VERSION`
- `API_HOST` and `API_PORT`

## Monitoring

- Use CloudWatch for logs and metrics
- Set up alarms for errors
- Monitor API latency and throughput

