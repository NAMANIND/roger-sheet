/**
 * Roger Sheet Queue Processing System
 * BullMQ-inspired queue using Google Sheets + Apps Script
 */

const QUEUE_SHEET_NAME = 'Queue';
const CRON_SHEET_NAME = 'CronJobs';
const LOCK_TIMEOUT_MS = 300000; // 5 minutes
const MAX_JOBS_PER_RUN = 50;
const REQUEST_TIMEOUT_SECONDS = 30;

// ============================================================================
// WEB APP API ENDPOINTS
// ============================================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data || {};

    const handlers = {
      createJob: handleCreateJob,
      getJobs: handleGetJobs,
      getJob: handleGetJob,
      retryJob: handleRetryJob,
      cancelJob: handleCancelJob,
      deleteJob: handleDeleteJob,
      retryFailedJobs: handleRetryFailedJobs,
      clearCompletedJobs: handleClearCompletedJobs,
      getQueues: handleGetQueues,
      getQueueStats: handleGetQueueStats,
      pauseQueue: handlePauseQueue,
      resumeQueue: handleResumeQueue,
      getWorkerStats: handleGetWorkerStats,
      getCronJobs: handleGetCronJobs,
      createCronJob: handleCreateCronJob,
      deleteCronJob: handleDeleteCronJob,
      toggleCronJob: handleToggleCronJob,
      testJob: handleTestJob,
    };

    if (handlers[action]) {
      const result = handlers[action](data);
      return createJsonResponse(result);
    }

    return createJsonResponse({
      success: false,
      error: `Unknown action: ${action}`,
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString(),
    });
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      message: 'Roger Sheet Queue System API',
      version: '1.0.0',
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ============================================================================
// API HANDLERS
// ============================================================================

function handleCreateJob(data) {
  Logger.log('=== handleCreateJob ===');
  Logger.log('Received data: ' + JSON.stringify(data));
  
  const sheet = getOrCreateSheet(QUEUE_SHEET_NAME);
  ensureHeaders(sheet);

  const payloadObj = {
    url: data.url,
    method: data.method || 'POST',
    headers: data.headers || {},
    body: data.body || null,
  };
  
  Logger.log('Payload object: ' + JSON.stringify(payloadObj));
  
  const payloadString = JSON.stringify(payloadObj);
  Logger.log('Payload string: ' + payloadString);
  Logger.log('Payload string type: ' + typeof payloadString);

  const job = {
    id: generateUUID(),
    queue: data.queue || 'default',
    type: data.type || 'immediate',
    payload: payloadString,
    status: 'pending',
    priority: data.priority || 5,
    retryCount: 0,
    maxRetries: data.maxRetries || 3,
    runAt: data.runAt || new Date().toISOString(),
    lockedBy: null,
    lockedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastError: null,
    completedAt: null,
  };
  
  Logger.log('Job payload before append: ' + job.payload);

  appendJob(sheet, job);
  
  Logger.log('Job appended to sheet');

  const responseJob = {
    ...job,
    payload: payloadObj
  };

  return {
    success: true,
    data: responseJob,
    message: 'Job created successfully',
  };
}

function handleGetJobs(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: true, data: [] };
  }

  const jobs = getAllJobs(sheet);
  let filtered = jobs;

  if (data.status) {
    filtered = filtered.filter((j) => j.status === data.status);
  }
  if (data.queue) {
    filtered = filtered.filter((j) => j.queue === data.queue);
  }
  if (data.type) {
    filtered = filtered.filter((j) => j.type === data.type);
  }
  if (data.search) {
    const search = data.search.toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.payload.toLowerCase().includes(search) ||
        j.id.toLowerCase().includes(search)
    );
  }

  return { success: true, data: filtered };
}

function handleGetJob(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }

  const job = findJobById(sheet, data.id);
  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  return { success: true, data: job };
}

