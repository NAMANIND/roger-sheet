# Apps Script Deployment Guide

This guide will help you deploy the Roger Sheet Queue Processing System Apps Script.

## Prerequisites

- Google Account
- Google Sheets access
- Basic understanding of Google Apps Script

## Step-by-Step Deployment

### 1. Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Roger Queue System" (or any name you prefer)

### 2. Set Up the Queue Sheet

1. In your new spreadsheet, rename the first sheet to `Queue`
2. The headers will be automatically created by the script on first run
3. Create a second sheet named `CronJobs` for scheduled jobs (optional)

#### CronJobs Sheet Structure (Optional)

If you want to use cron jobs, create a sheet named `CronJobs` with these headers:

| id | name | queue | cronExpression | payload | enabled | lastRun | nextRun |
|----|------|-------|----------------|---------|---------|---------|---------|

Example cron expressions:
- `every-5-minutes` - Run every 5 minutes
- `every-1-hours` - Run every hour
- `daily-14:30` - Run daily at 14:30 UTC

Example payload:
```json
{"url": "https://api.example.com/webhook", "method": "POST", "headers": {}, "body": {"test": true}}
```

### 3. Open Apps Script Editor

1. In your spreadsheet, click **Extensions** → **Apps Script**
2. This will open the Apps Script editor in a new tab

### 4. Add the Code

1. Delete any existing code in the `Code.gs` file
2. Copy all content from `apps-script/Code.gs`
3. Paste it into the Apps Script editor
4. Click the **Save** icon (💾) or press `Cmd+S` / `Ctrl+S`

### 5. Update the Manifest

1. In the Apps Script editor, click on `appsscript.json` in the left sidebar
   - If you don't see it, click the **Settings** (⚙️) icon, then check "Show 'appsscript.json' manifest file"
2. Replace the content with the content from `apps-script/appsscript.json`
3. Save the file

### 6. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the **gear icon** ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "Roger Queue System API" (or anything you like)
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone** (important!)
5. Click **Deploy**
6. You may need to authorize the script:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to [Your Project Name]**
   - Click **Allow**
7. Copy the **Web app URL** - you'll need this for the Next.js app

The URL will look like:
```
https://script.google.com/macros/s/AKfycbx.../exec
```

### 7. Set Up the Time-Driven Trigger

1. In the Apps Script editor, click the **Triggers** icon (⏰) on the left sidebar
2. Click **+ Add Trigger** (bottom right)
3. Configure the trigger:
   - **Choose which function to run**: `processQueue`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every minute`
4. Click **Save**
5. Authorize if prompted

### 8. Test the Deployment

#### Test the Web App API

1. Open a new browser tab
2. Paste your Web app URL
3. You should see:
```json
{
  "success": true,
  "message": "Roger Queue System API",
  "version": "1.0.0"
}
```

#### Test Job Creation

Use a tool like Postman or curl to test creating a job:

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/post",
      "method": "POST",
      "body": {"test": true}
    }
  }'
```

### 9. Configure Next.js App

1. Copy your Web app URL
2. In your Next.js project, update `.env.local`:
```
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## Monitoring and Debugging

### View Execution Logs

1. In Apps Script editor, click **Executions** on the left sidebar
2. You'll see all recent executions of your functions
3. Click on any execution to see detailed logs

### View Script Logs

1. While editing the script, click **View** → **Logs** (or press `Cmd+Enter` / `Ctrl+Enter`)
2. You'll see `Logger.log()` output from your functions

### Common Issues

#### "Authorization required" error
- Redeploy the web app
- Make sure "Who has access" is set to "Anyone"

#### Jobs not processing
- Check that the time trigger is set up correctly
- Look at the Executions log for errors
- Verify the Queue sheet exists and has the correct name

#### "Cannot find sheet" errors
- Make sure your sheets are named exactly `Queue` and `CronJobs`
- Check for extra spaces in sheet names

## Updating the Script

When you need to update the script:

1. Edit the code in Apps Script editor
2. Save the changes
3. Click **Deploy** → **Manage deployments**
4. Click the **edit icon** (✏️) next to your deployment
5. Click **Version** → **New version**
6. Add a description
7. Click **Deploy**

**Note**: The Web app URL stays the same, so you don't need to update your Next.js app.

## Security Considerations

- The Web app is set to "Anyone" access to allow your Next.js app to call it
- Consider adding API key authentication if needed
- Never commit your Web app URL to public repositories
- The script runs with your Google account permissions

## Quota Limits

Google Apps Script has execution quotas:

- **Script runtime**: 6 minutes per execution
- **Triggers total runtime**: 90 minutes/day (free), 6 hours/day (Workspace)
- **URL Fetch calls**: 20,000/day (free), 100,000/day (Workspace)

For high-volume usage, consider Google Workspace account.

## Support

If you encounter issues:

1. Check the Apps Script Executions log
2. Verify your sheet structure matches the expected format
3. Test the Web app URL directly in a browser
4. Check that triggers are enabled and running

## Architecture Notes

The Apps Script acts as:
- **API Server**: Handles HTTP requests from Next.js app
- **Worker**: Processes jobs every minute via time trigger
- **Scheduler**: Manages cron jobs and delayed jobs
- **Data Store**: Uses Google Sheets as the queue database

The system is designed for lightweight to moderate workloads (dozens to hundreds of jobs per hour). For high-volume production use, consider dedicated queue systems like Redis + BullMQ.
