# Processor-Based Architecture

**Version 3.0 - Final BullMQ Architecture with Processors & Job Graveyard**

## Overview

This document describes the final architecture of Roger Sheet, a queue processing system using Google Sheets and Apps Script with a Next.js management interface. This version implements a true processor-based pattern where jobs are lightweight references to reusable execution logic.

## Core Concepts

### 1. **Processors** (New!)
Processors are reusable job execution definitions that contain the actual logic for how a job should be executed. They can be:
- **Script Processors**: Custom JavaScript code with helper functions
- **HTTP Processors**: HTTP request configurations

Think of processors as "job templates" or "execution blueprints" that multiple jobs can reference.

### 2. **Jobs**
Jobs are now lightweight instances that:
- Reference a processor by name
- Contain job-specific data to be passed to the processor
- Track execution state, attempts, and results
- Are automatically moved to the graveyard when completed/failed

### 3. **Queues**
Queues organize jobs and can be paused/resumed. All jobs belong to a queue.

### 4. **Repeatable Jobs**
Scheduled jobs that automatically create new job instances on a recurring pattern, referencing a processor.

### 5. **Job Graveyard** (New!)
A separate sheet where completed and failed jobs are automatically archived, keeping the active jobs list clean and performant.

## Google Sheets Structure

### Sheet 1: `Queues`
Columns:
- `name` - Unique queue identifier
- `isPaused` - Boolean, whether queue is paused
- `createdAt` - ISO timestamp

### Sheet 2: `Processors` (New!)
Columns:
- `name` - Unique processor identifier
- `type` - `script` or `http`
- `config` - JSON string containing processor configuration
  - For script: `{ "script": "..." }`
  - For http: `{ "url": "...", "method": "...", "headers": {...}, "body": {...}, "urlTemplate": true/false }`
- `description` - Optional description
- `createdAt` - ISO timestamp

### Sheet 3: `Jobs`
Columns:
- `id` - UUID
- `queueName` - Queue identifier
- `processor` - Processor name to execute
- `data` - JSON string of job-specific data passed to processor
- `state` - `waiting`, `active`, `delayed`
- `priority` - Number (higher = runs first)
- `attempts` - Current attempt count
- `maxAttempts` - Maximum retry attempts
- `delay` - Milliseconds to delay execution
- `timestamp` - Created timestamp
- `processedOn` - When job started processing
- `repeatJobKey` - If created by repeatable job

**Note**: Jobs are removed from this sheet when completed/failed and moved to graveyard.

### Sheet 4: `JobsGraveyard` (New!)
Columns:
- `id` - UUID
- `queueName` - Queue identifier
- `processor` - Processor name
- `data` - Job data
- `state` - `completed` or `failed`
- `priority` - Original priority
- `attempts` - Final attempt count
- `maxAttempts` - Max attempts allowed
- `timestamp` - Created timestamp
- `processedOn` - When job started
- `finishedOn` - When job completed/failed
- `failedReason` - Error message if failed
- `returnvalue` - JSON string of return value if completed
- `repeatJobKey` - If created by repeatable job

### Sheet 5: `Repeatable`
Columns:
- `key` - Unique key: `{queueName}::{processor}::{pattern}`
- `queueName` - Queue identifier
- `processor` - Processor name
- `data` - JSON string of data template
- `pattern` - Schedule pattern
- `enabled` - Boolean
- `lastRun` - Last execution timestamp
- `nextRun` - Next scheduled execution

## Data Flow

### Creating a Processor
1. User defines processor in UI (script or HTTP)
2. Processor saved to `Processors` sheet
3. Can now be referenced by multiple jobs

### Adding a Job
1. User selects existing processor
2. Provides job-specific data (e.g., `{ userId: "123", action: "send-email" }`)
3. Job created in `Jobs` sheet with reference to processor

### Job Execution (Worker)
1. Worker finds eligible jobs in `Jobs` sheet
2. For each job:
   - Looks up processor definition
   - Executes processor with job data
   - If successful: moves to graveyard with `completed` state and return value
   - If failed: retries with exponential backoff or moves to graveyard if max attempts reached

### Processor Types

#### Script Processor
```javascript
{
  "type": "script",
  "config": {
    "script": "const result = fetch('https://api.example.com/user/' + data.userId); return result;"
  }
}
```

Available helper functions in script:
- `fetch(url, options)` - Make HTTP requests
- `log(message)` - Log messages
- `addJob(queue, processor, data, opts)` - Create new jobs
- `parseJSON(str)`, `stringifyJSON(obj)` - JSON utilities
- `getProperty(key)`, `setProperty(key, val)` - Script properties
- `sleep(ms)` - Delay execution

#### HTTP Processor
```javascript
{
  "type": "http",
  "config": {
    "url": "https://api.example.com/notify",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer {token}"
    },
    "body": {
      "userId": "{userId}",
      "message": "Hello"
    },
    "urlTemplate": true
  }
}
```

Template variables (`{variable}`) in URL, headers, and body are replaced with job data.

## API Reference

### Processor Operations

#### Create Processor
```javascript
POST /script-url
{
  "action": "createProcessor",
  "data": {
    "name": "send-email",
    "type": "script",
    "config": { "script": "..." },
    "description": "Sends email notifications"
  }
}
```

#### Get Processors
```javascript
POST /script-url
{ "action": "getProcessors" }
```

#### Update Processor
```javascript
POST /script-url
{
  "action": "updateProcessor",
  "data": {
    "name": "send-email",
    "config": { "script": "..." }
  }
}
```

#### Delete Processor
```javascript
POST /script-url
{
  "action": "deleteProcessor",
  "data": { "name": "send-email" }
}
```