function handleRetryJob(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }

  const jobData = findJobById(sheet, data.id);
  if (!jobData) {
    return { success: false, error: 'Job not found' };
  }

  updateJobFields(sheet, data.id, {
    status: 'pending',
    retryCount: 0,
    runAt: new Date().toISOString(),
    lockedBy: null,
    lockedAt: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  });

  const updatedJob = findJobById(sheet, data.id);
  return { success: true, data: updatedJob };
}

function handleCancelJob(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }

  updateJobFields(sheet, data.id, {
    status: 'dead',
    updatedAt: new Date().toISOString(),
  });

  const updatedJob = findJobById(sheet, data.id);
  return { success: true, data: updatedJob };
}

function handleDeleteJob(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }

  deleteJobById(sheet, data.id);
  return { success: true, message: 'Job deleted' };
}

function handleRetryFailedJobs(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: true, data: { count: 0 } };
  }

  const jobs = getAllJobs(sheet);
  let count = 0;

  jobs.forEach((job) => {
    if ((job.status === 'failed' || job.status === 'dead') && 
        (!data.queue || job.queue === data.queue)) {
      updateJobFields(sheet, job.id, {
        status: 'pending',
        retryCount: 0,
        runAt: new Date().toISOString(),
        lockedBy: null,
        lockedAt: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
      });
      count++;
    }
  });

  return { success: true, data: { count } };
}

function handleClearCompletedJobs(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: true, data: { count: 0 } };
  }

  const jobs = getAllJobs(sheet);
  let count = 0;

  jobs.forEach((job) => {
    if (job.status === 'completed' && (!data.queue || job.queue === data.queue)) {
      deleteJobById(sheet, job.id);
      count++;
    }
  });

  return { success: true, data: { count } };
}

function handleGetQueues(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: true, data: [] };
  }

  const jobs = getAllJobs(sheet);
  const queueMap = {};

  jobs.forEach((job) => {
    if (!queueMap[job.queue]) {
      queueMap[job.queue] = {
        name: job.queue,
        isPaused: isQueuePaused(job.queue),
        jobCounts: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          dead: 0,
        },
      };
    }

    const status = job.status;
    if (queueMap[job.queue].jobCounts.hasOwnProperty(status)) {
      queueMap[job.queue].jobCounts[status]++;
    }
  });

  const queues = Object.values(queueMap);
  return { success: true, data: queues };
}

function handleGetQueueStats(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: true, data: [] };
  }

  const jobs = getAllJobs(sheet);
  const queueMap = {};

  jobs.forEach((job) => {
    if (!queueMap[job.queue]) {
      queueMap[job.queue] = {
        name: job.queue,
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        dead: 0,
        isPaused: isQueuePaused(job.queue),
      };
    }

    queueMap[job.queue].total++;
    const status = job.status;
    if (queueMap[job.queue].hasOwnProperty(status)) {
      queueMap[job.queue][status]++;
    }
  });

  let stats = Object.values(queueMap);
  if (data.queueName) {
    stats = stats.filter((s) => s.name === data.queueName);
  }

  return { success: true, data: stats };
}

function handlePauseQueue(data) {
  setQueuePaused(data.queueName, true);
  return { success: true, message: `Queue ${data.queueName} paused` };
}

function handleResumeQueue(data) {
  setQueuePaused(data.queueName, false);
  return { success: true, message: `Queue ${data.queueName} resumed` };
}

function handleGetWorkerStats(data) {
  const props = PropertiesService.getScriptProperties();
  const lastRun = props.getProperty('lastWorkerRun');
  const totalProcessed = parseInt(props.getProperty('totalProcessed') || '0');

  return {
    success: true,
    data: {
      lastRun: lastRun,
      totalProcessed: totalProcessed,
      isRunning: false,
    },
  };
}

function handleGetCronJobs(data) {
  const sheet = getSheet(CRON_SHEET_NAME);
  if (!sheet) {
    return { success: true, data: [] };
  }

  const cronJobs = getAllCronJobs(sheet);
  return { success: true, data: cronJobs };
}

