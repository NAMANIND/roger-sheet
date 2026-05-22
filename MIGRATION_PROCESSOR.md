# Migration Guide: To Processor-Based Architecture (v3.0)

## Overview

This guide helps you migrate from the previous BullMQ architecture (v2.x) where jobs embedded their execution logic, to the new processor-based architecture (v3.0) where jobs reference reusable processors.

## What's Changed

### Architecture Changes

| Aspect | Old (v2.x) | New (v3.0) |
|--------|-----------|-----------|
| Job Execution | Embedded in job data | Referenced via processor |
| Job Data | `{ type: 'script', script: '...' }` or `{ type: 'http', url: '...' }` | `{ userId: '123', email: 'user@example.com' }` |
| Reusability | Create new job with full config each time | Reference existing processor |
| Completed Jobs | Remain in Jobs sheet | Moved to JobsGraveyard |
| Failed Jobs | Remain in Jobs sheet | Moved to JobsGraveyard |

### New Sheets
- **`Processors`** - Stores reusable execution logic
- **`JobsGraveyard`** - Archives completed/failed jobs

### Updated Sheets
- **`Jobs`** - Now references processors, jobs auto-removed when done
- **`Repeatable`** - Now references processors

## Migration Steps

### Step 1: Analyze Existing Jobs

Review your current jobs to identify common patterns:

```javascript
// Example old jobs
Job 1: { type: 'http', url: 'https://api.example.com/notify', method: 'POST', body: {...} }
Job 2: { type: 'http', url: 'https://api.example.com/notify', method: 'POST', body: {...} }
Job 3: { type: 'script', script: 'const result = fetch("https://api.example.com/validate?email=" + data.email); ...' }
```

Identify patterns:
- HTTP jobs with same URL/method → HTTP Processor
- Scripts with same logic → Script Processor

### Step 2: Create Processors

For each pattern, create a processor:

#### Example: HTTP Notification Processor

**Old Job:**
```javascript
{
  type: 'http',
  url: 'https://webhook.site/abc123',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { message: 'User signed up', userId: '123' }
}
```

**New Processor:**
```javascript
// Create via UI or API
{
  name: 'webhook-notify',
  type: 'http',
  config: {
    url: 'https://webhook.site/abc123',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { message: '{message}', userId: '{userId}' },
    urlTemplate: false
  },
  description: 'Send notifications to webhook'
}
```

**New Jobs:**
```javascript
// Job 1
{ processor: 'webhook-notify', data: { message: 'User signed up', userId: '123' } }

// Job 2
{ processor: 'webhook-notify', data: { message: 'Order placed', userId: '456' } }
```

#### Example: Script Validation Processor

**Old Job:**
```javascript
{
  type: 'script',
  script: `
    const response = fetch('https://vemail.vercel.app/validate?email=' + data.email, {
      method: 'GET'
    });
    log('Status: ' + response.status);
    const result = parseJSON(response.body);
    return { valid: result.valid };
  `
}
```

**New Processor:**
```javascript
{
  name: 'validate-email',
  type: 'script',
  config: {
    script: `
      const response = fetch('https://vemail.vercel.app/validate?email=' + data.email, {
        method: 'GET'
      });
      log('Status: ' + response.status);
      const result = parseJSON(response.body);
      return { valid: result.valid };
    `
  },
  description: 'Validates email addresses'
}
```

**New Jobs:**
```javascript
// Job 1
{ processor: 'validate-email', data: { email: 'user1@example.com' } }

// Job 2
{ processor: 'validate-email', data: { email: 'user2@example.com' } }
```

### Step 3: Deploy New Apps Script

1. Open your Google Sheets document
2. Go to Extensions → Apps Script
3. Replace all code with the new `Code.gs` from v3.0
4. Save and deploy as Web App
5. Copy the new deployment URL (should be same if redeploying)

### Step 4: Update Environment Variables

Ensure `.env.local` has the correct script URL:

