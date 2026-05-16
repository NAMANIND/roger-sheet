# Roger Sheet - Queue Processing System

A BullMQ-inspired job queue system using Google Sheets as persistent storage and Google Apps Script as the worker runtime, with a Next.js management interface.

## Overview

Roger Sheet is a lightweight, serverless queue processing system that leverages Google infrastructure:

- **Google Sheets** acts as the persistent queue datastore (like Redis for BullMQ)
- **Google Apps Script** serves as the worker, scheduler, and API backend
- **Next.js** provides a modern web interface for queue management

Perfect for:
- Small to medium workloads
- Serverless architectures
- Projects that don't want to manage queue infrastructure
- Webhook schedulers and delayed task execution
- API orchestration and integration workflows

## Features

### Core Capabilities

- ✅ **Immediate Jobs** - Execute tasks immediately
- ✅ **Delayed Jobs** - Schedule jobs to run after a delay
- ✅ **Cron Jobs** - Recurring scheduled jobs
- ✅ **Retry Logic** - Automatic retries with exponential backoff
- ✅ **Dead Letter Queue** - Failed jobs after max retries
- ✅ **Priority Queues** - Job prioritization (1-10)
- ✅ **Worker Locking** - Concurrent execution protection
- ✅ **Queue Pause/Resume** - Control job processing per queue
- ✅ **Status Tracking** - Real-time job status monitoring

### HTTP Request Execution

- Execute HTTP/webhook requests (GET, POST, PUT, DELETE, PATCH)
- Custom headers and JSON body support
- 30-second request timeout
- Response status tracking

### Management Interface

- Real-time dashboard with queue statistics
- Job list with filtering and search
- Create and schedule jobs via web UI
- View job details, errors, and retry history
- Queue management (pause/resume/clear)
- Manual job retry

## Architecture

```
┌─────────────────┐
│   Next.js App   │ ← User Interface
│  (Management)   │
└────────┬────────┘
         │ HTTP API
         ▼
┌─────────────────┐
│  Apps Script    │ ← API + Worker
│  - Web App API  │
│  - Job Processor│
│  - Scheduler    │
└────────┬────────┘
         │ Read/Write
         ▼
┌─────────────────┐
│  Google Sheet   │ ← Queue Datastore
│  - Queue Table  │
│  - CronJobs     │
└─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google account with Sheets access
- Git (optional)

### 1. Clone and Install Next.js App

```bash
git clone <your-repo-url>
cd roger-sheet
npm install
```

### 2. Deploy Google Apps Script

Follow the detailed guide in [`apps-script/README.md`](apps-script/README.md):

1. Create a new Google Sheet
2. Set up the Queue and CronJobs sheets
3. Add the Apps Script code
4. Deploy as Web App
5. Set up time-driven trigger (runs every minute)
6. Copy the Web App URL

### 3. Configure Next.js Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Apps Script Web App URL:

```
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### 4. Run the Next.js App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a Job via UI

1. Navigate to **Jobs** → **Create Job**
2. Configure the job:
   - Select queue name (default: "default")
   - Choose job type (immediate/delayed/cron)
   - Enter HTTP request details (URL, method, headers, body)
   - Set priority (1-10) and max retries
3. Click **Create Job**

### Creating a Job via API

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "webhooks",
      "type": "immediate",
      "url": "https://api.example.com/webhook",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer token123"
      },
      "body": {
        "event": "user.created",
        "userId": "12345"
      },
      "priority": 5,
      "maxRetries": 3
    }
  }'
```

### Setting Up Cron Jobs

1. Open your Google Sheet
2. Go to the `CronJobs` sheet
3. Add a row with:
   - **id**: Generate a UUID
   - **name**: Descriptive name
   - **queue**: Queue name
   - **cronExpression**: `every-5-minutes`, `every-1-hours`, or `daily-14:30`
   - **payload**: JSON string with url, method, headers, body
   - **enabled**: `TRUE`
   - **lastRun**: Leave empty
   - **nextRun**: Leave empty (auto-calculated)

Example:
```
| id | name | queue | cronExpression | payload | enabled | lastRun | nextRun |
|----|------|-------|----------------|---------|---------|---------|---------|
| abc-123 | Daily Report | default | daily-09:00 | {"url":"https://api.example.com/report","method":"POST"} | TRUE | | |
```

## Queue Table Structure

The Google Sheet `Queue` tab contains these columns:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique job identifier |
| queue | string | Queue name (e.g., "default", "emails") |
| type | string | "immediate", "delayed", or "cron" |
| payload | JSON | HTTP request configuration |
| status | string | "pending", "processing", "completed", "failed", "dead" |
| priority | number | 1-10, higher = more important |
| retryCount | number | Current retry attempt |
| maxRetries | number | Maximum retry attempts |
| runAt | ISO date | When to execute the job |
| lockedBy | UUID | Worker execution ID (if locked) |
| lockedAt | ISO date | When the job was locked |
| createdAt | ISO date | Job creation time |
| updatedAt | ISO date | Last update time |
| lastError | string | Error message if failed |
| completedAt | ISO date | Completion time |

## Job Lifecycle

```
┌──────────┐
│  Created │
│ (pending)│
└────┬─────┘
     │
     ▼
