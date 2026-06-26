# Deploy flashpack to Render

## 1. Create a Render account
Go to https://render.com and sign up/login with GitHub.

## 2. Push this repo to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/flashpack.git
git push -u origin main
```

## 3. Deploy on Render

### Option A — "Blueprints" (recommended)
1. In Render dashboard go to **Blueprints** → **New Blueprint Instance**.
2. Connect the GitHub repo.
3. Select the `render.yaml` file.
4. Render creates:
   - `flashpack-server` Web Service
   - `flashpack-db` PostgreSQL database
   - Auto-wires `DATABASE_URL`

### Option B — Manual
1. Create a new **PostgreSQL** database on Render. Copy its **External Database URL**.
2. Create a new **Web Service**.
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Add environment variable:
   - `DATABASE_URL` = the database URL from step 1
4. Set health check path to `/health`.

## 4. Point the app to the server

### For production builds (EAS / standalone APK / App Store)
Create a `.env` file in the project root:
```
EXPO_PUBLIC_API_URL=https://flashpack-server.onrender.com
```
Replace the URL with your actual Render service URL.

Then build:
```bash
npx eas build --platform android   # or ios
```

### For development (Expo Go)
Dev mode still auto-detects your laptop IP, so no changes are needed.

## 5. Verify
Open `https://flashpack-server.onrender.com/health` in a browser. You should see:
```json
{ "ok": true, "time": "..." }
```

The app is now live and shared users can connect to it.
