# FitAdapt — Adaptive Workout Recommendation Application

FitAdapt creates personalized workout plans using the user's goal, target muscle group, fitness experience, environment, and available equipment. TOPSIS ranks eligible exercises and alternatives. During a workout, MediaPipe Pose processes camera frames locally to track the assigned exercise, repetitions, and range-of-motion metrics. Session results and difficulty feedback are used to adapt later workouts.

## Features in this prototype

- Personalized workout plan creation.
- Equipment and environment-aware exercise filtering.
- Goal and target-muscle selection.
- Camera-assisted repetition/ROM tracking for the assigned exercise (with manual entry fallback where camera tracking is unsupported or unavailable).
- TOPSIS-ranked alternative exercises.
- Rule-based workout difficulty adaptation, feedback, and session history.
- Anonymous per-browser/device identity; there is no login system.
- Optional MySQL persistence through a PHP API hosted by XAMPP. The Lovable/React app remains the front end.

## Important: MySQL and data safety

The browser cannot connect directly to MySQL. The `api/` folder is a small PHP API that connects to MySQL from XAMPP. Do not expose MySQL's port to the public internet. If the front end is hosted remotely, the PHP API must be hosted at a reachable HTTPS address and its exact front-end origin must be allowed in `api/config.php`.

**Use `database/migrate_existing.sql` for an existing database.** In phpMyAdmin, select your existing database before importing the file. The migration does not create a database or drop tables. It creates missing catalog tables and the anonymous device-state table, and inserts seed catalog rows only when their keys are not already present. Back up your database first. If your existing catalog tables use a different schema, reconcile those columns before importing.

The older file `database/fitadapt_mysql.sql` is also now a safe, non-destructive schema/seed file; it does not contain `CREATE DATABASE`, `USE`, or `DROP TABLE` statements.

## Configure the PHP API in XAMPP

1. Copy the project folder to `C:\xampp\htdocs\fitadapt` (or your chosen folder under `htdocs`).
2. Copy `api/config.example.php` to `api/config.php`.
3. Edit `api/config.php`: set `db_name` to the **existing** database name in phpMyAdmin, and enter the correct MySQL username/password. The default XAMPP `root` account often has an empty password locally; use your actual credentials.
4. In phpMyAdmin, click your existing database, choose **Import**, and import `database/migrate_existing.sql`. Do not import it into the `mysql` system database.
5. Open `http://localhost/fitadapt/api/index.php?route=health`. You should see `{"ok":true,"service":"FitAdapt MySQL API"}`. If not, check the PHP error log, credentials, and migration.
6. Add the exact front-end origin to `allowed_origins` in `api/config.php`. For Vite development, `http://localhost:5173` and `http://127.0.0.1:5173` are included as examples. For a hosted app, add its actual HTTPS origin. Do not use `*` for origins when sending custom headers.

## Configure the front end

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_FITADAPT_API_URL` to the URL of the API folder, without a trailing slash. Local example: `http://localhost/fitadapt/api`.
3. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Use `npm run build` to create a production build and `npm test` to run the automated tests.

### Hosted front end note

`http://localhost/...` only refers to the same device running the browser. A hosted Lovable page or a phone cannot reach your computer's XAMPP by using its own `localhost`. For remote access, deploy the PHP API to a reachable HTTPS server or configure a secure tunnel for testing, update `VITE_FITADAPT_API_URL`, and allow the hosted front-end origin in `api/config.php`. Do not publish database passwords in the Vite `.env` file; only the API URL belongs there.

## Anonymous device state

FitAdapt creates a random device key in the browser's local storage. The API stores that device's profile, current plan, difficulty level, exercise substitutions, and session logs in `fitadapt_device_state`. No login or personal account is required. The same browser/device can restore its state after refresh when the API is reachable. Different browsers/devices have separate keys. Clearing browser storage loses the local device key, so it will no longer identify the same server-side state.

The app continues to work with bundled exercise data and local browser storage if the API is not configured or unavailable. Check the browser console for API sync warnings. The camera feed is processed on the device and is not uploaded to the PHP API.

## Repository/version history

Use Git to preserve the source and demonstrate development history:

```bash
git init
git add .
git commit -m "Initial FitAdapt MVP"
```

Commit later changes with meaningful messages. Never commit `api/config.php` or `.env.local`.
## Mobile installation (Android and iPhone)

This project includes initial PWA metadata and app icons so the existing web app can be added to a phone home screen. It does not replace Lovable Cloud or the PHP/MySQL API, and it does not add offline caching.

1. Deploy/publish these frontend changes to the same HTTPS origin where FitAdapt is hosted. Merely editing this extracted folder does not change the live Lovable app; apply the changes through your connected repository/Lovable workflow and publish them.
2. Open the published HTTPS URL on an Android phone in Chrome (or a supported browser). Use the browser's Install app option if offered, otherwise use the browser menu to Add to Home screen.
3. On an iPhone, open the published URL in Safari, tap Share, then Add to Home Screen.
4. Open the installed icon and test navigation, profile persistence, workout generation, alternative recommendations, camera permission, pose overlay, rep tracking, and session completion. Test with a real device; camera access requires HTTPS (localhost is a special development exception).
5. Confirm the PHP API URL is a reachable HTTPS endpoint from both phones. `localhost` on a phone points to the phone itself, not the computer running XAMPP. Never expose MySQL directly to the internet or put database credentials in frontend environment variables.

### PWA limitations and safety checks

- This is an installable web app, not a native App Store / Google Play listing.
- The current package does not promise offline use; MediaPipe assets and API requests may require internet access.
- Anonymous identity is browser/device scoped. Installing in another browser or using another phone can create a different device key; clearing browser data can lose the key that links to server-side state.
- Verify camera behavior, performance, and GPU/WASM compatibility on the target Android and iPhone models before demonstrating the MVP.
- Do not import database seed/migration files until the existing database has been backed up and its tables checked.

