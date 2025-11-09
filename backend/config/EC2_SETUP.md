# AWS EC2 Setup Guide

Step-by-step guide to deploy your ML backend API on AWS EC2.

## Prerequisites

- AWS Account
- AWS CLI installed (optional, but helpful)
- SSH key pair (we'll create one)

## Step 1: Launch EC2 Instance

### 1.1 Go to EC2 Console

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Search for "EC2" in the services search bar
3. Click on "EC2" to open the EC2 Dashboard

### 1.2 Launch Instance

1. Click the **"Launch Instance"** button (orange button in the top right)
2. Fill in the instance details:

   **Name:**

   - Enter a name: `food-necessity-api` or `passtheplate-backend`

   **Application and OS Images:**

   - Choose: **Amazon Linux** (Amazon Linux 2023 or Amazon Linux 2)
   - Architecture: x86_64
   - Note: Amazon Linux uses `yum` package manager instead of `apt`

   **Instance Type:**

   - For ML model: **t3.medium** (2 vCPU, 4 GB RAM) - minimum
   - For better performance: **t3.large** (2 vCPU, 8 GB RAM)
   - For production: **t3.xlarge** (4 vCPU, 16 GB RAM)
   - Note: Free tier eligible is t2.micro, but may be too small for ML

   **Key Pair:**

   - Click "Create new key pair"
   - Name: `passtheplate-keypair`
   - Key pair type: **RSA**
   - Private key file format: **.pem**
   - Click "Create key pair"
   - **IMPORTANT:** Download the .pem file and save it securely!

   **Network Settings:**

   - Click "Edit"
   - **Security group name:** `food-api-sg`
   - **Description:** Security group for food necessity API
   - **Allow SSH traffic from:**
     - My IP (recommended for security)
     - Or "Anywhere-IPv4" (0.0.0.0/0) for testing (less secure)
   - **Allow HTTPS traffic from:** Anywhere-IPv4 (0.0.0.0/0)
   - **Allow HTTP traffic from:** Anywhere-IPv4 (0.0.0.0/0)
   - Click "Add security group rule" if needed:
     - Type: Custom TCP
     - Port: 8000 (for your API)
     - Source: Anywhere-IPv4 (0.0.0.0/0)

   **Configure Storage:**

   - Size: 20 GB (minimum)
   - Volume type: gp3 (General Purpose SSD)
   - For ML models, 30-50 GB is better

   **Advanced Details (Optional):**

   - You can add user data script here (see below)

3. Click **"Launch Instance"**

### 1.3 Wait for Instance to Start

1. Click "View all instances" at the bottom
2. Wait for "Instance State" to show "Running" (green checkmark)
3. Note the **Public IPv4 address** (e.g., 54.123.45.67)

## Step 2: Connect to Your Instance

### 2.1 Set Permissions for Key Pair

On your local machine (Mac/Linux):

```bash
chmod 400 ~/Downloads/passtheplate-keypair.pem
```

Or wherever you saved the .pem file.

### 2.2 SSH into Instance

```bash
ssh -i ~/Downloads/passtheplate-keypair.pem ec2-user@YOUR_PUBLIC_IP
```

Replace:

- `YOUR_PUBLIC_IP` with your instance's public IP from Step 1.3
- Path to your .pem file if different
- **Note:** Amazon Linux uses `ec2-user` as the default user (not `ubuntu`)

You should see: `Welcome to Amazon Linux...`

## Step 3: Set Up the Environment

### 3.1 Update System

```bash
sudo yum update -y
```

### 3.2 Install Python and Dependencies

**For Amazon Linux 2023:**

```bash
# Install Python 3.11 and pip
sudo yum install python3.11 python3.11-pip -y

# Install build dependencies (needed for some Python packages)
sudo yum groupinstall "Development Tools" -y
sudo yum install python3.11-devel -y

# Install git
sudo yum install git -y
```

**For Amazon Linux 2:**

```bash
# Install Python 3.11 (may need to use Amazon Linux Extras)
sudo amazon-linux-extras install python3.11 -y

# Install pip
sudo yum install python3-pip -y

# Install build dependencies
sudo yum groupinstall "Development Tools" -y
sudo yum install python3-devel -y

# Install git
sudo yum install git -y
```

### 3.3 Clone Your Repository

**Option A: If your code is on GitHub/GitLab:**

```bash
cd ~
git clone YOUR_REPO_URL
cd PassThePlate/backend
```

**Option B: If you need to upload files manually:**

On your local machine, create a zip file:

```bash
cd /Users/marc/PassThePlate
zip -r backend.zip backend/ -x "*.pkl" "*.csv" "data/*" "models/*.pkl"
```

Then on EC2:

```bash
# Install unzip
sudo yum install unzip -y

# Use scp from your local machine to upload
# (Run this from your local machine, not on EC2)
```

From your local machine:

```bash
scp -i ~/Downloads/passtheplate-keypair.pem backend.zip ec2-user@YOUR_PUBLIC_IP:~/
```

Then on EC2:

```bash
cd ~
unzip backend.zip
cd PassThePlate/backend
```

### 3.4 Create Virtual Environment

```bash
cd ~/PassThePlate/backend

# For Amazon Linux 2023
python3.11 -m venv venv

# For Amazon Linux 2 (if python3.11 not available, use python3)
python3 -m venv venv

source venv/bin/activate
```

### 3.5 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This may take a few minutes, especially for ML packages.

### 3.6 Train or Upload Your ML Model

**If you haven't trained the model yet:**

```bash
# Generate synthetic data and train
python scripts/collect_data.py
python scripts/train_model.py
```

**If you already have a trained model:**

Upload it from your local machine:

```bash
# From your local machine
scp -i ~/Downloads/passtheplate-keypair.pem \
  backend/models/food_necessity_model.pkl \
  ec2-user@18.209.63.122:~/PassThePlate/backend/models/

scp -i ~/Downloads/passtheplate-keypair.pem \
  backend/models/model_metadata.pkl \
  ec2-user@18.209.63.122:~/PassThePlate/backend/models/
```

## Step 4: Set Up the API Service

### 4.1 Create Systemd Service

```bash
sudo nano /etc/systemd/system/food-api.service
```

Add this content (note: user is `ec2-user` for Amazon Linux):

```ini
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
```

**Note:** Replace `/home/ec2-user` with your actual home directory path if different.

Save and exit (Ctrl+X, then Y, then Enter)

### 4.2 Enable and Start Service

```bash
    sudo systemctl daemon-reload
    sudo systemctl enable food-api
    sudo systemctl start food-api
```

### 4.3 Check Service Status

```bash
sudo systemctl status food-api
```

You should see "active (running)" in green.

### 4.4 View Logs

```bash
# View logs
sudo journalctl -u food-api -f

# View last 50 lines
sudo journalctl -u food-api -n 50
```

## Step 5: Test Your API

### 5.1 Test Locally on EC2

```bash
curl http://localhost:8000/health
curl http://localhost:8000/highest-need
```

### 5.2 Test from Your Local Machine

```bash
curl http://YOUR_PUBLIC_IP:8000/health
curl http://172.31.18.214:8000/highest-need
```

Replace `YOUR_PUBLIC_IP` with your EC2 instance's public IP.

## Step 6: Set Up Nginx (Optional but Recommended)

For production, use Nginx as a reverse proxy:

### 6.1 Install Nginx

```bash
sudo yum install nginx -y
```

### 6.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/food-api
```

Add this content:

```nginx
server {
    listen 80;
    server_name YOUR_PUBLIC_IP;  # Or your domain name

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit.

### 6.3 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/food-api /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

Now you can access your API at `http://YOUR_PUBLIC_IP` (port 80) instead of port 8000.

## Step 7: Set Up SSL with Let's Encrypt (Optional)

For HTTPS:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### API Not Accessible

1. **Check Security Group:**

   - Go to EC2 Console → Security Groups
   - Make sure port 8000 (or 80) is open to 0.0.0.0/0

2. **Check Service Status:**

   ```bash
   sudo systemctl status food-api
   ```

3. **Check Logs:**

   ```bash
   sudo journalctl -u food-api -n 100
   ```

4. **Check if Port is Listening:**
   ```bash
   sudo netstat -tlnp | grep 8000
   ```

### Model Not Found

```bash
# Check if model exists
ls -la ~/PassThePlate/backend/models/

# If missing, train it
cd ~/PassThePlate/backend
source venv/bin/activate
python scripts/train_model.py
```

### Permission Errors

```bash
# Fix ownership
sudo chown -R ec2-user:ec2-user ~/PassThePlate
```

## Cost Optimization

- **Stop instance when not in use:** EC2 → Instances → Select → Instance State → Stop
- **Use Spot Instances** for development (cheaper but can be terminated)
- **Resize instance** if you need more/less resources
- **Set up CloudWatch alarms** to monitor costs

## Next Steps

1. Set up a domain name (Route 53)
2. Configure CloudWatch for monitoring
3. Set up automated backups
4. Configure auto-scaling if needed
5. Set up CI/CD pipeline

## Quick Reference

```bash
# SSH into instance (Amazon Linux uses ec2-user)
ssh -i ~/path/to/key.pem ec2-user@YOUR_IP

# Check service status
sudo systemctl status food-api

# Restart service
sudo systemctl restart food-api

# View logs
sudo journalctl -u food-api -f

# Test API
curl http://localhost:8000/highest-need
```
