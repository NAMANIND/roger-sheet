# BullMQ Architecture - Roger Sheet

## 🎉 Complete Refactor to True BullMQ Structure

Roger Sheet now follows the **exact BullMQ architecture** with proper separation of concerns.

---

## Core Concepts

### 1. **Queue** = Container/Namespace
A queue is just a **named container** for jobs (e.g., "emails", "webhooks", "reports").

```javascript
// In BullMQ
const emailQueue = new Queue('emails');
const webhookQueue = new Queue('webhooks');
```

### 2. **Job** = Task Instance
Each job is a **separate execution instance** with:
- `name` - Job type (e.g., "send-welcome", "process-order")
- `data` - Payload (script or HTTP config)
- `state` - Current status (waiting, active, completed, failed, delayed)

```javascript
// In BullMQ - each call creates a NEW job instance
emailQueue.add('send-welcome', { email: 'user1@example.com' });
emailQueue.add('send-welcome', { email: 'user2@example.com' }); // Different job
```

### 3. **Worker** = Job Processor
The worker polls jobs from queues and executes them.

```javascript
// In BullMQ
const worker = new Worker('emails', async (job) => {
  console.log(job.name, job.data);
  // Execute job
});
```

### 4. **Repeatable** = Cron Templates
Repeatable jobs automatically create new job instances on schedule.

```javascript
// In BullMQ
emailQueue.add('daily-report', {}, { 
  repeat: { cron: '0 9 * * *' } 
});
```

---

## Google Sheets Structure

### **Sheet 1: Queues**
Registry of all queues in the system.

```
| name      | isPaused | createdAt           |
|-----------|----------|---------------------|
| emails    | FALSE    | 2026-05-15T10:00:00 |
| webhooks  | FALSE    | 2026-05-15T10:00:00 |
| default   | FALSE    | 2026-05-15T10:00:00 |
```

**Columns:**
- `name` - Unique queue identifier
- `isPaused` - Whether the queue is paused
- `createdAt` - When the queue was created

### **Sheet 2: Jobs**
All job instances from all queues.

```
| id   | queueName | name          | data                  | state   | priority | attempts | maxAttempts | delay | timestamp  | processedOn | finishedOn | failedReason | returnvalue | repeatJobKey |
|------|-----------|---------------|-----------------------|---------|----------|----------|-------------|-------|------------|-------------|------------|--------------|-------------|--------------|
| j1   | emails    | send-welcome  | {type:"script",...}   | waiting | 0        | 0        | 3           | 0     | 2026-...   | null        | null       | null         | null        | null         |
| j2   | webhooks  | call-api      | {type:"http",...}     | active  | 5        | 1        | 3           | 0     | 2026-...   | 2026-...    | null       | null         | null        | null         |
| j3   | emails    | send-reminder | {type:"script",...}   | delayed | 0        | 0        | 3           | 30000 | 2026-...   | null        | null       | null         | null        | null         |
```

**Columns:**
- `id` - Unique job ID (UUID)
- `queueName` - Which queue this job belongs to
- `name` - Job type/name (e.g., "send-welcome")
- `data` - JSON payload (script or HTTP config)
- `state` - waiting | active | completed | failed | delayed
- `priority` - Higher = processed first (default: 0)
- `attempts` - Current attempt count
- `maxAttempts` - Max retry attempts before failing
- `delay` - Milliseconds to wait before processing
- `timestamp` - When job was created
- `processedOn` - When job started processing
- `finishedOn` - When job completed/failed
- `failedReason` - Error message if failed
- `returnvalue` - Job execution result
- `repeatJobKey` - Link to repeatable job (if auto-created)

**Job States:**
- `waiting` - Ready to be processed
- `active` - Currently being processed
- `delayed` - Waiting for delay period
- `completed` - Successfully finished
- `failed` - Failed after all retries

### **Sheet 3: Repeatable**
Cron/scheduled job templates that auto-create job instances.

```
| key               | queueName | name         | data                | pattern       | enabled | lastRun     | nextRun     |
|-------------------|-----------|--------------|---------------------|---------------|---------|-------------|-------------|
| emails::daily::*  | emails    | daily-report | {type:"script",...} | daily-09:00   | TRUE    | 2026-05-15  | 2026-05-16  |
| webhooks::hourly  | webhooks  | health-check | {type:"http",...}   | every-1-hours | TRUE    | 2026-...    | 2026-...    |
```

**Columns:**
- `key` - Unique identifier (auto-generated: `queueName::name::pattern`)
- `queueName` - Which queue to add jobs to
- `name` - Job name for created instances
- `data` - JSON template for job data
- `pattern` - Schedule pattern (e.g., "every-5-minutes", "daily-09:00")
- `enabled` - Whether this repeatable is active
- `lastRun` - Last time a job was created
- `nextRun` - Next scheduled execution

**Pattern Examples:**
- `every-1-minutes`
- `every-5-minutes`
- `every-1-hours`
- `every-2-hours`
- `daily-09:00` (UTC)
- `daily-18:30` (UTC)

---

## Job Data Structure

### Script Jobs
```json
{
  "type": "script",
  "script": "const response = fetch('https://api.example.com/data', { method: 'GET' });\nlog('Status: ' + response.status);\nreturn { success: true };"
}
```

### HTTP Jobs
```json
{
  "type": "http",
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer token123"
  },
  "body": {
    "event": "user.created",
    "userId": "12345"
  }
}
```

---

## API Reference

### Queue Operations

