# Test Examples

Example API calls and test data for Roger Sheet.

## Testing the Apps Script Web App

### 1. Test Health Check

```bash
curl "YOUR_APPS_SCRIPT_URL"
```

Expected response:
```json
{
  "success": true,
  "message": "Roger Queue System API",
  "version": "1.0.0"
}
```

### 2. Create an Immediate Job

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/post",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "test": true,
        "message": "Hello from Roger Sheet!"
      },
      "priority": 5,
      "maxRetries": 3
    }
  }'
```

### 3. Create a Delayed Job (5 minutes)

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "delayed",
      "url": "https://httpbin.org/post",
      "method": "POST",
      "body": {
        "delayed": true
      },
      "priority": 5,
      "maxRetries": 3,
      "runAt": "'$(date -u -v+5M +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }'
```

### 4. Get All Jobs

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getJobs"
  }'
```

### 5. Get Jobs by Status

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getJobs",
    "data": {
      "status": "pending"
    }
  }'
```

### 6. Get Queue Statistics

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getQueueStats"
  }'
```

### 7. Pause a Queue

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "pauseQueue",
    "data": {
      "queueName": "default"
    }
  }'
```

### 8. Resume a Queue

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "resumeQueue",
    "data": {
      "queueName": "default"
    }
  }'
```

## Sample Cron Jobs

Add these to your `CronJobs` sheet for testing:

### Every 5 Minutes Job

| Column | Value |
|--------|-------|
| id | `550e8400-e29b-41d4-a716-446655440001` |
| name | Every 5 Minutes Test |
| queue | default |
| cronExpression | every-5-minutes |
| payload | `{"url":"https://httpbin.org/post","method":"POST","body":{"cron":"every-5-min"}}` |
| enabled | TRUE |
| lastRun | (leave empty) |
| nextRun | (leave empty) |

### Daily at 9 AM UTC

| Column | Value |
|--------|-------|
| id | `550e8400-e29b-41d4-a716-446655440002` |
| name | Daily Morning Report |
| queue | reports |
| cronExpression | daily-09:00 |
| payload | `{"url":"https://httpbin.org/post","method":"POST","body":{"report":"daily"}}` |
| enabled | TRUE |
| lastRun | (leave empty) |
| nextRun | (leave empty) |

### Hourly Job

| Column | Value |
|--------|-------|
| id | `550e8400-e29b-41d4-a716-446655440003` |
| name | Hourly Sync |
| queue | sync |
| cronExpression | every-1-hours |
| payload | `{"url":"https://httpbin.org/post","method":"POST","body":{"sync":"hourly"}}` |
| enabled | TRUE |
| lastRun | (leave empty) |
| nextRun | (leave empty) |

## Test Webhook Targets

### 1. httpbin.org
Perfect for testing - echoes back your request.

```
POST https://httpbin.org/post
GET https://httpbin.org/get
PUT https://httpbin.org/put
DELETE https://httpbin.org/delete
```

### 2. webhook.site
Create a unique URL to capture webhooks.

1. Go to https://webhook.site
2. Copy your unique URL
3. Use it as the job URL
4. View incoming requests in real-time

### 3. requestbin.com
Another webhook testing service.

1. Go to https://requestbin.com
2. Create a bin
3. Use the URL in your jobs

## Testing Retry Logic

### Force a Failed Job

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/status/500",
      "method": "GET",
      "maxRetries": 3
    }
  }'
```

This job will fail (500 error) and automatically retry 3 times with exponential backoff.

### Test Dead Letter Queue

Create a job that will always fail:

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/status/404",
      "method": "GET",
      "maxRetries": 2
    }
  }'
```

After 2 retries, it should move to the dead letter queue (status: "dead").

## Testing Different HTTP Methods

### GET Request

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/get?test=true",
      "method": "GET"
    }
  }'
```

### POST with Headers

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/post",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer test-token",
        "X-Custom-Header": "custom-value"
      },
      "body": {
        "userId": 123,
        "action": "create"
      }
    }
  }'
```

### PUT Request

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/put",
      "method": "PUT",
      "body": {
        "id": 1,
        "name": "Updated Name"
      }
    }
  }'
```

### DELETE Request

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/delete",
      "method": "DELETE"
    }
  }'
```

## Performance Testing

### Create Multiple Jobs

```bash
for i in {1..10}; do
  curl -X POST "YOUR_APPS_SCRIPT_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"createJob\",
      \"data\": {
        \"queue\": \"batch\",
        \"type\": \"immediate\",
        \"url\": \"https://httpbin.org/post\",
        \"method\": \"POST\",
        \"body\": {
          \"batch\": $i
        }
      }
    }"
  echo "Created job $i"
done
```

### Test Priority

```bash
# High priority (10)
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/post",
      "method": "POST",
      "body": {"priority": "high"},
      "priority": 10
    }
  }'

# Low priority (1)
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createJob",
    "data": {
      "queue": "default",
      "type": "immediate",
      "url": "https://httpbin.org/post",
      "method": "POST",
      "body": {"priority": "low"},
      "priority": 1
    }
  }'
```

## Monitoring

### Check Worker Status

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getWorkerStats"
  }'
```

### View Apps Script Logs

1. Open Apps Script editor
2. Click **Executions** on the left
3. Click on any execution to see logs
4. Look for `Logger.log()` output

### Check Google Sheet

1. Open your Queue sheet
2. Watch jobs change status in real-time
3. Check `lockedBy`, `lockedAt` columns during processing
4. View `lastError` column for failed jobs

## Common Issues

### Job Stuck in Pending
- Wait up to 1 minute for next trigger
- Check if queue is paused
- Verify `runAt` is not in the future

### Job Stuck in Processing
- Check Apps Script logs for errors
- Wait 5 minutes for stale lock recovery
- Verify target URL is accessible

### No Jobs Processing
- Check trigger is enabled
- View Executions log for errors
- Verify sheet name is exactly "Queue"

---

Replace `YOUR_APPS_SCRIPT_URL` with your actual Web App URL in all examples.