function handleCreateCronJob(data) {
  const sheet = getOrCreateSheet(CRON_SHEET_NAME);
  ensureCronHeaders(sheet);

  const cronJob = {
    id: generateUUID(),
    name: data.name,
    queue: data.queue || 'default',
    cronExpression: data.cronExpression,
    payload: JSON.stringify({
      url: data.url,
      method: data.method || 'POST',
      headers: data.headers || {},
      body: data.body || null,
    }),
    enabled: true,
    lastRun: null,
    nextRun: null,
  };

  appendCronJob(sheet, cronJob);

  return {
    success: true,
    data: cronJob,
    message: 'Cron job created successfully',
  };
}

function handleDeleteCronJob(data) {
  const sheet = getSheet(CRON_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'CronJobs sheet not found' };
  }

  deleteCronJobById(sheet, data.id);
  return { success: true, message: 'Cron job deleted' };
}

function handleToggleCronJob(data) {
  const sheet = getSheet(CRON_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'CronJobs sheet not found' };
  }

  toggleCronJobById(sheet, data.id, data.enabled);
  const cronJob = findCronJobById(sheet, data.id);
  return { success: true, data: cronJob };
}

function handleTestJob(data) {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }

  const originalJob = findJobById(sheet, data.id);
  if (!originalJob) {
    return { success: false, error: 'Job not found' };
  }

  Logger.log('Testing job ' + data.id);
  
  try {
    const payload = typeof originalJob.payload === 'string' 
      ? JSON.parse(originalJob.payload) 
      : originalJob.payload;
    
    Logger.log('Payload: ' + JSON.stringify(payload));
    
    const options = {
      method: payload.method,
      headers: payload.headers || {},
      muteHttpExceptions: true,
    };

    if (payload.body && payload.method !== 'GET') {
      options.payload = JSON.stringify(payload.body);
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    Logger.log('Fetching URL: ' + payload.url);
    const response = UrlFetchApp.fetch(payload.url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('Response status: ' + statusCode);
    Logger.log('Response body: ' + responseText.substring(0, 500));

    return {
      success: statusCode >= 200 && statusCode < 400,
      data: {
        statusCode: statusCode,
        statusText: response.getResponseCode() + ' ' + 
          (statusCode >= 200 && statusCode < 300 ? 'OK' : 
           statusCode >= 300 && statusCode < 400 ? 'Redirect' :
           statusCode >= 400 && statusCode < 500 ? 'Client Error' :
           'Server Error'),
        responseBody: responseText.substring(0, 1000),
        executedAt: new Date().toISOString(),
      },
      message: statusCode >= 200 && statusCode < 400 
        ? 'Test successful' 
        : 'Test failed with HTTP ' + statusCode,
    };
  } catch (error) {
    Logger.log('Test error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: 'Test failed: ' + error.toString(),
    };
  }
}

// ============================================================================
// WORKER / PROCESSOR (Triggered every minute)
// ============================================================================

function processQueue() {
  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(30000)) {
      Logger.log('Could not acquire lock, another process is running');
      return;
    }
  } catch (e) {
    Logger.log('Lock acquisition failed: ' + e.toString());
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('lastWorkerRun', new Date().toISOString());

    recoverStaleLocks();
    scheduleCronJobs();
    processEligibleJobs();

    const totalProcessed = parseInt(props.getProperty('totalProcessed') || '0');
    props.setProperty('totalProcessed', (totalProcessed + 1).toString());
  } catch (error) {
    Logger.log('Error in processQueue: ' + error.toString());
  } finally {
    lock.releaseLock();
  }
}

