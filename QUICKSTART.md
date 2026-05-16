# Quick Start Guide

Get Roger Sheet up and running in 10 minutes.

## Step 1: Deploy Apps Script (5 minutes)

### Create Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create new spreadsheet named "Roger Queue"
3. Rename first sheet to `Queue`

### Deploy Script
1. Click **Extensions** → **Apps Script**
2. Delete existing code
3. Copy everything from `apps-script/Code.gs` → Paste into editor
4. Click **Project Settings** → Check "Show appsscript.json"
5. Click `appsscript.json` → Replace with content from `apps-script/appsscript.json`
6. Save (💾)

### Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click gear icon ⚙️ → Select **Web app**
3. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Click **Authorize access** → Allow permissions
6. **Copy the Web App URL** (save this!)

### Add Trigger
1. Click **Triggers** icon (⏰) on left
2. Click **+ Add Trigger**
3. Set:
   - Function: `processQueue`
   - Event source: **Time-driven**
   - Type: **Minutes timer**
   - Interval: **Every minute**
4. Save → Authorize if needed

## Step 2: Run Next.js App (2 minutes)

```bash
# In your project directory
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local and paste your Web App URL
nano .env.local
# or
code .env.local
```

Add your URL:
```
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ID_HERE/exec
```

```bash
# Start the app
npm run dev
```

## Step 3: Create Your First Job (2 minutes)

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Create Job**
3. Fill in:
   - Queue: `default`
   - Type: `Immediate`
   - URL: `https://httpbin.org/post`
   - Method: `POST`
   - Body:
   ```json
   {
     "test": true,
     "message": "Hello from Roger Sheet!"
   }
   ```
4. Click **Create Job**

## Step 4: Watch It Work (1 minute)

1. Go to **Jobs** page
2. You should see your job
3. Wait up to 1 minute for it to process
4. Refresh the page
5. Status should change to **Completed**
6. Click **View** to see details

## What Just Happened?

1. You created a job via the Next.js UI
2. It was saved to your Google Sheet
3. The Apps Script trigger fired (every minute)
4. The worker fetched the job
5. It executed the HTTP request to httpbin.org
6. The status was updated to completed

## Next Steps

### Try Delayed Jobs
- Set type to "Delayed"
- Set delay to 5 minutes
- Watch it execute later

### Try Cron Jobs
1. In Google Sheet, create sheet named `CronJobs`
2. Add headers: `id | name | queue | cronExpression | payload | enabled | lastRun | nextRun`
3. Add row:
   - id: Generate UUID at [uuidgenerator.net](https://www.uuidgenerator.net/)
   - name: `Test Cron`
   - queue: `default`
   - cronExpression: `every-5-minutes`
   - payload: `{"url":"https://httpbin.org/post","method":"POST","body":{"cron":true}}`
   - enabled: `TRUE`

### Explore the Dashboard
- View queue statistics
- Filter jobs by status
- Retry failed jobs
- Pause/resume queues

## Troubleshooting

**Jobs not processing?**
- Check Apps Script → Executions for errors
- Verify trigger is enabled
- Check sheet is named exactly `Queue`

**Can't connect to Apps Script?**
- Test URL in browser directly
- Check "Who has access" is set to "Anyone"
- Verify URL in .env.local is correct

**Need help?**
- Read full [README.md](README.md)
- Check [apps-script/README.md](apps-script/README.md)

---

**You're all set!** 🎉 Roger Sheet is now processing your jobs.
