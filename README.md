# Wealth Plus — Client Billing & Bookkeeping

A beautiful, light-themed, responsive web application for managing business clients, income receipts (cash/bank), bookkeeping ledgers (Cash Book & Bank Book), expenses, and exporting structured multi-sheet Excel reports.

Designed for the **Indian Financial Year (April 1st to March 31st)**. Runs locally in the browser with `localStorage` data persistence and zero external server dependencies, or syncs across devices in real-time using Firebase.

---

## Folder Contents

- `index.html` — The main structure of the application.
- `style.css` — Modern styling, variables, transitions, and mobile responsiveness.
- `app.js` — Core application logic, bookkeeping formulas, and excel export.
- `server.py` — Development server to test locally and on mobile.

---

## 1. Running Locally (Verification)

To run the application locally on your computer or test on your mobile device:

1. Open your terminal or Command Prompt (CMD).
2. Go to the project directory:
   ```cmd
   cd C:\expenses-tracker
   ```
3. Run the server:
   ```cmd
   python server.py
   ```
4. Open the link displayed:
   - On PC: `http://localhost:8000`
   - On Mobile (same Wi-Fi): `http://<your-ip-address>:8000`

---

## 2. Deploying Live via GitHub Pages (Free Hosting)

GitHub Pages allows you to host static HTML/CSS/JS files completely free.

### Step 1: Create a GitHub Repository
1. Go to [github.com](https://github.com/) and log in (or create a free account).
2. Click **New Repository**.
3. Name it `wealth-plus`. Set it to **Public**.
4. Leave other options unchecked and click **Create repository**.

### Step 2: Initialize Git and Push Code
Open Command Prompt in `C:\expenses-tracker` and run:
```cmd
# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit of Wealth Plus"

# Rename branch to main
git branch -M main

# Link to your GitHub (Replace with YOUR actual repository link)
git remote add origin https://github.com/YOUR_USERNAME/wealth-plus.git

# Push the code to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. On your GitHub repository page, go to the **Settings** tab.
2. Under the left menu, click **Pages** (in the Code and automation section).
3. In the **Build and deployment** section:
   - Under **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)` folder.
   - Click **Save**.
4. Wait 1-2 minutes. Refresh the page, and GitHub will give you a live link:
   `https://YOUR_USERNAME.github.io/wealth-plus/`

---

## 3. Deploying Live via Firebase Hosting (Google Cloud)

Firebase Hosting provides fast, Google-backed secure hosting with custom domains.

### Step 1: Install Firebase CLI
Install Node.js if you don't have it, then run in Command Prompt:
```cmd
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```cmd
firebase login
```
*This will open your browser to log in with your Google Account.*

### Step 3: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and create a project named `my-wealth-plus`.

### Step 4: Initialize Firebase in Folder
Run this command in `C:\expenses-tracker`:
```cmd
firebase init hosting
```
During the prompt:
1. Select **Use an existing project** and choose the project you created.
2. What do you want to use as your public directory? Enter **`.`** (dot, meaning the current folder).
3. Configure as a single-page app? Enter **`N`** (No).
4. Set up automatic builds and deploys with GitHub? Enter **`N`** (No).
5. Overwrite `index.html`? Enter **`N`** (No) *(Crucial: do not overwrite!)*.

### Step 5: Deploy Live
Run the deploy command:
```cmd
firebase deploy
```
Firebase will instantly upload the files and output your live URL:
`https://your-project-name.web.app`

---

## 4. Real-time Cloud Synchronization (Firebase setup)

To sync your data between your PC and Mobile devices in real-time:

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it (e.g. `wealth-plus`).
3. (Optional) Disable Google Analytics and click **Create Project**.

### Step 2: Create a Cloud Firestore Database
1. In the Firebase left menu, click **Firestore Database**.
2. Click **Create Database**.
3. Choose your location and click **Next**.
4. Start in **Test Mode** (which sets rules to `allow read, write: if true;` for testing).
   *Note: For database sync, ensure your rules are configured to allow reading and writing:*
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true; // Allows sync across all devices
       }
     }
   }
   ```
5. Click **Create**.

### Step 3: Register Web App & Get Credentials
1. Go to your Firebase Project settings (gear icon in the top left ➔ Project Settings).
2. Under **Your apps** section, click the **Web icon `</>`**.
3. Name your app `Wealth Plus` and click **Register app**.
4. Firebase will show a configuration code block containing `const firebaseConfig = { ... }`.
5. Copy these six credentials:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### Step 4: Configure Cloud Sync in App
1. Open Wealth Plus in your browser (e.g., `http://localhost:8000`).
2. Log in as **Admin** (Mobile: `9999999999`, PIN: `1234`).
3. Navigate to **Master Settings** ➔ **Cloud Sync (Firebase)**.
4. Enter the copied Firebase credentials in the form.
5. Click **Enable & Sync Cloud**.
6. When prompted, click **Yes** to upload your existing local storage bookkeeping records to the Cloud database.
7. Open the same link on your Mobile browser (use python server IP or deploy to Firebase Hosting/GitHub Pages) and see all data syncing in real-time!

---

## 5. Mobile Installation & Home Screen Setup (PWA App)

To run **Wealth Plus** as a standalone mobile application (without browser address bars, in full-screen mode) on your smartphone:

### On iOS (iPhone / iPad) using Safari
1. Open the **Safari** browser.
2. Enter your live website URL (e.g. `https://your-project-name.web.app`) or local development IP (e.g. `http://192.168.1.15:8000`).
3. Tap the **Share** button (the square icon with an upward arrow at the bottom of the screen).
4. Scroll down the sharing menu and tap **Add to Home Screen**.
5. Change the name to **Wealth Plus** and tap **Add** in the top right corner.
6. The app icon will now appear on your home screen. Tap it to launch **Wealth Plus** in full-screen standalone mode.

### On Android using Google Chrome
1. Open the **Chrome** browser.
2. Enter your live website URL (e.g. `https://your-project-name.web.app`) or local development IP (e.g. `http://192.168.1.15:8000`).
3. Tap the **Three Dots Menu** icon in the top-right corner.
4. Tap **Add to Home screen** (or **Install App**).
5. Confirm by tapping **Add** (or **Install**).
6. The app will be added to your home screen or app drawer. Tap it to open **Wealth Plus** in standalone app mode.
