# Script-Based Job Execution

The Roger Sheet Queue System now supports **script-based execution**, allowing you to define the entire job logic as custom JavaScript code instead of just a single HTTP request.

## Overview

Instead of configuring a job with a single API endpoint, you can now write a complete JavaScript function that:
- Makes multiple API calls in sequence
- Performs data transformations and computations
- Implements conditional logic
- Queues additional jobs
- Accesses persistent storage

## Execution Modes

### Script Execution
Write custom JavaScript that defines the entire job logic. The script runs in a sandboxed environment with access to helper functions.

### HTTP Request (Legacy)
Traditional mode where you configure a single HTTP request with URL, method, headers, and body.

## Available Helper Functions

Your script has access to these built-in functions:

### `fetch(url, options)`
Make HTTP requests to any API endpoint.

**Parameters:**
- `url` (string): The URL to fetch
- `options` (object):
  - `method` (string): HTTP method (GET, POST, PUT, DELETE, PATCH)
  - `headers` (object): Request headers
  - `body` (string | object): Request body

**Returns:**
```javascript
{
  status: 200,
  statusText: 'OK',
  body: '{"result": "success"}',
  headers: { ... }
}
```

**Example:**
```javascript
const response = fetch('https://api.example.com/users', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token123' }
});

log('Status: ' + response.status);
const data = parseJSON(response.body);
```

### `log(message)`
Log messages for debugging and monitoring.

**Parameters:**
- `message` (any): Message to log (objects will be stringified)

**Example:**
```javascript
log('Starting job execution');
log({ step: 1, status: 'processing' });
```

### `createJob(jobData)`
Queue a new job from within your script.

**Parameters:**
- `jobData` (object):
  - `queue` (string): Queue name
  - `type` (string): Job type (immediate, delayed, cron)
  - `script` (string): JavaScript code (for script jobs)
  - `url`, `method`, `headers`, `body` (for HTTP jobs)
  - `priority` (number): 1-10
  - `maxRetries` (number): Retry count
  - `runAt` (string): ISO date string for delayed jobs

**Returns:**
```javascript
{ id: 'uuid-of-new-job' }
```

**Example:**
```javascript
createJob({
  queue: 'notifications',
  type: 'immediate',
  script: `
    const result = fetch('https://api.example.com/notify', {
      method: 'POST',
      body: stringifyJSON({ message: 'Hello' })
    });
    return result;
  `
});
```

### `parseJSON(str)`
Parse a JSON string into an object.

**Example:**
```javascript
const data = parseJSON('{"name": "John", "age": 30}');
log(data.name); // "John"
```

### `stringifyJSON(obj)`
Convert an object to a JSON string.

**Example:**
```javascript
const json = stringifyJSON({ status: 'ok', count: 42 });
// Returns: '{"status":"ok","count":42}'
```

### `getProperty(key)`
Retrieve a stored property value.

**Example:**
```javascript
const apiKey = getProperty('API_KEY');
const lastRun = getProperty('last_sync_timestamp');
```

### `setProperty(key, value)`
Store a property value persistently.

**Example:**
```javascript
setProperty('last_sync_timestamp', new Date().toISOString());
setProperty('total_processed', '1234');
```

### `sleep(ms)`
Pause execution for a specified duration.

**Parameters:**
- `ms` (number): Milliseconds to sleep

**Example:**
```javascript
log('Starting process...');
sleep(2000); // Wait 2 seconds
log('Continuing...');
```

## Script Examples

### Example 1: Email Validation with Notification

```javascript
// Validate email address
const emailResponse = fetch('https://vemail.vercel.app/validate?email=user@example.com', {
  method: 'GET'
});

log('Validation status: ' + emailResponse.status);
const validation = parseJSON(emailResponse.body);

// If valid, send notification
if (validation.valid) {
  const notifyResponse = fetch('https://api.example.com/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: stringifyJSON({
      email: 'user@example.com',
      status: 'validated',
      timestamp: new Date().toISOString()
    })
  });
  
  log('Notification sent: ' + notifyResponse.status);
}

return { 
  success: true, 
  emailValid: validation.valid 
};
```

### Example 2: Multi-Step Data Processing

