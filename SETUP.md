# HR System Sarana — Setup Guide

This project has three parts:

| Part | Tech | Port |
|------|------|------|
| **Backend** | Node.js + Express + Prisma | `8080` |
| **Frontend** | Next.js 16 | `3000` |
| **Mobile App** | React Native (Expo) | — |

---

## Option A — Docker (Recommended for first-time setup)

The fastest way to run Backend + Frontend + MySQL together.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd HR_System_Sarana

# 2. Create your environment file from the example
cp .env.example .env
```

Open `.env` and update:

```env
# If running on a physical device for the mobile app,
# change localhost to your computer's local IP (e.g. 192.168.1.10)
SERVER_BASE_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080

# Set a strong JWT secret (required)
JWT_SECRET=replace_with_a_long_random_string
```

```bash
# 3. Generate the database seed from your local MySQL
#    Ask a teammate for this file if you don't have a local DB yet.
mysqldump -u root --no-tablespaces hrms > Backend/prisma/seed.sql

# 4. Build and start all services
docker compose up --build

# Or run in the background:
docker compose up --build -d
```

**First run takes 3–5 minutes** to build images and run Prisma migrations.

When you see:
```
hrms_backend   | http://localhost:8080
hrms_frontend  | ▶ Ready on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

### Stop / restart

```bash
# Stop
docker compose down

# Stop and delete the database (full reset)
docker compose down -v
```

---

## Option B — Manual Setup (Local Development)

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v20+ | https://nodejs.org |
| Bun | latest | https://bun.sh |
| MySQL | 8.0 | https://dev.mysql.com/downloads/ |

---

### 1. Database

Create a MySQL database named `hrms`:

```sql
CREATE DATABASE hrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### 2. Backend

```bash
cd Backend

# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env   # if it doesn't exist, create it manually (see below)
```

Edit `Backend/.env`:

```env
JWT_SECRET=your_long_random_secret
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hrms
DB_PORT=3306
EXPIRED_AT=2h
DATABASE_URL="mysql://root:your_password@localhost:3306/hrms"
SERVER_BASE_URL=http://YOUR_LOCAL_IP:8080
```

> **Important:** `SERVER_BASE_URL` should be your computer's local IP (not `localhost`)
> if you want the mobile app to connect. Find it with `ipconfig` (Windows) or
> `ifconfig` (Mac/Linux).

```bash
# Push database schema (creates all tables)
bunx prisma db push

# Start the development server
bun dev
```

Backend is running at **http://localhost:8080**

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
bun install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env

# Start development server
bun dev
```

Frontend is running at **http://localhost:3000**

---

### 4. Mobile App

```bash
cd mobile-app-hr

# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env
```

Edit `mobile-app-hr/.env`:

```env
# Your computer's local Wi-Fi IP — must be reachable from the phone
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080
```

> Find your IP with `ipconfig` (Windows) → look for **IPv4 Address** under your Wi-Fi adapter.  
> The phone and computer must be on the **same Wi-Fi network**.  
> If using Docker, the backend is on the same IP — Docker exposes port 8080 on your machine.

```bash
# Start Expo (clear cache on first run)
bunx expo start --clear
```

Scan the QR code with:
- **Android**: Expo Go app
- **iOS**: Camera app or Expo Go app

---

## Default Login

When an employee is created in the system, a user account is automatically generated:

| Field | Value |
|-------|-------|
| Username | `First Last` (employee's full name) |
| Password | `Hr12345` |

Change the password after first login.

---

## Project Structure

```
HR_System_Sarana/
├── Backend/                 # Express API server
│   ├── controller/          # Route handlers
│   ├── service/             # Business logic
│   ├── middleware/          # Auth, validation
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── public/uploads/      # Uploaded files (photos, documents)
│   └── server.js            # Entry point
│
├── frontend/                # Next.js admin dashboard
│   ├── app/dashboard/       # Pages
│   ├── services/            # API calls
│   ├── components/          # UI components
│   └── lib/api.ts           # Axios instance
│
├── mobile-app-hr/           # React Native mobile app
│   ├── src/screens/         # App screens
│   ├── src/stores/          # Zustand state
│   ├── src/services/api.js  # API client
│   └── App.js               # Entry point
│
├── docker-compose.yml       # Docker orchestration
└── .env.example             # Environment variable template
```

---

## Environment Variables Reference

### Backend (`Backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma connection string | `mysql://root:@localhost:3306/hrms` |
| `JWT_SECRET` | Secret for signing tokens (min 32 chars) | random string |
| `EXPIRED_AT` | Token expiry duration | `2h` |
| `SERVER_BASE_URL` | Public URL of the backend | `http://192.168.1.10:8080` |
| `OLLAMA_HOST` | Host URL of the Ollama AI service | `http://host.docker.internal:11434` (Docker) or `http://localhost:11434` (local) |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend URL (browser-accessible) | `http://localhost:8080` |

---

## Telegram Integration (Optional)

To enable attendance notifications and approval flow:

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token
2. Add the bot to your Telegram group and get the group ID  
   (Send a message in the group, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`)
3. In the admin dashboard → **Company Settings**, enter:
   - **Telegram Bot Token**
   - **Telegram Group ID** (negative number, e.g. `-5104329689`)
4. Set the **department manager's Telegram username** on their employee profile  
   (Settings → Employee → Edit → Telegram Username field)

---

## Troubleshooting

**Backend can't connect to MySQL**
- Make sure MySQL is running: `services.msc` → MySQL80
- Check `DB_PASSWORD` in `.env` matches your MySQL root password

**Mobile app can't reach the backend**
- Verify `BASE_URL` in `src/services/api.js` matches your computer's local IP
- Both devices must be on the same Wi-Fi network
- Firewall may be blocking port 8080 — add an inbound rule for it

**Docker build fails on `canvas` module**
- This is a native module that needs system libs. The Dockerfile installs them automatically via `apk add`. If it still fails, ensure Docker has enough memory (4GB+ recommended in Docker Desktop settings).

**Prisma `P1012` schema error on startup**
- Run `bunx prisma db push --accept-data-loss` manually inside the Backend folder

**`expo-image-manipulator` not found**
- Run `bunx expo start --clear` to clear Metro bundler cache