#### Create Queue
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "createQueue",
  "data": {
    "name": "emails"
  }
}
```

#### Get All Queues
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "getQueues"
}
```

#### Pause Queue
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "pauseQueue",
  "data": {
    "name": "emails"
  }
}
```

#### Resume Queue
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "resumeQueue",
  "data": {
    "name": "emails"
  }
}
```

### Job Operations

#### Add Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "addJob",
  "data": {
    "queueName": "emails",
    "name": "send-welcome",
    "data": {
      "type": "script",
      "script": "log('Hello'); return { success: true };"
    },
    "opts": {
      "priority": 5,
      "delay": 0,
      "attempts": 3
    }
  }
}
```

#### Get Jobs
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "getJobs",
  "data": {
    "queueName": "emails",  // Optional
    "state": "waiting",     // Optional
    "name": "send-welcome"  // Optional
  }
}
```

#### Get Single Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "getJob",
  "data": {
    "id": "job-uuid-here"
  }
}
```

#### Retry Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "retryJob",
  "data": {
    "id": "job-uuid-here"
  }
}
```

#### Remove Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "removeJob",
  "data": {
    "id": "job-uuid-here"
  }
}
```

#### Clean Jobs (Bulk Delete)
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "cleanJobs",
  "data": {
    "state": "completed",   // or "failed"
    "queueName": "emails"   // Optional
  }
}
```

### Repeatable Operations

#### Add Repeatable Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "addRepeatableJob",
  "data": {
    "queueName": "emails",
    "name": "daily-report",
    "data": {
      "type": "script",
      "script": "log('Daily report'); return { success: true };"
    },
    "pattern": "daily-09:00"
  }
}
```

#### Get Repeatable Jobs
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "getRepeatableJobs",
  "data": {
    "queueName": "emails"  // Optional
  }
}
```

#### Remove Repeatable Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "removeRepeatableJob",
  "data": {
    "key": "emails::daily-report::daily-09:00"
  }
}
```

#### Toggle Repeatable Job
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "toggleRepeatableJob",
  "data": {
    "key": "emails::daily-report::daily-09:00",
    "enabled": false
  }
}
```

### Stats Operations

#### Get Queue Stats
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "getQueueStats"
}
```

Returns stats for all queues:
```json
{
  "success": true,
  "data": [
    {
      "name": "emails",
      "total": 150,
      "waiting": 10,
      "active": 2,
      "completed": 130,
      "failed": 5,
      "delayed": 3,
      "isPaused": false
    }
  ]
}
```

#### Get Worker Stats
```bash
POST YOUR_APPS_SCRIPT_URL
{
  "action": "getWorkerStats"
}
```

---

## Worker Behavior

The Apps Script worker runs every minute (via time trigger) and:

1. **Processes Repeatable Jobs**
   - Checks if any repeatable job's `nextRun` has passed
   - Creates new job instances in Jobs sheet
   - Updates `lastRun` and calculates new `nextRun`

2. **Processes Eligible Jobs**
   - Finds jobs with:
     - `state` = "waiting" OR
     - `state` = "delayed" AND delay period passed
   - Sorts by priority (desc) then timestamp (asc)
   - Processes up to 50 jobs per run

3. **For Each Job:**
   - Updates `state` to "active"
   - Sets `processedOn` timestamp
   - Executes job (script or HTTP)
   - On success: Updates `state` to "completed", sets `returnvalue`
   - On failure: Retries with exponential backoff or marks as "failed"

4. **Retry Strategy:**
   - Attempt 1 fails → delay 2 minutes
   - Attempt 2 fails → delay 4 minutes
   - Attempt 3 fails → delay 8 minutes
   - After `maxAttempts` → state = "failed"

---

## Comparison: Old vs New

### Old Structure ❌
- **Queue** sheet = All jobs mixed together
- **CronJobs** sheet = Separate from main flow
- `status` field with values: pending, processing, completed, failed, dead
- `type` field: immediate, delayed, cron
- `queue` = just a string field on jobs
- Confusing naming and flow

### New Structure ✅
- **Queues** sheet = Queue registry
- **Jobs** sheet = All job instances
- **Repeatable** sheet = Cron templates
- `state` field with values: waiting, active, completed, failed, delayed
- No `type` field (handled by delay/repeatJobKey)
- `queueName` = reference to Queues sheet
- Clean BullMQ patterns

---

## Migration Steps

If you have existing data:

1. **Backup your Google Sheet**
2. **Create new sheets:**
   - Rename "Queue" → "Jobs" (or create new "Jobs")
   - Create "Queues" sheet
   - Rename "CronJobs" → "Repeatable"
3. **Update Apps Script:**
   - Replace entire `Code.gs` with new version
   - Redeploy as Web App
4. **Update Next.js app:**
   - Types already updated
   - Actions already updated
   - Update UI pages (in progress)
5. **Migrate data manually** (or start fresh)

---

## Next Steps

✅ Core architecture refactored
✅ Apps Script rewritten
✅ Server actions updated
🔄 UI components being updated
⏳ Full documentation

You can now:
- Create queues
- Add jobs to queues (immediate or delayed)
- Add repeatable jobs for cron-like behavior
- Jobs are processed by the worker every minute
- View job status and results

---

## Summary

**Queue → Job → Worker**

1. Create a **Queue** (container)
2. Add **Jobs** to the queue (tasks)
3. **Worker** processes jobs automatically
4. Add **Repeatable** jobs for recurring tasks

This is now a **true BullMQ-inspired queue system** built on Google Sheets! 🎉