#### Test Processor
```javascript
POST /script-url
{
  "action": "testProcessor",
  "data": {
    "name": "send-email",
    "testData": { "email": "test@example.com" }
  }
}
```

### Job Operations

#### Add Job
```javascript
POST /script-url
{
  "action": "addJob",
  "data": {
    "queueName": "default",
    "processor": "send-email",
    "data": { "email": "user@example.com", "subject": "Welcome" },
    "opts": {
      "priority": 10,
      "delay": 5000,
      "attempts": 3
    }
  }
}
```

#### Get Jobs
```javascript
POST /script-url
{
  "action": "getJobs",
  "data": {
    "queueName": "default",  // optional
    "state": "waiting",      // optional
    "processor": "send-email" // optional
  }
}
```

#### Get Job
```javascript
POST /script-url
{
  "action": "getJob",
  "data": { "id": "job-uuid" }
}
```
**Note**: Automatically checks graveyard if not in active jobs.

#### Retry Job
```javascript
POST /script-url
{
  "action": "retryJob",
  "data": { "id": "job-uuid" }
}
```
**Note**: If job is in graveyard, moves it back to active jobs.

### Graveyard Operations

#### Get Graveyard Jobs
```javascript
POST /script-url
{
  "action": "getGraveyardJobs",
  "data": {
    "queueName": "default", // optional
    "state": "completed"    // optional
  }
}
```

#### Clean Graveyard
```javascript
POST /script-url
{
  "action": "cleanGraveyard",
  "data": {
    "olderThan": 604800000  // optional, ms (e.g., 7 days)
  }
}
```

### Repeatable Operations

#### Add Repeatable Job
```javascript
POST /script-url
{
  "action": "addRepeatableJob",
  "data": {
    "queueName": "default",
    "processor": "daily-report",
    "pattern": "daily-09:00",
    "data": { "reportType": "summary" }
  }
}
```

## UI Structure

### Pages
- `/` - Dashboard with queue stats and recent jobs
- `/jobs` - Job list with filters
- `/jobs/new` - Create job (unified: immediate, scheduled once, or repeatable)
- `/jobs/[id]` - Job details (shows processor, data, results)
- `/processors` - Processor list
- `/processors/new` - Create processor
- `/queues` - Queue management
- `/cron` - View repeatable jobs

### Key Components
- `ProcessorForm` - Create/edit processors
- `ProcessorsList` - View and manage processors
- `JobForm` - Create jobs by selecting processor
- `JobList` - Display jobs with processor info
- `StatusBadge` - Job state visualization

## Migration from Previous Architecture

### What Changed
1. **Jobs no longer embed execution logic**
   - Old: `job.data = { type: 'script', script: '...' }`
   - New: `job.processor = 'processor-name'` + `job.data = { userId: '123' }`

2. **Processors are reusable**
   - Define once, use in multiple jobs
   - Easy to update execution logic centrally
   - Test processors independently

3. **Completed/Failed jobs auto-archived**
   - Keeps `Jobs` sheet performant
   - Historical data in `JobsGraveyard`
   - Can retry failed jobs from graveyard

### Migration Steps
1. Create processors for existing job types
2. Update job creation to reference processors
3. Deploy new Apps Script code
4. Redeploy Next.js application

## Best Practices

### Processor Design
- Keep processors focused on one responsibility
- Use descriptive processor names (`validate-email`, `send-notification`)
- Add descriptions to document processor purpose
- Test processors before using in production jobs

### Job Data
- Keep job data minimal and specific
- Use template variables in HTTP processors for flexibility
- Validate data before creating jobs

### Graveyard Management
- Periodically clean old graveyard jobs to save space
- Keep failed jobs for debugging
- Export important graveyard data before cleaning

### Performance
- Use priority for time-sensitive jobs
- Use delays for rate-limiting or scheduled execution
- Pause queues during maintenance
- Monitor graveyard size and clean regularly

## Example Use Cases

### 1. Email Validation System
```javascript
// Create processor once
Processor: "validate-email"
Type: script
Config: {
  script: `
    const response = fetch('https://vemail.vercel.app/validate?email=' + data.email);
    const result = parseJSON(response.body);
    return { valid: result.valid, reason: result.reason };
  `
}

// Create many jobs
Job 1: processor="validate-email", data={ email: "user1@example.com" }
Job 2: processor="validate-email", data={ email: "user2@example.com" }
Job 3: processor="validate-email", data={ email: "user3@example.com" }
```

### 2. Webhook Notification
```javascript
// Create processor once
Processor: "notify-webhook"
Type: http
Config: {
  url: "https://webhook.site/unique-id",
  method: "POST",
  body: {
    event: "{eventType}",
    userId: "{userId}",
    timestamp: "{timestamp}"
  }
}

// Create jobs with different data
Job: processor="notify-webhook", data={
  eventType: "user.signup",
  userId: "123",
  timestamp: "2024-01-01T00:00:00Z"
}
```

### 3. Multi-Step Workflow
```javascript
// Create processors for each step
Processor: "fetch-user-data"
Processor: "process-payment"
Processor: "send-confirmation"

// Chain jobs
In "fetch-user-data" script:
  const userData = fetch('...');
  addJob('default', 'process-payment', { userId: data.userId, amount: userData.amount });
```

## Conclusion

The processor-based architecture provides:
- ✅ **Reusability**: Define logic once, use in many jobs
- ✅ **Maintainability**: Update processors centrally
- ✅ **Testability**: Test processors independently
- ✅ **Performance**: Clean job sheet via auto-archival
- ✅ **Clarity**: Separation of execution logic and job data
- ✅ **Scalability**: Easy to add new processors without code changes

This is the **final, production-ready architecture** for Roger Sheet! 🚀
