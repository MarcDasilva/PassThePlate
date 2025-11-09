# AWS EC2 Setup Checklist

Quick checklist for setting up your EC2 instance.

## Pre-Launch

- [ ] AWS account created and logged in
- [ ] Decided on instance type (t3.medium minimum for ML)
- [ ] Have SSH key pair ready (or create new one)

## Launch Instance

- [ ] Go to EC2 Console → Launch Instance
- [ ] Name: `food-necessity-api` or `passtheplate-backend`
- [ ] OS: Ubuntu 22.04 LTS
- [ ] Instance Type: t3.medium (or larger)
- [ ] Key Pair: Create new or use existing
- [ ] **IMPORTANT:** Download and save .pem file securely
- [ ] Security Group: Allow SSH (port 22), HTTP (80), HTTPS (443), Custom TCP (8000)
- [ ] Storage: 20-30 GB minimum
- [ ] Launch instance
- [ ] Wait for "Running" status
- [ ] Note Public IPv4 address

## Connect to Instance

- [ ] Set permissions: `chmod 400 ~/path/to/key.pem`
- [ ] SSH: `ssh -i ~/path/to/key.pem ec2-user@YOUR_IP` (Amazon Linux uses `ec2-user`)
- [ ] Successfully connected

## Environment Setup

- [ ] Update system: `sudo yum update -y`
- [ ] Install Python 3.11: `sudo yum install python3.11 python3.11-pip -y` (Amazon Linux 2023)
  - OR for Amazon Linux 2: `sudo amazon-linux-extras install python3.11 -y`
- [ ] Install build tools: `sudo yum groupinstall "Development Tools" -y && sudo yum install python3.11-devel -y`
- [ ] Clone/upload your code to `/home/ec2-user/PassThePlate/backend`
- [ ] Create venv: `python3.11 -m venv venv`
- [ ] Activate venv: `source venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements.txt`

## ML Model Setup

- [ ] Upload trained model files OR train on instance:
  - [ ] `python scripts/collect_data.py`
  - [ ] `python scripts/train_model.py`
- [ ] Verify model exists: `ls -la models/food_necessity_model.pkl`

## API Service Setup

- [ ] Create systemd service file: `/etc/systemd/system/food-api.service` (use `ec2-user` instead of `ubuntu`)
- [ ] Enable service: `sudo systemctl enable food-api`
- [ ] Start service: `sudo systemctl start food-api`
- [ ] Check status: `sudo systemctl status food-api`
- [ ] View logs: `sudo journalctl -u food-api -f`

## Testing

- [ ] Test locally on EC2: `curl http://localhost:8000/health`
- [ ] Test from local machine: `curl http://YOUR_IP:8000/health`
- [ ] Test highest-need endpoint: `curl http://YOUR_IP:8000/highest-need`
- [ ] API returns expected response

## Optional: Nginx Setup

- [ ] Install Nginx: `sudo yum install nginx -y`
- [ ] Create config: `/etc/nginx/sites-available/food-api`
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/food-api /etc/nginx/sites-enabled/`
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Test: `curl http://YOUR_IP` (port 80)

## Optional: SSL Setup

- [ ] Install Certbot: `sudo yum install certbot python3-certbot-nginx -y`
- [ ] Get certificate: `sudo certbot --nginx -d your-domain.com`
- [ ] Test HTTPS: `curl https://your-domain.com/health`

## Security

- [ ] Security group only allows necessary ports
- [ ] SSH key is secured (chmod 400)
- [ ] Consider restricting SSH to your IP only
- [ ] Set up CloudWatch monitoring
- [ ] Configure backups if needed

## Monitoring

- [ ] Set up CloudWatch alarms
- [ ] Monitor instance metrics (CPU, memory, network)
- [ ] Set up log aggregation
- [ ] Configure billing alerts

## Done!

- [ ] API is accessible from internet
- [ ] Service auto-starts on reboot
- [ ] Logs are accessible
- [ ] Monitoring is set up

## Quick Commands Reference

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

# Stop instance (to save costs)
# EC2 Console → Instances → Select → Instance State → Stop
```