function processEligibleJobs() {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) {
    Logger.log('Queue sheet not found');
    return;
  }

  const jobs = getEligibleJobs(sheet);
  Logger.log(`Found ${jobs.length} eligible jobs`);

  jobs.slice(0, MAX_JOBS_PER_RUN).forEach((job) => {
    if (isQueuePaused(job.queue)) {
      Logger.log(`Queue ${job.queue} is paused, skipping job ${job.id}`);
      return;
    }

    executeJob(sheet, job);
  });
}

function getEligibleJobs(sheet) {
  const jobs = getAllJobs(sheet);
  const now = new Date().getTime();

  return jobs
    .filter((job) => {
      return (
        job.status === 'pending' &&
        !job.lockedBy &&
        new Date(job.runAt).getTime() <= now
      );
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

function executeJob(sheet, job) {
  const executionId = generateUUID();
  const now = new Date().toISOString();

  updateJobFields(sheet, job.id, {
    status: 'processing',
    lockedBy: executionId,
    lockedAt: now,
    updatedAt: now,
  });

  Logger.log(`Executing job ${job.id}`);

  try {
    // job.payload is already an object from rowToJob, no need to parse
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    
    Logger.log(`Payload: ${JSON.stringify(payload)}`);
    Logger.log(`URL: ${payload.url}`);
    Logger.log(`Method: ${payload.method}`);
    
    const options = {
      method: payload.method,
      headers: payload.headers || {},
      muteHttpExceptions: true,
    };

    if (payload.body && payload.method !== 'GET') {
      options.payload = JSON.stringify(payload.body);
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    Logger.log(`Fetching URL: ${payload.url}`);
    const response = UrlFetchApp.fetch(payload.url, options);
    const statusCode = response.getResponseCode();
    Logger.log(`Response status: ${statusCode}`);

    if (statusCode >= 200 && statusCode < 400) {
      updateJobFields(sheet, job.id, {
        status: 'completed',
        lockedBy: null,
        lockedAt: null,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      Logger.log(`Job ${job.id} completed successfully`);
    } else {
      handleJobFailure(
        sheet,
        job,
        `HTTP ${statusCode}: ${response.getContentText().substring(0, 200)}`
      );
    }
  } catch (error) {
    Logger.log(`Job execution error: ${error.toString()}`);
    handleJobFailure(sheet, job, error.toString());
  }
}

function handleJobFailure(sheet, job, errorMessage) {
  const newRetryCount = job.retryCount + 1;

  if (newRetryCount < job.maxRetries) {
    const delayMinutes = Math.pow(2, newRetryCount);
    const runAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    updateJobFields(sheet, job.id, {
      status: 'pending',
      retryCount: newRetryCount,
      runAt: runAt,
      lockedBy: null,
      lockedAt: null,
      lastError: errorMessage,
      updatedAt: new Date().toISOString(),
    });

    Logger.log(`Job ${job.id} failed, will retry in ${delayMinutes} minutes`);
  } else {
    updateJobFields(sheet, job.id, {
      status: 'dead',
      retryCount: newRetryCount,
      lockedBy: null,
      lockedAt: null,
      lastError: errorMessage,
      updatedAt: new Date().toISOString(),
    });

    Logger.log(`Job ${job.id} moved to dead letter queue`);
  }
}

function recoverStaleLocks() {
  const sheet = getSheet(QUEUE_SHEET_NAME);
  if (!sheet) return;

  const jobs = getAllJobs(sheet);
  const now = Date.now();

  jobs.forEach((job) => {
    if (job.lockedBy && job.lockedAt) {
      const lockAge = now - new Date(job.lockedAt).getTime();
      if (lockAge > LOCK_TIMEOUT_MS) {
        Logger.log(`Recovering stale lock for job ${job.id}`);
        updateJobFields(sheet, job.id, {
          status: 'pending',
          lockedBy: null,
          lockedAt: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });
}

// ============================================================================
// CRON JOB SCHEDULER
// ============================================================================

function scheduleCronJobs() {
  const cronSheet = getSheet(CRON_SHEET_NAME);
  if (!cronSheet) return;

  const cronJobs = getAllCronJobs(cronSheet);
  const now = new Date();

  cronJobs.forEach((cronJob) => {
    if (!cronJob.enabled) return;

    const nextRun = cronJob.nextRun ? new Date(cronJob.nextRun) : null;
    if (!nextRun || now >= nextRun) {
      createJobFromCron(cronJob);
      updateCronJobNextRun(cronSheet, cronJob);
    }
  });
}

function createJobFromCron(cronJob) {
  const sheet = getOrCreateSheet(QUEUE_SHEET_NAME);
  ensureHeaders(sheet);

  const job = {
    id: generateUUID(),
    queue: cronJob.queue,
    type: 'cron',
    payload: cronJob.payload,
    status: 'pending',
    priority: 5,
    retryCount: 0,
    maxRetries: 3,
    runAt: new Date().toISOString(),
    lockedBy: null,
    lockedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastError: null,
    completedAt: null,
  };

  appendJob(sheet, job);
  Logger.log(`Created job from cron ${cronJob.name}`);
}

function updateCronJobNextRun(sheet, cronJob) {
  const nextRun = calculateNextRun(cronJob.cronExpression);
  const rowIndex = findCronJobRowIndex(sheet, cronJob.id);

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 7).setValue(new Date().toISOString());
    sheet.getRange(rowIndex, 8).setValue(nextRun.toISOString());
  }
}

function calculateNextRun(cronExpression) {
  const now = new Date();
  const parts = cronExpression.split('-');

  if (parts[0] === 'every' && parts[2] === 'minutes') {
    const minutes = parseInt(parts[1]);
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  if (parts[0] === 'every' && parts[2] === 'hours') {
    const hours = parseInt(parts[1]);
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  if (parts[0] === 'daily') {
    const timeParts = parts[1].split(':');
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    const next = new Date(now);
    next.setUTCHours(hour, minute, 0, 0);

    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    return next;
  }

  return new Date(now.getTime() + 60 * 60 * 1000);
}

function getAllCronJobs(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const jobs = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    jobs.push({
      id: row[0],
      name: row[1],
      queue: row[2],
      cronExpression: row[3],
      payload: row[4],
      enabled: row[5],
      lastRun: row[6] || null,
      nextRun: row[7] || null,
    });
  }

  return jobs;
}

function findCronJobRowIndex(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return i + 1;
    }
  }
  return -1;
}

// ============================================================================
// SHEET HELPERS
// ============================================================================

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getOrCreateSheet(name) {
  let sheet = getSheet(name);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(name);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      'id',
      'queue',
      'type',
      'payload',
      'status',
      'priority',
      'retryCount',
      'maxRetries',
      'runAt',
      'lockedBy',
      'lockedAt',
      'createdAt',
      'updatedAt',
      'lastError',
      'completedAt',
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function getAllJobs(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const jobs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    jobs.push(rowToJob(row));
  }

  return jobs;
}

function rowToJob(row) {
  let payload;
  try {
    if (typeof row[3] === 'string') {
      if (row[3] === '[object Object]' || row[3] === '') {
        payload = { url: '', method: 'GET', headers: {}, body: null };
      } else {
        payload = JSON.parse(row[3]);
      }
    } else if (typeof row[3] === 'object') {
      payload = row[3];
    } else {
      payload = { url: '', method: 'GET', headers: {}, body: null };
    }
  } catch (e) {
    Logger.log('Error parsing payload for job ' + row[0] + ': ' + e.toString());
    payload = { url: '', method: 'GET', headers: {}, body: null };
  }

  return {
    id: row[0],
    queue: row[1],
    type: row[2],
    payload: payload,
    status: row[4],
    priority: row[5],
    retryCount: row[6],
    maxRetries: row[7],
    runAt: row[8],
    lockedBy: row[9] || null,
    lockedAt: row[10] || null,
    createdAt: row[11],
    updatedAt: row[12],
    lastError: row[13] || null,
    completedAt: row[14] || null,
  };
}

function appendJob(sheet, job) {
  Logger.log('=== appendJob ===');
  Logger.log('Payload being appended: ' + job.payload);
  Logger.log('Payload type: ' + typeof job.payload);
  
  const row = [
    job.id,
    job.queue,
    job.type,
    job.payload,
    job.status,
    job.priority,
    job.retryCount,
    job.maxRetries,
    job.runAt,
    job.lockedBy,
    job.lockedAt,
    job.createdAt,
    job.updatedAt,
    job.lastError,
    job.completedAt,
  ];
  
  Logger.log('Row data: ' + JSON.stringify(row));
  sheet.appendRow(row);
  Logger.log('Row appended successfully');
}

function findJobById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return rowToJob(data[i]);
    }
  }
  return null;
}

function updateJobFields(sheet, id, updates) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const rowNum = i + 1;

      if (updates.hasOwnProperty('status'))
        sheet.getRange(rowNum, 5).setValue(updates.status);
      if (updates.hasOwnProperty('retryCount'))
        sheet.getRange(rowNum, 7).setValue(updates.retryCount);
      if (updates.hasOwnProperty('runAt'))
        sheet.getRange(rowNum, 9).setValue(updates.runAt);
      if (updates.hasOwnProperty('lockedBy'))
        sheet.getRange(rowNum, 10).setValue(updates.lockedBy);
      if (updates.hasOwnProperty('lockedAt'))
        sheet.getRange(rowNum, 11).setValue(updates.lockedAt);
      if (updates.hasOwnProperty('updatedAt'))
        sheet.getRange(rowNum, 13).setValue(updates.updatedAt);
      if (updates.hasOwnProperty('lastError'))
        sheet.getRange(rowNum, 14).setValue(updates.lastError);
      if (updates.hasOwnProperty('completedAt'))
        sheet.getRange(rowNum, 15).setValue(updates.completedAt);

      break;
    }
  }
}

function deleteJobById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// ============================================================================
// QUEUE PAUSE/RESUME
// ============================================================================

function isQueuePaused(queueName) {
  const props = PropertiesService.getScriptProperties();
  const pausedQueues = props.getProperty('pausedQueues') || '[]';
  const queues = JSON.parse(pausedQueues);
  return queues.includes(queueName);
}

function setQueuePaused(queueName, paused) {
  const props = PropertiesService.getScriptProperties();
  const pausedQueues = props.getProperty('pausedQueues') || '[]';
  let queues = JSON.parse(pausedQueues);

  if (paused && !queues.includes(queueName)) {
    queues.push(queueName);
  } else if (!paused) {
    queues = queues.filter((q) => q !== queueName);
  }

  props.setProperty('pausedQueues', JSON.stringify(queues));
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateUUID() {
  return Utilities.getUuid();
}

// ============================================================================
// CRON JOB HELPERS
// ============================================================================

function ensureCronHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      'id',
      'name',
      'queue',
      'cronExpression',
      'payload',
      'enabled',
      'lastRun',
      'nextRun',
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function appendCronJob(sheet, cronJob) {
  sheet.appendRow([
    cronJob.id,
    cronJob.name,
    cronJob.queue,
    cronJob.cronExpression,
    cronJob.payload,
    cronJob.enabled,
    cronJob.lastRun,
    cronJob.nextRun,
  ]);
}

function findCronJobById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return {
        id: data[i][0],
        name: data[i][1],
        queue: data[i][2],
        cronExpression: data[i][3],
        payload: data[i][4],
        enabled: data[i][5],
        lastRun: data[i][6] || null,
        nextRun: data[i][7] || null,
      };
    }
  }
  return null;
}

function deleteCronJobById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function toggleCronJobById(sheet, id, enabled) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const rowNum = i + 1;
      sheet.getRange(rowNum, 6).setValue(enabled);
      break;
    }
  }
}