┌──────────┐     ┌──────────┐
│ Eligible │────→│  Locked  │
│(runAt ≤  │     │(processing)
│   now)   │     └────┬─────┘
└──────────┘          │
                      ├─ Success ──→ Completed
                      │
                      └─ Failure ──→ Retry? ─┬─ Yes ──→ Pending (with delay)
                                              │
                                              └─ No ──→ Dead
```

## Retry Strategy

Failed jobs are automatically retried with exponential backoff:

- **Retry 1**: 2 minutes delay
- **Retry 2**: 4 minutes delay
- **Retry 3**: 8 minutes delay
- After max retries: Moved to Dead Letter Queue

## Project Structure

```
roger-sheet/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx                # Dashboard
│   ├── jobs/
│   │   ├── page.tsx            # Jobs list
│   │   ├── new/page.tsx        # Create job form
│   │   └── [id]/page.tsx       # Job details
│   ├── queues/
│   │   └── page.tsx            # Queue management
│   └── actions/
│       ├── jobs.ts             # Job server actions
│       └── queues.ts           # Queue server actions
├── components/
│   ├── job-form.tsx            # Job creation form
│   ├── job-list.tsx            # Jobs table with filters
│   ├── queue-stats.tsx         # Statistics cards
│   ├── status-badge.tsx        # Status badge component
│   └── ui/                     # shadcn/ui components
├── types/
│   └── job.ts                  # TypeScript interfaces
├── lib/
│   └── utils.ts                # Utility functions
├── apps-script/
│   ├── Code.gs                 # Complete Apps Script implementation
│   ├── appsscript.json         # Apps Script manifest
│   └── README.md               # Deployment guide
└── README.md                   # This file
```

## Limitations

### Apps Script Quotas

- **Execution time**: 6 minutes per execution
- **Daily runtime**: 90 min/day (free), 6 hours/day (Workspace)
- **URL Fetch calls**: 20,000/day (free), 100,000/day (Workspace)
- **Trigger frequency**: Minute-level precision (not seconds)

### Performance Considerations

- **Batch size**: Max 50 jobs per execution
- **Sheet operations**: Batched for efficiency
- **Concurrency**: Single worker per trigger execution
- **Lock timeout**: 5 minutes for stale locks

### Best Practices

1. **Keep job payloads small** - Large JSON bodies affect sheet performance
2. **Use appropriate queues** - Separate queues for different job types
3. **Monitor quota usage** - Check Apps Script dashboard
4. **Set realistic retry limits** - Default 3 retries is usually sufficient
5. **Clean up completed jobs** - Regularly clear old completed jobs

## Development

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Deployment

### Deploy Next.js App

Deploy to Vercel, Netlify, or any Node.js hosting:

```bash
npm run build
```

Make sure to set the `APPS_SCRIPT_WEB_APP_URL` environment variable in your deployment platform.

### Update Apps Script

See [`apps-script/README.md`](apps-script/README.md) for instructions on updating the Apps Script deployment.

## Troubleshooting

### Jobs not processing

1. Check that the Apps Script time trigger is enabled
2. View Apps Script Executions log for errors
3. Verify the `Queue` sheet exists and has correct headers
4. Check if queue is paused in the UI

### "Cannot connect to Apps Script" error

1. Verify the Web App URL in `.env.local`
2. Check that the Apps Script deployment is set to "Anyone" access
3. Test the URL directly in a browser

### Jobs stuck in "processing"

1. Stale locks are automatically recovered after 5 minutes
2. Check the Apps Script logs for execution errors
3. Verify the target URL is accessible from Google Apps Script

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.

## Acknowledgments

- Inspired by [BullMQ](https://docs.bullmq.io/)
- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Queue infrastructure by [Google Apps Script](https://developers.google.com/apps-script)

## Support

For issues and questions:

1. Check the [Apps Script README](apps-script/README.md)
2. Review Apps Script execution logs
3. Open an issue on GitHub

---

**Roger Sheet** - Simple, serverless job queues powered by Google Sheets
