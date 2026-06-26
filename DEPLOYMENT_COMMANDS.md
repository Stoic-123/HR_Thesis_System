# Production Deployment Guide

This document lists the exact commands to run on your VPS terminal when you push new changes to GitHub and want to update them on the production server.

---

## 🚀 Quick Update Checklist

Run these commands in order on your VPS terminal:

```bash
# 1. Navigate to the project folder
cd ~/HR_Thesis_System

# 2. Pull the latest code changes from GitHub
git pull origin main

# 3. Build and restart the containers with the new changes
sudo docker compose -f docker-compose.prod.yml up -d --build

# 4. (Optional but Recommended) Clean up old build layers to save disk space
sudo docker system prune -f
```

---

## 🔍 Monitoring & Troubleshooting Commands

Here are additional commands to inspect the status of your production deployment:

### 1. View running containers
Check if all 4 services are healthy/running:
```bash
sudo docker compose -f docker-compose.prod.yml ps
```

### 2. Monitor logs in real-time
If you need to watch logs for a specific service:

*   **Backend API Logs**:
    ```bash
    sudo docker logs -f hrms_backend_prod
    ```
*   **Frontend Dashboard Logs**:
    ```bash
    sudo docker logs -f hrms_frontend_prod
    ```
*   **Caddy (SSL/Routing) Logs**:
    ```bash
    sudo docker logs -f hrms_caddy_prod
    ```
*   **MariaDB Database Logs**:
    ```bash
    sudo docker logs -f hrms_db_prod
    ```

### 3. Access DB console directly
If you need to inspect the production MariaDB database command line:
```bash
sudo docker exec -it hrms_db_prod mysql -u root -p hrms
```
*(It will prompt you to enter the `MARIADB_ROOT_PASSWORD` defined in your VPS `.env` file.)*
