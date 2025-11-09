#!/bin/bash
# EC2 User Data Script for Amazon Linux - Run automatically on instance launch
# This script sets up the environment automatically

set -e

echo "Starting EC2 setup for Amazon Linux..."

# Update system
yum update -y

# Install Python and dependencies (Amazon Linux 2023)
yum install -y python3.11 python3.11-pip git unzip
yum groupinstall -y "Development Tools"
yum install -y python3.11-devel

# For Amazon Linux 2, use:
# amazon-linux-extras install python3.11 -y
# yum install -y python3-pip git unzip
# yum groupinstall -y "Development Tools"
# yum install -y python3-devel

# Create app directory
mkdir -p /home/ec2-user/PassThePlate/backend
cd /home/ec2-user/PassThePlate/backend

# Note: You'll need to upload your code manually or clone from git
# This script just sets up the environment

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies (if requirements.txt is present)
if [ -f requirements.txt ]; then
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# Set up systemd service
cat > /etc/systemd/system/food-api.service <<EOF
[Unit]
Description=Food Necessity Prediction API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/PassThePlate/backend
Environment="PATH=/home/ec2-user/PassThePlate/backend/venv/bin"
ExecStart=/home/ec2-user/PassThePlate/backend/venv/bin/python api/app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable service (but don't start yet - wait for code to be uploaded)
systemctl daemon-reload
systemctl enable food-api

echo "EC2 setup complete!"
echo "Next steps:"
echo "1. Upload your code to /home/ec2-user/PassThePlate/backend"
echo "2. Train your model: python scripts/train_model.py"
echo "3. Start the service: sudo systemctl start food-api"

