# Cron Jobs Guide

## How Cron Jobs Work in Roger Sheet

### The Concept

Think of a cron job as a **recurring template** that automatically creates new jobs at scheduled intervals.

```
┌─────────────────┐
│  Cron Job       │ ← Lives forever in CronJobs sheet
│  (Template)     │
└────────┬────────┘
         │ Creates new job every minute
         ├──→ Job 1 (executed, completed)
         ├──→ Job 2 (executed, completed)  
         ├──→ Job 3 (executed, completed)
         └──→ Job 4 (waiting...)
```

### Step-by-Step Flow

1. **You create a cron job** in the `CronJobs` sheet
2. **Worker checks every minute**: "Is it time to create a new job?"
3. **If yes**: Creates a **new regular job** in the `Queue` sheet
4. **That new job gets processed** and shows as "completed"
5. **Cron job updates** `nextRun` time and waits
6. **Repeat** forever (until you disable it)

### What You See

**In Jobs List:**
- Multiple completed jobs created by your cron
- Each one is a separate execution
- They all have the same payload

**In CronJobs Sheet:**
- Your cron job definition
- `lastRun` - when it last created a job
- `nextRun` - when it will create the next one

**On Dashboard** (NEW!):
- "Scheduled Jobs" card showing upcoming cron jobs
- Next run time displayed as "in 1m", "in 5m", etc.

## Creating a Cron Job

### 1. Open Your Google Sheet

Go to the `CronJobs` tab (create it if it doesn't exist)

### 2. Add Headers (if first time)

```
id | name | queue | cronExpression | payload | enabled | lastRun | nextRun
```

### 3. Add Your Cron Job

| Column | Example Value | Description |
|--------|--------------|-------------|
| id | `550e8400-e29b-41d4-a716-446655440000` | UUID (generate at uuidgenerator.net) |
| name | `Health Check Every Minute` | Descriptive name |
| queue | `default` | Queue name |
| cronExpression | `every-1-minutes` | Schedule pattern |
| payload | `{"url":"https://example.com/health","method":"GET"}` | JSON with url, method, headers, body |
| enabled | `TRUE` | TRUE to run, FALSE to pause |
| lastRun | (leave empty) | Auto-filled by system |
| nextRun | (leave empty) | Auto-calculated by system |

### 4. Wait & Watch

- Within 1 minute, the system will:
  - Fill in `lastRun` and `nextRun`
  - Create first job in Queue sheet
  - Execute it
- Check dashboard to see "in Xm" for next run

## Cron Expression Patterns

### Every X Minutes

```
every-1-minutes   → Runs every 1 minute
every-5-minutes   → Runs every 5 minutes
every-15-minutes  → Runs every 15 minutes
every-30-minutes  → Runs every 30 minutes
```

### Every X Hours

```
every-1-hours → Runs every 1 hour
every-2-hours → Runs every 2 hours
every-6-hours → Runs every 6 hours
every-12-hours → Runs every 12 hours
```

### Daily at Specific Time (UTC)

```
daily-00:00 → Runs every day at midnight UTC
daily-09:00 → Runs every day at 9 AM UTC
daily-14:30 → Runs every day at 2:30 PM UTC
daily-23:59 → Runs every day at 11:59 PM UTC
```

## Example Cron Jobs

### 1. Health Check Every Minute

```
id: 550e8400-e29b-41d4-a716-446655440001
name: API Health Check
queue: monitoring
cronExpression: every-1-minutes
payload: {"url":"https://api.example.com/health","method":"GET"}
enabled: TRUE
```

### 2. Daily Report at 9 AM

```
id: 550e8400-e29b-41d4-a716-446655440002
name: Daily Sales Report
queue: reports
cronExpression: daily-09:00
payload: {"url":"https://api.example.com/reports/daily","method":"POST","body":{"type":"sales"}}
enabled: TRUE
```

### 3. Sync Every 15 Minutes

```
id: 550e8400-e29b-41d4-a716-446655440003
name: Database Sync
queue: sync
cronExpression: every-15-minutes
payload: {"url":"https://api.example.com/sync","method":"POST"}
enabled: TRUE
```

## Managing Cron Jobs

### Pause a Cron Job

1. Open `CronJobs` sheet
2. Find your cron job row
3. Change `enabled` from `TRUE` to `FALSE`
4. It will stop creating new jobs

### Resume a Cron Job

1. Change `enabled` from `FALSE` to `TRUE`
2. System will recalculate `nextRun`
3. Starts creating jobs again

### Delete a Cron Job

1. Delete the entire row from `CronJobs` sheet
2. Existing completed jobs remain in history
3. No new jobs will be created

### Modify Schedule

1. Edit the `cronExpression` value
2. The change takes effect on next trigger
3. `nextRun` will be recalculated

## Viewing Cron Jobs

### On Dashboard

- Shows next 5 upcoming cron jobs
- Displays "next run" time (e.g., "in 2m")
- Only shows enabled crons

### In Google Sheet

- Open `CronJobs` tab
- See all crons (enabled and disabled)
- Check `lastRun` and `nextRun` timestamps

### Execution History

- Go to Jobs page in UI
- Filter by your cron's queue
- See all executions marked as "completed"
- Each execution is timestamped

## Troubleshooting

### Cron Job Not Running

**Check:**
1. Is `enabled` set to `TRUE`?
2. Is the trigger running? (Apps Script → Executions)
3. Is the queue paused? (Queues page)
4. Check Apps Script logs for errors

### NextRun Not Updating

- Wait for next trigger execution (every minute)
- Check Apps Script logs for `scheduleCronJobs` function
- Verify `cronExpression` format is correct

### Jobs Running Multiple Times

- This is normal if you have multiple cron jobs
- Each cron creates its own jobs
- Check `CronJobs` sheet to see all active crons

### Jobs Not Executing (Staying Pending)

- This is a worker issue, not cron issue
- Check the main queue processing
- See main troubleshooting guide

## Best Practices

### 1. Use Descriptive Names

```
✅ Good: "User Email Digest - Daily 8AM"
❌ Bad: "Job 1"
```

### 2. Group by Queue

```
monitoring queue → health checks, uptime pings
reports queue → daily/weekly reports
sync queue → data synchronization
```

### 3. Don't Over-Schedule

- Avoid `every-1-minutes` unless necessary
- Consider server load and quota limits
- Use longer intervals when possible

### 4. Test First

1. Create cron with `every-1-minutes`
2. Watch it run 2-3 times
3. Verify it works
4. Change to desired schedule

### 5. Monitor Execution

- Check dashboard regularly
- Review completed jobs
- Watch for failures

## Quota Considerations

**Google Apps Script Free Tier:**
- 90 minutes runtime per day
- 20,000 URL fetch calls per day

**Example:**
- Cron runs every 1 minute
- 1,440 executions per day
- Well within limits ✅

**Heavy Usage:**
- Multiple crons every minute
- Long-running HTTP requests
- May need Google Workspace

## Advanced Tips

### Dynamic Payloads

You can't use variables in payload, but you can:
- Use multiple crons for different configs
- Have server handle dynamic data

### Conditional Execution

Cron always creates jobs, but you can:
- Add logic in your API to skip if not needed
- Use queue pausing to control execution

### Monitoring

Set up a cron to POST to your monitoring service:
```json
{
  "url": "https://cronitor.io/YOUR_ID",
  "method": "GET"
}
```

---

**Summary:** Cron jobs are recurring templates that automatically create and execute jobs at scheduled intervals. Each execution shows as a completed job, while the cron definition lives forever in the CronJobs sheet.
