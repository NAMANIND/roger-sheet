# Migration Guide: Old Structure → BullMQ Architecture

## Summary of Changes

### Type System Changes

| Old | New | Description |
|-----|-----|-------------|
| `JobStatus` | `JobState` | Renamed to match BullMQ |
| `pending` | `waiting` | Job ready to process |
| `processing` | `active` | Job being processed |
| `dead` | `failed` | Job failed permanently (or just `failed`) |
| `CreateJobRequest` | `AddJobRequest` | Renamed to match BullMQ's `queue.add()` |
| `job.status` | `job.state` | Property renamed |
| `job.queue` | `job.queueName` | Property renamed |
| `job.type` | Removed | No longer needed (handled by delay/repeatJobKey) |
| `job.payload` | `job.data` | Renamed to match BullMQ |
| `job.retryCount` | `job.attempts` | Renamed to match BullMQ |
| `job.maxRetries` | `job.maxAttempts` | Renamed to match BullMQ |
| `job.runAt` | `job.timestamp` | Job creation time |
| `job.lastError` | `job.failedReason` | Error message |
| `job.completedAt` | `job.finishedOn` | Completion time |
| `job.lockedBy/lockedAt` | Removed | No longer needed |
| N/A | `job.processedOn` | When job started |
| N/A | `job.returnvalue` | Job execution result |
| N/A | `job.repeatJobKey` | Link to repeatable job |
| `CronJob` | `RepeatableJob` | Renamed to match BullMQ |
| `cronExpression` | `pattern` | Renamed |

### API Changes

| Old Action | New Action | Description |
|------------|------------|-------------|
| `createJob` | `addJob` | Add job to queue |
| `getJob` | `getJob` | No change |
| `deleteJob` | `removeJob` | Remove job |
| `clearCompletedJobs` | `cleanJobs` | Clean completed/failed jobs |
| `createCronJob` | `addRepeatableJob` | Add repeatable job |
| `getCronJobs` | `getRepeatableJobs` | Get repeatable jobs |
| `deleteCronJob` | `removeRepeatableJob` | Remove repeatable job |
| `toggleCronJob` | `toggleRepeatableJob` | Enable/disable repeatable |
| N/A | `createQueue` | Create new queue |
| `pauseQueue(queueName)` | `pauseQueue(name)` | Pause queue |
| `resumeQueue(queueName)` | `resumeQueue(name)` | Resume queue |

### Sheet Structure Changes

#### Old Structure ❌
- **Queue** sheet - Mixed all jobs
- **CronJobs** sheet - Cron definitions

#### New Structure ✅
- **Queues** sheet - Queue registry
- **Jobs** sheet - All job instances
- **Repeatable** sheet - Repeatable job templates

### Job Data Structure

#### Old HTTP Job
```javascript
{
  queue: "emails",
  type: "immediate",
  url: "https://api.example.com/webhook",
  method: "POST",
  headers: {...},
  body: {...}
}
```

#### New HTTP Job
```javascript
{
  queueName: "emails",
  name: "send-webhook",
  data: {
    type: "http",
    url: "https://api.example.com/webhook",
    method: "POST",
    headers: {...},
    body: {...}
  },
  opts: {
    priority: 0,
    delay: 0,
    attempts: 3
  }
}
```

#### Old Script Job
```javascript
{
  queue: "default",
  type: "immediate",
  script: "log('hello');"
}
```

#### New Script Job
```javascript
{
  queueName: "default",
  name: "my-script",
  data: {
    type: "script",
    script: "log('hello');"
  },
  opts: {
    priority: 0,
    delay: 0,
    attempts: 3
  }
}
```

## Code Migration Examples

### Frontend Component Migration

**Before:**
```tsx
import { createJob } from '@/app/actions/jobs';
import { JobStatus } from '@/types/job';

// Create job
await createJob({
  queue: 'emails',
  type: 'immediate',
  url: '...',
  method: 'POST'
});

// Display status
<StatusBadge status={job.status} />
<span>{job.queue}</span>
```

**After:**
```tsx
import { addJob } from '@/app/actions/jobs';
import { JobState } from '@/types/job';

// Create job
await addJob({
  queueName: 'emails',
  name: 'send-welcome',
  data: {
    type: 'http',
    url: '...',
    method: 'POST'
  },
  opts: {
    priority: 0,
    delay: 0,
    attempts: 3
  }
});

// Display status
<StatusBadge state={job.state} />
<span>{job.queueName}</span>
```

### Apps Script Migration

**Before:**
```javascript
// Add job
const job = {
  id: generateUUID(),
  queue: 'emails',
  type: 'immediate',
  payload: JSON.stringify({url: '...'}),
  status: 'pending',
  retryCount: 0,
  maxRetries: 3
};
```

**After:**
```javascript
// Add job
const job = {
  id: generateUUID(),
  queueName: 'emails',
  name: 'send-email',
  data: JSON.stringify({type: 'http', url: '...'}),
  state: 'waiting',
  attempts: 0,
  maxAttempts: 3,
  priority: 0,
  delay: 0,
  timestamp: new Date().toISOString()
};
```

## Breaking Changes Checklist

✅ Updated all TypeScript types
✅ Renamed API actions
✅ Updated Apps Script handlers
✅ Updated server actions
✅ Updated UI components
✅ Removed old files (`app/actions/cron.ts`)
✅ Created new documentation

## Files That Were Updated

### Core Files
- ✅ `types/job.ts` - All type definitions
- ✅ `apps-script/Code.gs` - Complete rewrite
- ✅ `app/actions/jobs.ts` - Renamed functions
- ✅ `app/actions/queues.ts` - Added createQueue
- ✅ `app/actions/repeatable.ts` - NEW FILE

### UI Components
- ✅ `components/job-form.tsx` - Updated for BullMQ
- ✅ `components/add-job-form.tsx` - NEW FILE
- ✅ `components/status-badge.tsx` - Use `state` prop
- ✅ `app/jobs/[id]/page.tsx` - Updated job details

### Documentation
- ✅ `BULLMQ_ARCHITECTURE.md` - Complete architecture guide
- ✅ `MIGRATION_GUIDE.md` - This file

## Deployment Steps

1. **Backup your data** (if you have existing jobs)

2. **Update Google Sheet Structure**
   ```
   Create 3 sheets:
   - Queues (name, isPaused, createdAt)
   - Jobs (id, queueName, name, data, state, priority, attempts, maxAttempts, delay, timestamp, processedOn, finishedOn, failedReason, returnvalue, repeatJobKey)
   - Repeatable (key, queueName, name, data, pattern, enabled, lastRun, nextRun)
   ```

3. **Deploy Updated Apps Script**
   - Open your Google Sheet
   - Extensions → Apps Script
   - Replace Code.gs with new version
   - Save and deploy as Web App
   - Copy new deployment URL

4. **Update Next.js Environment**
   ```bash
   # .env.local
   APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_NEW_ID/exec
   ```

5. **Build and Deploy Next.js**
   ```bash
   npm run build
   npm start
   # Or deploy to Vercel/Netlify
   ```

6. **Test the System**
   - Create a queue
   - Add a job
   - Verify it processes correctly

## Need Help?

- Read `BULLMQ_ARCHITECTURE.md` for full API reference
- Read `SCRIPT_EXECUTION.md` for script examples
- Check Apps Script execution logs for errors
- Verify sheet structure matches new format

---

**Status:** ✅ Migration Complete - Ready for Testing