```javascript
// Step 1: Fetch data from source
const sourceResponse = fetch('https://api.source.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + getProperty('SOURCE_API_KEY') }
});

const sourceData = parseJSON(sourceResponse.body);
log('Fetched ' + sourceData.items.length + ' items');

// Step 2: Transform data
const transformed = sourceData.items.map(item => ({
  id: item.id,
  name: item.name.toUpperCase(),
  processed: true
}));

// Step 3: Send to destination
const destResponse = fetch('https://api.destination.com/import', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getProperty('DEST_API_KEY')
  },
  body: stringifyJSON({ items: transformed })
});

log('Import status: ' + destResponse.status);

// Step 4: Update sync timestamp
setProperty('last_sync', new Date().toISOString());

return { 
  success: true, 
  itemsProcessed: transformed.length 
};
```

### Example 3: Conditional Job Chaining

```javascript
// Check API health
const healthResponse = fetch('https://api.example.com/health', {
  method: 'GET'
});

const health = parseJSON(healthResponse.body);
log('API health: ' + health.status);

if (health.status === 'degraded') {
  // Queue a notification job
  createJob({
    queue: 'alerts',
    type: 'immediate',
    script: `
      fetch('https://alerts.example.com/webhook', {
        method: 'POST',
        body: stringifyJSON({ 
          alert: 'API degraded',
          timestamp: new Date().toISOString()
        })
      });
    `
  });
  
  // Schedule a retry in 5 minutes
  const retryDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  createJob({
    queue: 'default',
    type: 'delayed',
    runAt: retryDate,
    script: `
      // Re-check health
      const response = fetch('https://api.example.com/health', { method: 'GET' });
      log('Retry check: ' + response.status);
    `
  });
}

return { 
  success: true, 
  healthStatus: health.status 
};
```

### Example 4: Batch Processing with Rate Limiting

```javascript
// Fetch items to process
const itemsResponse = fetch('https://api.example.com/pending-items', {
  method: 'GET'
});

const items = parseJSON(itemsResponse.body);
log('Processing ' + items.length + ' items');

// Process each item with delay
items.forEach((item, index) => {
  const processResponse = fetch('https://api.example.com/process', {
    method: 'POST',
    body: stringifyJSON({ itemId: item.id })
  });
  
  log('Processed item ' + item.id + ': ' + processResponse.status);
  
  // Rate limiting: wait 500ms between requests
  if (index < items.length - 1) {
    sleep(500);
  }
});

return { 
  success: true, 
  itemsProcessed: items.length 
};
```

## Testing Scripts

Use the **Test Now** button on the job details page to execute your script immediately and see the results:

- **Script Result**: The return value of your script
- **Script Logs**: All messages logged with `log()`
- **API Calls**: Summary of all `fetch()` calls made
- **Dry Run**: `createJob()` calls are logged but not actually executed during tests

## Security Notes

1. **Script Execution**: Scripts run in Apps Script's environment, not in a browser
2. **No Access to**: DOM, window, document, or browser APIs
3. **Sandboxed**: Each script runs in isolation
4. **Properties**: `getProperty()` and `setProperty()` access script-level storage (shared across all jobs)

## Migration from HTTP Jobs

To convert an HTTP job to a script:

**Before (HTTP mode):**
```
URL: https://api.example.com/webhook
Method: POST
Body: {"key": "value"}
```

**After (Script mode):**
```javascript
const response = fetch('https://api.example.com/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: stringifyJSON({ key: 'value' })
});

log('Response: ' + response.status);
return { success: response.status === 200 };
```

## Best Practices

1. **Always log**: Use `log()` liberally for debugging
2. **Error handling**: Check response statuses before parsing
3. **Return values**: Return an object summarizing the script's outcome
4. **Rate limiting**: Use `sleep()` between API calls if needed
5. **Credentials**: Store API keys with `setProperty()`, retrieve with `getProperty()`
6. **Idempotency**: Design scripts to handle retries gracefully

## Limitations

- Maximum script execution time: ~6 minutes (Apps Script limit)
- `sleep()` is capped at 5 seconds in test mode
- No external npm packages or imports
- No file system access
- No async/await (use synchronous style)