```env
SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Step 5: Deploy Next.js Application

```bash
npm install  # Install any new dependencies
npm run build
npm run dev  # or npm start for production
```

### Step 6: Create Processors via UI

1. Navigate to `/processors/new`
2. Create processors for your common job patterns
3. Test each processor using the "Test" button

### Step 7: Update Job Creation

Change how you create jobs:

**Old Code:**
```typescript
await addJob({
  queueName: 'default',
  name: 'email-validation',
  data: {
    type: 'script',
    script: 'const result = fetch(...); ...'
  },
  opts: { attempts: 3 }
});
```

**New Code:**
```typescript
await addJob({
  queueName: 'default',
  processor: 'validate-email',
  data: {
    email: 'user@example.com'
  },
  opts: { attempts: 3 }
});
```

### Step 8: Verify Migration

1. Check Processors page - all processors created
2. Create test jobs using new structure
3. Verify worker processes jobs correctly
4. Check JobsGraveyard for completed/failed jobs
5. Test job retry from graveyard

## API Changes

### Job API

#### Old: Add Job
```javascript
{
  action: 'addJob',
  data: {
    queueName: 'default',
    name: 'validate-email',
    data: {
      type: 'script',
      script: '...'
    }
  }
}
```

#### New: Add Job
```javascript
{
  action: 'addJob',
  data: {
    queueName: 'default',
    processor: 'validate-email',
    data: {
      email: 'user@example.com'
    }
  }
}
```

### Repeatable Job API

#### Old: Add Repeatable
```javascript
{
  action: 'addRepeatableJob',
  data: {
    queueName: 'default',
    name: 'daily-report',
    pattern: 'daily-09:00',
    data: {
      type: 'script',
      script: '...'
    }
  }
}
```

#### New: Add Repeatable
```javascript
{
  action: 'addRepeatableJob',
  data: {
    queueName: 'default',
    processor: 'daily-report',
    pattern: 'daily-09:00',
    data: {
      reportType: 'summary'
    }
  }
}
```

## TypeScript Type Changes

### Old Types
```typescript
interface Job {
  id: string;
  queueName: string;
  name: string;
  data: HttpJobData | ScriptJobData;  // Embedded logic
  state: JobState;
  // ...
}

type JobData = HttpJobData | ScriptJobData;

interface HttpJobData {
  type: 'http';
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

interface ScriptJobData {
  type: 'script';
  script: string;
}
```

### New Types
```typescript
interface Processor {
  name: string;
  type: ProcessorType;
  config: ProcessorConfig;
  description?: string;
  createdAt: string;
}

interface Job {
  id: string;
  queueName: string;
  processor: string;  // Reference to processor
  data: Record<string, any>;  // Job-specific data
  state: JobState;
  // ...
}

interface GraveyardJob extends Job {
  finishedOn: string | null;
  failedReason: string | null;
  returnvalue: any;
}
```

## Common Migration Scenarios

### Scenario 1: Single HTTP Job Type

**Before:**
- Create multiple jobs with same URL/method, different data

**After:**
1. Create one HTTP processor with template variables
2. Create jobs with different data

**Benefits:**
- Change endpoint URL once, affects all future jobs
- Easier to maintain and test

### Scenario 2: Multiple Script Variations

**Before:**
- Create similar scripts with slight modifications

**After:**
1. Create one flexible script processor
2. Use job data to pass variations

**Example:**
```javascript
// Processor script
const action = data.action;
if (action === 'validate') {
  // Validation logic
} else if (action === 'send') {
  // Sending logic
}

// Jobs
Job 1: { processor: 'email-processor', data: { action: 'validate', email: '...' } }
Job 2: { processor: 'email-processor', data: { action: 'send', email: '...' } }
```

### Scenario 3: Scheduled Jobs

**Before:**
- Repeatable jobs with embedded scripts

**After:**
1. Create script processor
2. Create repeatable job referencing processor
3. Use data template for schedule-specific data

## Rollback Plan

If you need to rollback to v2.x:

1. Keep backup of old Apps Script code
2. Redeploy old Apps Script version
3. Redeploy old Next.js version
4. Manually move jobs from graveyard back to jobs sheet if needed

## Troubleshooting

### Jobs Not Processing
- **Check**: Processor exists with correct name
- **Check**: Apps Script deployed with new code
- **Check**: Worker trigger is active

### Processor Not Found Error
- **Solution**: Create processor with exact name referenced in job
- **Check**: Case-sensitive processor names

### Jobs Stuck in Active State
- **Check**: Processor script/HTTP config is valid
- **Check**: Apps Script logs for errors
- **Solution**: Retry job from UI

### Graveyard Growing Too Large
- **Solution**: Clean graveyard periodically
- **Recommendation**: Archive to external storage before cleaning

## Best Practices Post-Migration

1. **Processor Naming**: Use descriptive, kebab-case names (`validate-email`, `send-notification`)
2. **Processor Documentation**: Add descriptions to all processors
3. **Testing**: Test processors independently before production use
4. **Monitoring**: Monitor graveyard for failed jobs
5. **Cleanup**: Schedule regular graveyard cleanup (e.g., monthly)
6. **Versioning**: If changing processor logic significantly, create new processor

## Support

For issues or questions:
1. Check `PROCESSOR_ARCHITECTURE.md` for detailed architecture docs
2. Review Apps Script logs: Apps Script Editor → Executions
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Migration Complete!** 🎉

You now have a cleaner, more maintainable queue processing system with reusable processors and automatic job archival.
