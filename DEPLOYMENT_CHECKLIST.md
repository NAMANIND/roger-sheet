# Deployment Checklist

Use this checklist to ensure proper deployment of Roger Sheet.

## 📋 Pre-Deployment

- [ ] Google account ready
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Project dependencies installed (`npm install`)
- [ ] Build successful (`npm run build`)

## 🔧 Apps Script Deployment

### Create Google Sheet
- [ ] Created new Google Sheet
- [ ] Sheet renamed to "Roger Queue" (or your preferred name)
- [ ] First tab renamed to `Queue`
- [ ] (Optional) Second tab created named `CronJobs`

### Deploy Script
- [ ] Opened Extensions → Apps Script
- [ ] Deleted default code
- [ ] Copied and pasted `apps-script/Code.gs`
- [ ] Clicked Save (💾)

### Configure Manifest
- [ ] Enabled "Show appsscript.json" in Settings
- [ ] Opened `appsscript.json` file
- [ ] Replaced content with `apps-script/appsscript.json`
- [ ] Saved the file

### Deploy Web App
- [ ] Clicked Deploy → New deployment
- [ ] Selected "Web app" type
- [ ] Set "Execute as" to "Me"
- [ ] Set "Who has access" to "Anyone"
- [ ] Clicked Deploy
- [ ] Authorized access (if prompted)
- [ ] **Copied Web App URL** (saved somewhere safe)

### Set Up Trigger
- [ ] Clicked Triggers icon (⏰)
- [ ] Clicked + Add Trigger
- [ ] Set function to `processQueue`
- [ ] Set event source to "Time-driven"
- [ ] Set type to "Minutes timer"
- [ ] Set interval to "Every minute"
- [ ] Clicked Save
- [ ] Authorized if prompted

### Verify Apps Script
- [ ] Tested Web App URL in browser
- [ ] Saw JSON response with success: true
- [ ] Checked Executions log - no errors
- [ ] Trigger shows in Triggers list as enabled

## 🌐 Next.js Deployment

### Configure Environment
- [ ] Copied `.env.example` to `.env.local`
- [ ] Pasted Apps Script Web App URL into `.env.local`
- [ ] Saved `.env.local`

### Local Testing
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:3000
- [ ] Saw dashboard load without errors
- [ ] Created test job via UI
- [ ] Waited 1 minute
- [ ] Verified job processed successfully

### Production Build
- [ ] Ran `npm run build`
- [ ] Build completed without errors
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Deploy to Hosting (Choose One)

#### Option A: Vercel
- [ ] Connected GitHub repository
- [ ] Configured project settings
- [ ] Added `APPS_SCRIPT_WEB_APP_URL` environment variable
- [ ] Deployed
- [ ] Verified deployment URL works

#### Option B: Netlify
- [ ] Connected GitHub repository
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `.next`
- [ ] Added `APPS_SCRIPT_WEB_APP_URL` environment variable
- [ ] Deployed
- [ ] Verified deployment URL works

#### Option C: Self-Hosted
- [ ] Built project (`npm run build`)
- [ ] Configured environment variables on server
- [ ] Started with `npm start`
- [ ] Configured reverse proxy (nginx/Apache)
- [ ] Verified public URL works

## ✅ Post-Deployment Verification

### Basic Functionality
- [ ] Dashboard loads
- [ ] Can navigate to all pages
- [ ] Queue statistics show (or 0 if empty)
- [ ] Create Job page loads

### Job Creation
- [ ] Created immediate job via UI
- [ ] Job appears in Jobs list
- [ ] Job status is "pending"
- [ ] Job appears in Google Sheet

### Job Processing
- [ ] Waited 1 minute
- [ ] Refreshed Jobs page
- [ ] Job status changed to "completed"
- [ ] Job has completion timestamp
- [ ] No errors in Apps Script logs

### Error Handling
- [ ] Created job with invalid URL (e.g., httpbin.org/status/500)
- [ ] Job failed as expected
- [ ] Error message stored in job
- [ ] Job retried automatically
- [ ] After max retries, moved to dead status

### Queue Management
- [ ] Queues page shows active queues
- [ ] Can pause a queue
- [ ] Paused queue stops processing
- [ ] Can resume a queue
- [ ] Resumed queue starts processing

### Delayed Jobs (Optional)
- [ ] Created delayed job (5 minutes)
- [ ] Job shows in list with future runAt time
- [ ] Job doesn't process immediately
- [ ] After delay, job processes successfully

### Cron Jobs (Optional)
- [ ] Added cron job to CronJobs sheet
- [ ] Set enabled to TRUE
- [ ] Waited for next trigger
- [ ] New job created from cron
- [ ] Cron job's lastRun updated
- [ ] Cron job's nextRun calculated

## 🔐 Security Checklist

- [ ] Apps Script Web App URL not committed to public repo
- [ ] `.env.local` in `.gitignore`
- [ ] Consider adding API key authentication (if needed)
- [ ] Apps Script set to execute as deploying user
- [ ] Understand that "Anyone" access means public API

## 📊 Monitoring Setup

### Apps Script
- [ ] Bookmarked Apps Script Executions page
- [ ] Reviewed execution logs
- [ ] Set up email notifications for failures (optional)

### Google Sheet
- [ ] Bookmarked Queue sheet
- [ ] Can view jobs in real-time
- [ ] Verified column structure matches expected

### Next.js App
- [ ] Can access dashboard
- [ ] Statistics updating correctly
- [ ] Job list filtering works
- [ ] Can retry failed jobs

## 📚 Documentation

- [ ] Read README.md
- [ ] Read apps-script/README.md
- [ ] Read QUICKSTART.md
- [ ] Bookmarked TEST_EXAMPLES.md
- [ ] Know where to find logs

## 🎯 Testing Complete

- [ ] Created 10 test jobs
- [ ] All processed successfully
- [ ] Tested manual retry
- [ ] Tested bulk retry
- [ ] Tested clear completed
- [ ] Tested queue pause/resume
- [ ] Verified priority ordering
- [ ] Tested all HTTP methods (GET/POST/PUT/DELETE)

## 🚨 Troubleshooting Verified

- [ ] Know how to view Apps Script logs
- [ ] Know how to check trigger status
- [ ] Know how to redeploy if needed
- [ ] Know where to find error messages
- [ ] Understand quota limits

## 📈 Next Steps

- [ ] Set up regular job cleanup (manual or automated)
- [ ] Monitor quota usage
- [ ] Consider Google Workspace if hitting limits
- [ ] Plan for scaling if needed
- [ ] Document custom use cases

## ✨ Optional Enhancements

- [ ] Add more cron jobs
- [ ] Create multiple queues for different purposes
- [ ] Set up alerting for failed jobs
- [ ] Create scripts for common operations
- [ ] Customize UI theme/branding

---

## 🎉 Deployment Complete!

Once all items are checked, your Roger Sheet system is fully deployed and operational.

### Quick Links
- **Dashboard**: `http://localhost:3000` (or your production URL)
- **Apps Script**: [script.google.com](https://script.google.com)
- **Google Sheet**: Your Queue sheet URL
- **Documentation**: [README.md](README.md)

### Support
If you encounter issues:
1. Check Apps Script Executions log
2. Review [TEST_EXAMPLES.md](TEST_EXAMPLES.md)
3. Consult [apps-script/README.md](apps-script/README.md)
4. Verify environment variables
5. Check Google Sheet structure

**Everything working?** Great! You're ready to schedule real jobs! 🚀
