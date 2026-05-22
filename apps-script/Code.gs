/**
 * Roger Sheet - Automated Job Queue
 * Pipelines → Queue (jobs reference Actions) → Trigger → History
 *
 * Sheets:
 *   Guide      - README, visible first
 *   Pipelines  - Named pipelines with pause control      (was: Queues)
 *   Actions    - Reusable handler definitions             (was: Processors)
 *   Queue      - Live work: waiting / active / delayed   (was: Jobs)
 *   Schedules  - Recurring job templates                 (was: Repeatable)
 *   History    - Completed / failed job archive          (was: JobsGraveyard)
 */

const PIPELINES_SHEET = 'Pipelines';
const QUEUE_SHEET     = 'Queue';
const ACTIONS_SHEET   = 'Actions';
const HISTORY_SHEET   = 'History';
const SCHEDULES_SHEET = 'Schedules';
const LOCK_TIMEOUT_MS = 300000;
const MAX_JOBS_PER_RUN = 50;

// ============================================================================
// WEB APP API
// ============================================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data || {};

    const handlers = {
      // Queue operations
      createQueue: handleCreateQueue,
      getQueues: handleGetQueues,
      pauseQueue: handlePauseQueue,
      resumeQueue: handleResumeQueue,
      
      // Processor operations
      createProcessor: handleCreateProcessor,
      getProcessors: handleGetProcessors,
      getProcessor: handleGetProcessor,
      updateProcessor: handleUpdateProcessor,
      deleteProcessor: handleDeleteProcessor,
      
      // Job operations
      addJob: handleAddJob,
      getJobs: handleGetJobs,
      getJob: handleGetJob,
      retryJob: handleRetryJob,
      removeJob: handleRemoveJob,
      cleanJobs: handleCleanJobs,
      
      // Graveyard operations
      getGraveyardJobs: handleGetGraveyardJobs,
      cleanGraveyard: handleCleanGraveyard,
      
      // Repeatable operations
      addRepeatableJob: handleAddRepeatableJob,
      getRepeatableJobs: handleGetRepeatableJobs,
      removeRepeatableJob: handleRemoveRepeatableJob,
      toggleRepeatableJob: handleToggleRepeatableJob,
      
      // Stats
      getQueueStats: handleGetQueueStats,
      getWorkerStats: handleGetWorkerStats,
      
      // Test
      testProcessor: handleTestProcessor,
      testProcessorDraft: handleTestProcessorDraft,
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
      message: 'Roger Sheet — Automated Job Queue',
      version: '4.0.0',
      sheets: ['Guide', 'Pipelines', 'Actions', 'Queue', 'Schedules', 'History'],
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// PROCESSOR HANDLERS
// ============================================================================

function handleCreateProcessor(data) {
  const sheet = getOrCreateSheet(ACTIONS_SHEET);
  ensureProcessorHeaders(sheet);
  
  const existing = findProcessorByName(sheet, data.name);
  if (existing) {
    return { success: false, error: 'Processor already exists' };
  }
  
  const processor = {
    name: data.name,
    type: data.type,
    config: JSON.stringify(data.config),
    description: data.description || '',
    createdAt: new Date().toISOString(),
  };
  
  appendProcessor(sheet, processor);
  
  return {
    success: true,
    data: { ...processor, config: data.config },
    message: 'Processor created successfully',
  };
}

function handleGetProcessors(data) {
  const sheet = getSheet(ACTIONS_SHEET);
  if (!sheet) {
    return { success: true, data: [] };
  }
  
  const processors = getAllProcessors(sheet);
  return { success: true, data: processors };
}

function handleGetProcessor(data) {
  const sheet = getSheet(ACTIONS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Actions sheet not found' };
  }
  
  const processor = findProcessorByName(sheet, data.name);
  if (!processor) {
    return { success: false, error: 'Processor not found' };
  }
  
  return { success: true, data: processor };
}

function handleUpdateProcessor(data) {
  const sheet = getSheet(ACTIONS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Actions sheet not found' };
  }
  
  updateProcessor(sheet, data.name, {
    config: JSON.stringify(data.config),
    description: data.description,
  });
  
  const processor = findProcessorByName(sheet, data.name);
  return { success: true, data: processor };
}

function handleDeleteProcessor(data) {
  const sheet = getSheet(ACTIONS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Actions sheet not found' };
  }
  
  deleteProcessorByName(sheet, data.name);
  return { success: true, message: 'Processor deleted' };
}

function handleTestProcessor(data) {
  const sheet = getSheet(ACTIONS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Actions sheet not found' };
  }
  
  const processor = findProcessorByName(sheet, data.name);
  if (!processor) {
    return { success: false, error: 'Processor not found' };
  }
  
  try {
    const result = executeProcessor(processor, data.testData || {}, true);
    return {
      success: true,
      data: result,
      message: 'Test completed',
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: 'Test failed',
    };
  }
}

function handleTestProcessorDraft(data) {
  if (!data.type || !data.config) {
    return { success: false, error: 'type and config are required' };
  }

  const processor = {
    name: '__draft__',
    type: data.type,
    config: data.config,
  };

  try {
    const result = executeProcessor(processor, data.testData || {}, true);
    return {
      success: true,
      data: result,
      message: 'Test completed',
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: 'Test failed',
    };
  }
}

// ============================================================================
// JOB HANDLERS (Updated for Processors)
// ============================================================================

function handleAddJob(data) {
  const sheet = getOrCreateSheet(QUEUE_SHEET);
  ensureJobHeaders(sheet);
  
  // Verify processor exists
  const processorSheet = getSheet(ACTIONS_SHEET);
  if (processorSheet) {
    const processor = findProcessorByName(processorSheet, data.processor);
    if (!processor) {
      return { success: false, error: `Processor "${data.processor}" not found` };
    }
  }
  
  const job = {
    id: generateUUID(),
    queueName: data.queueName,
    processor: data.processor,
    data: JSON.stringify(data.data || {}),
    state: data.opts?.delay ? 'delayed' : 'waiting',
    priority: data.opts?.priority || 0,
    attempts: 0,
    maxAttempts: data.opts?.attempts || 3,
    delay: data.opts?.delay || 0,
    timestamp: new Date().toISOString(),
    processedOn: null,
    repeatJobKey: null,
  };
  
  appendJob(sheet, job);
  
  return {
    success: true,
    data: { ...job, data: data.data || {} },
    message: 'Job added successfully',
  };
}

function handleGetJobs(data) {
  const sheet = getSheet(QUEUE_SHEET);
  if (!sheet) {
    return { success: true, data: [] };
  }
  
  let jobs = getAllJobs(sheet);
  
  if (data.queueName) {
    jobs = jobs.filter(j => j.queueName === data.queueName);
  }
  if (data.state) {
    jobs = jobs.filter(j => j.state === data.state);
  }
  if (data.processor) {
    jobs = jobs.filter(j => j.processor === data.processor);
  }
  
  return { success: true, data: jobs };
}

function handleGetJob(data) {
  const sheet = getSheet(QUEUE_SHEET);
  if (!sheet) {
    // Check graveyard
    const graveyardSheet = getSheet(HISTORY_SHEET);
    if (graveyardSheet) {
      const job = findGraveyardJobById(graveyardSheet, data.id);
      if (job) {
        return { success: true, data: job, fromGraveyard: true };
      }
    }
    return { success: false, error: 'Job not found' };
  }
  
  const job = findJobById(sheet, data.id);
  if (!job) {
    // Check graveyard
    const graveyardSheet = getSheet(HISTORY_SHEET);
    if (graveyardSheet) {
      const graveyardJob = findGraveyardJobById(graveyardSheet, data.id);
      if (graveyardJob) {
        return { success: true, data: graveyardJob, fromGraveyard: true };
      }
    }
    return { success: false, error: 'Job not found' };
  }
  
  return { success: true, data: job, fromGraveyard: false };
}

function handleRetryJob(data) {
  // Check if job is in graveyard
  const graveyardSheet = getSheet(HISTORY_SHEET);
  if (graveyardSheet) {
    const graveyardJob = findGraveyardJobById(graveyardSheet, data.id);
    if (graveyardJob) {
      // Move back to jobs
      const jobsSheet = getOrCreateSheet(QUEUE_SHEET);
      ensureJobHeaders(jobsSheet);
      
      const job = {
        id: graveyardJob.id,
        queueName: graveyardJob.queueName,
        processor: graveyardJob.processor,
        data: graveyardJob.data,
        state: 'waiting',
        priority: graveyardJob.priority,
        attempts: 0,
        maxAttempts: graveyardJob.maxAttempts,
        delay: 0,
        timestamp: new Date().toISOString(),
        processedOn: null,
        repeatJobKey: graveyardJob.repeatJobKey,
      };
      
      appendJob(jobsSheet, job);
      deleteGraveyardJobById(graveyardSheet, data.id);
      
      return { success: true, data: job };
    }
  }
  
  // Job is in active jobs
  const sheet = getSheet(QUEUE_SHEET);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }
  
  updateJobFields(sheet, data.id, {
    state: 'waiting',
    attempts: 0,
    delay: 0,
    processedOn: null,
  });
  
  const job = findJobById(sheet, data.id);
  return { success: true, data: job };
}

function handleRemoveJob(data) {
  const sheet = getSheet(QUEUE_SHEET);
  if (!sheet) {
    return { success: false, error: 'Queue sheet not found' };
  }
  
  deleteJobById(sheet, data.id);
  return { success: true, message: 'Job removed' };
}

function handleCleanJobs(data) {
  // Clean completed/failed jobs from graveyard
  const graveyardSheet = getSheet(HISTORY_SHEET);
  if (!graveyardSheet) {
    return { success: true, data: { count: 0 } };
  }
  
  const jobs = getAllGraveyardJobs(graveyardSheet);
  let count = 0;
  
  jobs.forEach(job => {
    const shouldClean = 
      (data.state === 'completed' && job.state === 'completed') ||
      (data.state === 'failed' && job.state === 'failed');
    
    if (shouldClean && (!data.queueName || job.queueName === data.queueName)) {
      deleteGraveyardJobById(graveyardSheet, job.id);
      count++;
    }
  });
  
  return { success: true, data: { count } };
}

// ============================================================================
// GRAVEYARD HANDLERS
// ============================================================================

function handleGetGraveyardJobs(data) {
  const sheet = getSheet(HISTORY_SHEET);
  if (!sheet) {
    return { success: true, data: [] };
  }
  
  let jobs = getAllGraveyardJobs(sheet);
  
  if (data.queueName) {
    jobs = jobs.filter(j => j.queueName === data.queueName);
  }
  if (data.state) {
    jobs = jobs.filter(j => j.state === data.state);
  }
  
  return { success: true, data: jobs };
}

function handleCleanGraveyard(data) {
  const sheet = getSheet(HISTORY_SHEET);
  if (!sheet) {
    return { success: true, data: { count: 0 } };
  }
  
  const beforeCount = sheet.getLastRow() - 1;
  
  if (data.olderThan) {
    const cutoffDate = new Date(Date.now() - data.olderThan);
    const jobs = getAllGraveyardJobs(sheet);
    
    let count = 0;
    jobs.forEach(job => {
      if (new Date(job.finishedOn) < cutoffDate) {
        deleteGraveyardJobById(sheet, job.id);
        count++;
      }
    });
    
    return { success: true, data: { count } };
  }
  
  // Clear all
  sheet.clear();
  ensureGraveyardHeaders(sheet);
  
  return { success: true, data: { count: beforeCount } };
}

// ============================================================================
// REPEATABLE HANDLERS (Updated for Processors)
// ============================================================================

function handleAddRepeatableJob(data) {
  const sheet = getOrCreateSheet(SCHEDULES_SHEET);
  ensureRepeatableHeaders(sheet);
  
  // Verify processor exists
  const processorSheet = getSheet(ACTIONS_SHEET);
  if (processorSheet) {
    const processor = findProcessorByName(processorSheet, data.processor);
    if (!processor) {
      return { success: false, error: `Processor "${data.processor}" not found` };
    }
  }
  
  const key = `${data.queueName}::${data.processor}::${data.pattern}`;
  
  const existing = findRepeatableByKey(sheet, key);
  if (existing) {
    return { success: false, error: 'Repeatable job already exists' };
  }
  
  const repeatable = {
    key: key,
    queueName: data.queueName,
    processor: data.processor,
    data: JSON.stringify(data.data || {}),
    pattern: data.pattern,
    enabled: true,
    lastRun: null,
    nextRun: calculateNextRun(data.pattern).toISOString(),
  };
  
  appendRepeatable(sheet, repeatable);
  
  return {
    success: true,
    data: { ...repeatable, data: data.data || {} },
    message: 'Repeatable job added successfully',
  };
}

function handleGetRepeatableJobs(data) {
  const sheet = getSheet(SCHEDULES_SHEET);
  if (!sheet) {
    return { success: true, data: [] };
  }
  
  let jobs = getAllRepeatableJobs(sheet);
  
  if (data.queueName) {
    jobs = jobs.filter(j => j.queueName === data.queueName);
  }
  
  return { success: true, data: jobs };
}

function handleRemoveRepeatableJob(data) {
  const sheet = getSheet(SCHEDULES_SHEET);
  if (!sheet) {
    return { success: false, error: 'Schedules sheet not found' };
  }
  
  deleteRepeatableByKey(sheet, data.key);
  return { success: true, message: 'Repeatable job removed' };
}

function handleToggleRepeatableJob(data) {
  const sheet = getSheet(SCHEDULES_SHEET);
  if (!sheet) {
    return { success: false, error: 'Schedules sheet not found' };
  }
  
  updateRepeatableEnabled(sheet, data.key, data.enabled);
  const job = findRepeatableByKey(sheet, data.key);
  return { success: true, data: job };
}

// ============================================================================
// QUEUE & STATS HANDLERS
// ============================================================================

function handleCreateQueue(data) {
  const sheet = getOrCreateSheet(PIPELINES_SHEET);
  ensureQueueHeaders(sheet);
  
  const existing = findQueueByName(sheet, data.name);
  if (existing) {
    return { success: false, error: 'Queue already exists' };
  }
  
  const queue = {
    name: data.name,
    isPaused: false,
    createdAt: new Date().toISOString(),
  };
  
  appendQueue(sheet, queue);
  
  return {
    success: true,
    data: queue,
    message: 'Queue created successfully',
  };
}

function handleGetQueues(data) {
  const sheet = getSheet(PIPELINES_SHEET);
  if (!sheet) {
    return { success: true, data: [] };
  }
  
  const queues = getAllQueues(sheet);
  return { success: true, data: queues };
}

function handlePauseQueue(data) {
  const sheet = getSheet(PIPELINES_SHEET);
  if (!sheet) {
    return { success: false, error: 'Pipelines sheet not found' };
  }
  
  updateQueuePaused(sheet, data.name, true);
  return { success: true, message: `Queue ${data.name} paused` };
}

function handleResumeQueue(data) {
  const sheet = getSheet(PIPELINES_SHEET);
  if (!sheet) {
    return { success: false, error: 'Pipelines sheet not found' };
  }
  
  updateQueuePaused(sheet, data.name, false);
  return { success: true, message: `Queue ${data.name} resumed` };
}

function handleGetQueueStats(data) {
  const queuesSheet = getSheet(PIPELINES_SHEET);
  const jobsSheet = getSheet(QUEUE_SHEET);
  
  if (!queuesSheet || !jobsSheet) {
    return { success: true, data: [] };
  }
  
  const queues = getAllQueues(queuesSheet);
  const jobs = getAllJobs(jobsSheet);
  
  const stats = queues.map(queue => {
    const queueJobs = jobs.filter(j => j.queueName === queue.name);
    return {
      name: queue.name,
      total: queueJobs.length,
      waiting: queueJobs.filter(j => j.state === 'waiting').length,
      active: queueJobs.filter(j => j.state === 'active').length,
      delayed: queueJobs.filter(j => j.state === 'delayed').length,
      isPaused: queue.isPaused,
    };
  });
  
  return { success: true, data: stats };
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

// ============================================================================
// WORKER (Triggered every minute)
// ============================================================================

function processQueue() {
  const lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(30000)) {
      Logger.log('Could not acquire lock');
      return;
    }
  } catch (e) {
    Logger.log('Lock acquisition failed: ' + e.toString());
    return;
  }
  
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('lastWorkerRun', new Date().toISOString());
    
    processRepeatableJobs();
    processEligibleJobs();
    
    const totalProcessed = parseInt(props.getProperty('totalProcessed') || '0');
    props.setProperty('totalProcessed', (totalProcessed + 1).toString());
  } catch (error) {
    Logger.log('Error in processQueue: ' + error.toString());
  } finally {
    lock.releaseLock();
  }
}

function processRepeatableJobs() {
  const repeatableSheet = getSheet(SCHEDULES_SHEET);
  if (!repeatableSheet) return;
  
  const jobsSheet = getOrCreateSheet(QUEUE_SHEET);
  ensureJobHeaders(jobsSheet);
  
  const repeatables = getAllRepeatableJobs(repeatableSheet);
  const now = new Date();
  
  repeatables.forEach(repeatable => {
    if (!repeatable.enabled) return;
    
    const nextRun = repeatable.nextRun ? new Date(repeatable.nextRun) : null;
    if (!nextRun || now >= nextRun) {
      const job = {
        id: generateUUID(),
        queueName: repeatable.queueName,
        processor: repeatable.processor,
        data: repeatable.data,
        state: 'waiting',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        timestamp: new Date().toISOString(),
        processedOn: null,
        repeatJobKey: repeatable.key,
      };
      
      appendJob(jobsSheet, job);
      
      const newNextRun = calculateNextRun(repeatable.pattern);
      updateRepeatableNextRun(repeatableSheet, repeatable.key, now.toISOString(), newNextRun.toISOString());
      
      Logger.log(`Created job from repeatable: ${repeatable.key}`);
    }
  });
}

function processEligibleJobs() {
  const jobsSheet = getSheet(QUEUE_SHEET);
  if (!jobsSheet) return;
  
  const queuesSheet = getSheet(PIPELINES_SHEET);
  const pausedQueues = queuesSheet ? getAllQueues(queuesSheet).filter(q => q.isPaused).map(q => q.name) : [];
  
  const jobs = getEligibleJobs(jobsSheet);
  Logger.log(`Found ${jobs.length} eligible jobs`);
  
  jobs.slice(0, MAX_JOBS_PER_RUN).forEach(job => {
    if (pausedQueues.includes(job.queueName)) {
      Logger.log(`Queue ${job.queueName} is paused, skipping job ${job.id}`);
      return;
    }
    
    executeJob(jobsSheet, job);
  });
}

function getEligibleJobs(sheet) {
  const jobs = getAllJobs(sheet);
  const now = Date.now();
  
  return jobs
    .filter(job => {
      if (job.state === 'waiting') return true;
      if (job.state === 'delayed' && new Date(job.timestamp).getTime() + job.delay <= now) return true;
      return false;
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
}

function executeJob(sheet, job) {
  const now = new Date().toISOString();
  
  updateJobFields(sheet, job.id, {
    state: 'active',
    processedOn: now,
  });
  
  Logger.log(`Executing job ${job.id} with processor ${job.processor}`);
  
  try {
    // Look up processor
    const processorSheet = getSheet(ACTIONS_SHEET);
    if (!processorSheet) {
      throw new Error('Actions sheet not found');
    }
    
    const processor = findProcessorByName(processorSheet, job.processor);
    if (!processor) {
      throw new Error(`Processor "${job.processor}" not found`);
    }
    
    // Parse job data
    const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
    
    // Execute processor
    const result = executeProcessor(processor, jobData, false);
    
    // Move to graveyard
    moveToGraveyard(job, {
      state: 'completed',
      finishedOn: new Date().toISOString(),
      returnvalue: JSON.stringify(result),
      failedReason: null,
    });
    
    Logger.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    Logger.log(`Job ${job.id} failed: ${error.toString()}`);
    handleJobFailure(sheet, job, error.toString());
  }
}

function executeProcessor(processor, jobData, isDryRun) {
  const config = typeof processor.config === 'string' ? JSON.parse(processor.config) : processor.config;
  const normalizedData = normalizeJobData(jobData);

  if (processor.type === 'script') {
    return executeScript(config.script, normalizedData, isDryRun);
  } else if (processor.type === 'http') {
    return executeHttp(config, normalizedData);
  } else {
    throw new Error(`Unknown processor type: ${processor.type}`);
  }
}

function executeScript(scriptCode, jobData, isDryRun) {
  const logs = [];
  const outputs = [];
  
  const helpers = createScriptHelpers(logs, outputs, isDryRun);
  
  const wrappedScript = `
    (function(data, fetch, log, addJob, getProperty, setProperty, parseJSON, stringifyJSON, sleep) {
      ${scriptCode}
    })
  `;
  
  const scriptFunction = eval(wrappedScript);
  const result = scriptFunction(
    jobData,
    helpers.fetch,
    helpers.log,
    helpers.addJob,
    helpers.getProperty,
    helpers.setProperty,
    helpers.parseJSON,
    helpers.stringifyJSON,
    helpers.sleep
  );
  
  return {
    result: result,
    logs: logs,
    outputs: outputs,
  };
}

function normalizeJobData(jobData) {
  return parseJobData(jobData);
}

function serializeJobData(data) {
  if (data === null || data === undefined || data === '') return '{}';
  if (typeof data === 'string') {
    try {
      JSON.parse(data);
      return data;
    } catch (e) {
      return JSON.stringify({ _raw: data });
    }
  }
  try {
    return JSON.stringify(data);
  } catch (e) {
    return '{}';
  }
}

function parseJobData(raw) {
  if (raw === null || raw === undefined || raw === '') return {};
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = String(raw).trim();
    if (!trimmed || trimmed === '[object Object]') return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') {
        try {
          const twice = JSON.parse(parsed);
          if (twice && typeof twice === 'object' && !Array.isArray(twice)) return twice;
        } catch (e2) { /* keep single parse */ }
        return { _value: parsed };
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return { _value: parsed };
    } catch (e) {
      return { _raw: trimmed };
    }
  }
  return {};
}

function templateString(str, jobData) {
  if (typeof str !== 'string') return str;
  let result = str;
  Object.keys(jobData).forEach(function(key) {
    const val = jobData[key];
    if (val === undefined || val === null) return;
    const replacement = typeof val === 'object' ? JSON.stringify(val) : String(val);
    const regex = new RegExp('\\{' + key + '\\}', 'g');
    result = result.replace(regex, replacement);
  });
  return result;
}

function applyTemplate(value, jobData) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return templateString(value, jobData);
  if (Array.isArray(value)) {
    return value.map(function(item) { return applyTemplate(item, jobData); });
  }
  if (typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(function(k) {
      out[k] = applyTemplate(value[k], jobData);
    });
    return out;
  }
  return value;
}

function parseHttpBodyTemplate(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      return body;
    }
  }
  return body;
}

function executeHttp(config, jobData) {
  jobData = normalizeJobData(jobData);

  const options = {
    method: config.method,
    headers: config.headers || {},
    muteHttpExceptions: true,
  };

  const url = templateString(String(config.url || ''), jobData);

  if (config.headers) {
    options.headers = applyTemplate(
      JSON.parse(JSON.stringify(config.headers)),
      jobData
    );
  }

  if (config.body && config.method !== 'GET') {
    const bodyTemplate = parseHttpBodyTemplate(config.body);
    const templatedBody = applyTemplate(bodyTemplate, jobData);
    options.payload = typeof templatedBody === 'string'
      ? templatedBody
      : JSON.stringify(templatedBody);

    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }
  }

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  
  if (statusCode < 200 || statusCode >= 400) {
    throw new Error(`HTTP ${statusCode}: ${response.getContentText().substring(0, 200)}`);
  }
  
  return {
    statusCode: statusCode,
    body: response.getContentText(),
  };
}

function createScriptHelpers(logs, outputs, isDryRun) {
  return {
    fetch: function(url, options) {
      options = options || {};
      const fetchOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        muteHttpExceptions: true,
      };
      
      if (options.body && fetchOptions.method !== 'GET') {
        fetchOptions.payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        if (!fetchOptions.headers['Content-Type']) {
          fetchOptions.headers['Content-Type'] = 'application/json';
        }
      }
      
      const response = UrlFetchApp.fetch(url, fetchOptions);
      const result = {
        status: response.getResponseCode(),
        statusText: response.getResponseCode() >= 200 && response.getResponseCode() < 300 ? 'OK' : 'Error',
        body: response.getContentText(),
        headers: response.getAllHeaders(),
      };
      
      outputs.push(`fetch(${url}) → ${result.status}`);
      return result;
    },
    
    log: function(message) {
      const logMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
      logs.push(logMessage);
      Logger.log('[Script] ' + logMessage);
    },
    
    addJob: function(queueName, processor, data, opts) {
      if (isDryRun) {
        logs.push(`[DRY RUN] Would add job: ${queueName}::${processor}`);
        return { id: 'dry-run-' + generateUUID() };
      }
      
      const jobsSheet = getOrCreateSheet(QUEUE_SHEET);
      ensureJobHeaders(jobsSheet);
      
      const job = {
        id: generateUUID(),
        queueName: queueName,
        processor: processor,
        data: JSON.stringify(data),
        state: opts?.delay ? 'delayed' : 'waiting',
        priority: opts?.priority || 0,
        attempts: 0,
        maxAttempts: opts?.attempts || 3,
        delay: opts?.delay || 0,
        timestamp: new Date().toISOString(),
        processedOn: null,
        repeatJobKey: null,
      };
      
      appendJob(jobsSheet, job);
      Logger.log('[Script] Created job: ' + job.id);
      return { id: job.id };
    },
    
    getProperty: function(key) {
      return PropertiesService.getScriptProperties().getProperty(key);
    },
    
    setProperty: function(key, value) {
      if (isDryRun) {
        logs.push(`[DRY RUN] Would set property ${key} = ${value}`);
      } else {
        PropertiesService.getScriptProperties().setProperty(key, value);
      }
    },
    
    parseJSON: function(str) {
      return JSON.parse(str);
    },
    
    stringifyJSON: function(obj) {
      return JSON.stringify(obj);
    },
    
    sleep: function(ms) {
      if (isDryRun) {
        logs.push(`[Sleeping ${ms}ms]`);
        Utilities.sleep(Math.min(ms, 5000));
      } else {
        Utilities.sleep(ms);
      }
    },
  };
}

function handleJobFailure(sheet, job, errorMessage) {
  const newAttempts = job.attempts + 1;
  
  if (newAttempts < job.maxAttempts) {
    const delayMs = Math.pow(2, newAttempts) * 60 * 1000;
    
    updateJobFields(sheet, job.id, {
      state: 'delayed',
      attempts: newAttempts,
      delay: delayMs,
    });
    
    Logger.log(`Job ${job.id} will retry in ${delayMs/1000}s`);
  } else {
    // Move to graveyard
    moveToGraveyard(job, {
      state: 'failed',
      finishedOn: new Date().toISOString(),
      returnvalue: null,
      failedReason: errorMessage,
    });
    
    Logger.log(`Job ${job.id} failed permanently, moved to graveyard`);
  }
}

function moveToGraveyard(job, finalState) {
  const graveyardSheet = getOrCreateSheet(HISTORY_SHEET);
  ensureGraveyardHeaders(graveyardSheet);
  
  const graveyardJob = {
    id: job.id,
    queueName: job.queueName,
    processor: job.processor,
    data: job.data,
    state: finalState.state,
    priority: job.priority,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: finalState.finishedOn,
    failedReason: finalState.failedReason,
    returnvalue: finalState.returnvalue,
    repeatJobKey: job.repeatJobKey,
  };
  
  appendGraveyardJob(graveyardSheet, graveyardJob);
  
  // Remove from jobs
  const jobsSheet = getSheet(QUEUE_SHEET);
  if (jobsSheet) {
    deleteJobById(jobsSheet, job.id);
  }
}

// ============================================================================
// SHEET HELPERS - PIPELINES (was: Queues)
// ============================================================================

function ensureQueueHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  const headers = ['name', 'isPaused', 'createdAt'];
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
             .setBackground('#1a73e8')
             .setFontColor('#ffffff');

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 200);
  sheet.setFrozenRows(1);
  sheet.setTabColor('#1a73e8');
}

function getAllQueues(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const queues = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    queues.push({
      name: row[0],
      isPaused: row[1],
      createdAt: row[2],
    });
  }
  
  return queues;
}

function findQueueByName(sheet, name) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      return {
        name: data[i][0],
        isPaused: data[i][1],
        createdAt: data[i][2],
      };
    }
  }
  return null;
}

function appendQueue(sheet, queue) {
  sheet.appendRow([queue.name, queue.isPaused, queue.createdAt]);
}

function updateQueuePaused(sheet, name, isPaused) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.getRange(i + 1, 2).setValue(isPaused);
      break;
    }
  }
}

// ============================================================================
// SHEET HELPERS - ACTIONS (was: Processors)
// ============================================================================

function ensureProcessorHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  const headers = ['name', 'type', 'config', 'description', 'createdAt'];
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
             .setBackground('#8430ce')
             .setFontColor('#ffffff');

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 400);
  sheet.setColumnWidth(4, 240);
  sheet.setColumnWidth(5, 200);
  sheet.setFrozenRows(1);
  sheet.setTabColor('#8430ce');
}

function getAllProcessors(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const processors = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    let config;
    try {
      config = typeof row[2] === 'string' ? JSON.parse(row[2]) : row[2];
    } catch (e) {
      config = {};
    }
    
    processors.push({
      name: row[0],
      type: row[1],
      config: config,
      description: row[3] || '',
      createdAt: row[4],
    });
  }
  
  return processors;
}

function findProcessorByName(sheet, name) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      let config;
      try {
        config = typeof data[i][2] === 'string' ? JSON.parse(data[i][2]) : data[i][2];
      } catch (e) {
        config = {};
      }
      
      return {
        name: data[i][0],
        type: data[i][1],
        config: config,
        description: data[i][3] || '',
        createdAt: data[i][4],
      };
    }
  }
  return null;
}

function appendProcessor(sheet, processor) {
  sheet.appendRow([
    processor.name,
    processor.type,
    processor.config,
    processor.description,
    processor.createdAt
  ]);
}

function updateProcessor(sheet, name, updates) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      const rowNum = i + 1;
      
      if (updates.hasOwnProperty('config')) sheet.getRange(rowNum, 3).setValue(updates.config);
      if (updates.hasOwnProperty('description')) sheet.getRange(rowNum, 4).setValue(updates.description);
      
      break;
    }
  }
}

function deleteProcessorByName(sheet, name) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// ============================================================================
// SHEET HELPERS - QUEUE (was: Jobs)
// ============================================================================

function ensureJobHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  const headers = [
    'id', 'pipeline', 'action', 'data', 'state', 'priority', 'attempts',
    'maxAttempts', 'delay', 'createdAt', 'startedAt', 'scheduleKey'
  ];
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
             .setBackground('#1e8e3e')
             .setFontColor('#ffffff');

  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 90);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 80);
  sheet.setColumnWidth(10, 200);
  sheet.setColumnWidth(11, 200);
  sheet.setColumnWidth(12, 280);
  sheet.setFrozenRows(1);
  sheet.setTabColor('#1e8e3e');

  // Conditional formatting for the state column (col 5)
  const stateRange = sheet.getRange('E2:E1000');
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('waiting')
      .setBackground('#fef08a').setFontColor('#713f12')
      .setRanges([stateRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('active')
      .setBackground('#bbf7d0').setFontColor('#14532d')
      .setRanges([stateRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('delayed')
      .setBackground('#e0e7ff').setFontColor('#312e81')
      .setRanges([stateRange]).build(),
  ];
  sheet.setConditionalFormatRules(rules);
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
  const data = parseJobData(row[3]);

  return {
    id: row[0],
    queueName: row[1],
    processor: row[2],
    data: data,
    state: row[4],
    priority: row[5],
    attempts: row[6],
    maxAttempts: row[7],
    delay: row[8],
    timestamp: row[9],
    processedOn: row[10] || null,
    repeatJobKey: row[11] || null,
  };
}

function appendJob(sheet, job) {
  sheet.appendRow([
    job.id, job.queueName, job.processor, serializeJobData(job.data), job.state, job.priority,
    job.attempts, job.maxAttempts, job.delay, job.timestamp, job.processedOn,
    job.repeatJobKey
  ]);
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
      
      if (updates.hasOwnProperty('state')) sheet.getRange(rowNum, 5).setValue(updates.state);
      if (updates.hasOwnProperty('attempts')) sheet.getRange(rowNum, 7).setValue(updates.attempts);
      if (updates.hasOwnProperty('delay')) sheet.getRange(rowNum, 9).setValue(updates.delay);
      if (updates.hasOwnProperty('processedOn')) sheet.getRange(rowNum, 11).setValue(updates.processedOn);
      
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
// SHEET HELPERS - HISTORY (was: JobsGraveyard)
// ============================================================================

function ensureGraveyardHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  const headers = [
    'id', 'pipeline', 'action', 'data', 'result', 'priority', 'attempts',
    'maxAttempts', 'createdAt', 'startedAt', 'finishedAt', 'failReason',
    'returnValue', 'scheduleKey'
  ];
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
             .setBackground('#5f6368')
             .setFontColor('#ffffff');

  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(10, 200);
  sheet.setColumnWidth(11, 200);
  sheet.setColumnWidth(12, 300);
  sheet.setFrozenRows(1);
  sheet.setTabColor('#5f6368');

  // Conditional formatting for the result column (col 5)
  const resultRange = sheet.getRange('E2:E1000');
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('completed')
      .setBackground('#bbf7d0').setFontColor('#14532d')
      .setRanges([resultRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('failed')
      .setBackground('#fecaca').setFontColor('#7f1d1d')
      .setRanges([resultRange]).build(),
  ];
  sheet.setConditionalFormatRules(rules);
}

function getAllGraveyardJobs(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const jobs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    jobs.push({
      id: row[0],
      queueName: row[1],
      processor: row[2],
      data: parseJobData(row[3]),
      state: row[4],
      priority: row[5],
      attempts: row[6],
      maxAttempts: row[7],
      timestamp: row[8],
      processedOn: row[9] || null,
      finishedOn: row[10] || null,
      failedReason: row[11] || null,
      returnvalue: row[12] || null,
      repeatJobKey: row[13] || null,
    });
  }
  
  return jobs;
}

function findGraveyardJobById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return {
        id: data[i][0],
        queueName: data[i][1],
        processor: data[i][2],
        data: parseJobData(data[i][3]),
        state: data[i][4],
        priority: data[i][5],
        attempts: data[i][6],
        maxAttempts: data[i][7],
        timestamp: data[i][8],
        processedOn: data[i][9] || null,
        finishedOn: data[i][10] || null,
        failedReason: data[i][11] || null,
        returnvalue: data[i][12] || null,
        repeatJobKey: data[i][13] || null,
      };
    }
  }
  return null;
}

function appendGraveyardJob(sheet, job) {
  sheet.appendRow([
    job.id, job.queueName, job.processor, serializeJobData(job.data), job.state, job.priority,
    job.attempts, job.maxAttempts, job.timestamp, job.processedOn,
    job.finishedOn, job.failedReason, job.returnvalue, job.repeatJobKey
  ]);
}

function deleteGraveyardJobById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// ============================================================================
// SHEET HELPERS - SCHEDULES (was: Repeatable)
// ============================================================================

function ensureRepeatableHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  const headers = ['key', 'pipeline', 'action', 'data', 'pattern', 'enabled', 'lastRun', 'nextRun'];
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
             .setBackground('#e37400')
             .setFontColor('#ffffff');

  sheet.setColumnWidth(1, 350);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 200);
  sheet.setFrozenRows(1);
  sheet.setTabColor('#e37400');

  // Conditional formatting for enabled column (col 6)
  const enabledRange = sheet.getRange('F2:F1000');
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('true')
      .setBackground('#bbf7d0').setFontColor('#14532d')
      .setRanges([enabledRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('false')
      .setBackground('#f3f4f6').setFontColor('#6b7280')
      .setRanges([enabledRange]).build(),
  ];
  sheet.setConditionalFormatRules(rules);
}

function getAllRepeatableJobs(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const jobs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    let jobData;
    try {
      jobData = typeof row[3] === 'string' ? JSON.parse(row[3]) : row[3];
    } catch (e) {
      jobData = {};
    }
    
    jobs.push({
      key: row[0],
      queueName: row[1],
      processor: row[2],
      data: jobData,
      pattern: row[4],
      enabled: row[5],
      lastRun: row[6] || null,
      nextRun: row[7] || null,
    });
  }
  
  return jobs;
}

function findRepeatableByKey(sheet, key) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      let jobData;
      try {
        jobData = typeof data[i][3] === 'string' ? JSON.parse(data[i][3]) : data[i][3];
      } catch (e) {
        jobData = {};
      }
      
      return {
        key: data[i][0],
        queueName: data[i][1],
        processor: data[i][2],
        data: jobData,
        pattern: data[i][4],
        enabled: data[i][5],
        lastRun: data[i][6] || null,
        nextRun: data[i][7] || null,
      };
    }
  }
  return null;
}

function appendRepeatable(sheet, repeatable) {
  sheet.appendRow([
    repeatable.key, repeatable.queueName, repeatable.processor, repeatable.data,
    repeatable.pattern, repeatable.enabled, repeatable.lastRun, repeatable.nextRun
  ]);
}

function updateRepeatableEnabled(sheet, key, enabled) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 6).setValue(enabled);
      break;
    }
  }
}

function updateRepeatableNextRun(sheet, key, lastRun, nextRun) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 7).setValue(lastRun);
      sheet.getRange(i + 1, 8).setValue(nextRun);
      break;
    }
  }
}

function deleteRepeatableByKey(sheet, key) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// ============================================================================
// UTILITIES
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

/**
 * Run this once after pasting Code.gs into your Apps Script project.
 * Creates all sheets with proper formatting and a Guide tab.
 */
function setupRogerSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createGuideSheet(ss);

  const pipelines = getOrCreateSheet(PIPELINES_SHEET);
  ensureQueueHeaders(pipelines);

  const actions = getOrCreateSheet(ACTIONS_SHEET);
  ensureProcessorHeaders(actions);

  const queue = getOrCreateSheet(QUEUE_SHEET);
  ensureJobHeaders(queue);

  const schedules = getOrCreateSheet(SCHEDULES_SHEET);
  ensureRepeatableHeaders(schedules);

  const history = getOrCreateSheet(HISTORY_SHEET);
  ensureGraveyardHeaders(history);

  SpreadsheetApp.getUi().alert(
    '✅ Roger Sheet is ready!\n\n' +
    'Open the dashboard at your Next.js app URL to start adding actions and jobs.\n\n' +
    'Check the Guide tab for a quick walkthrough.'
  );
}

function createGuideSheet(ss) {
  const name = '📋 Guide';
  if (ss.getSheetByName(name)) return;

  const guide = ss.insertSheet(name, 0);
  guide.setTabColor('#d93025');

  const rows = [
    ['ROGER SHEET — Automated Job Queue', '', ''],
    ['', '', ''],
    ['WHAT IS THIS?', '', ''],
    ['Roger Sheet turns Google Sheets into a job queue. You define what to do (Actions),', '', ''],
    ['add tasks (Queue), and a background trigger runs them automatically every minute.', '', ''],
    ['', '', ''],
    ['THE 5 SHEETS', '', ''],
    ['Tab', 'What it stores', 'When to use it'],
    ['📋 Guide', 'This help page', 'Read once'],
    ['Pipelines', 'Named pipelines + pause switch', 'Create pipelines to group your jobs'],
    ['Actions', 'Reusable handlers (HTTP or script)', 'Define what each job type does'],
    ['Queue', 'Jobs waiting to run right now', 'See/manage live work'],
    ['Schedules', 'Jobs that run on a recurring pattern', 'Set up cron-like repeating jobs'],
    ['History', 'Everything that has run (done or failed)', 'Audit trail, debug failures'],
    ['', '', ''],
    ['HOW TO GET STARTED', '', ''],
    ['1.', 'Go to Actions tab → create your first action (e.g. POST to a webhook URL)', ''],
    ['2.', 'Go to Pipelines tab → create a pipeline (e.g. "notifications")', ''],
    ['3.', 'Open your dashboard → Jobs → New Job → pick action + enter data', ''],
    ['4.', 'The trigger runs every minute and executes waiting jobs automatically', ''],
    ['5.', 'Check History tab to see results', ''],
    ['', '', ''],
    ['SCHEDULE PATTERNS', '', ''],
    ['Pattern', 'Example', 'Meaning'],
    ['every-N-minutes', 'every-5-minutes', 'Run every 5 minutes'],
    ['every-N-hours', 'every-2-hours', 'Run every 2 hours'],
    ['daily-HH:MM', 'daily-09:30', 'Run once a day at 09:30 UTC'],
    ['', '', ''],
    ['TIPS', '', ''],
    ['Pausing', 'Set isPaused = TRUE in Pipelines tab to stop a whole pipeline', ''],
    ['Priority', 'Higher number = runs first. Default is 0.', ''],
    ['Retries', 'Failed jobs retry automatically up to maxAttempts times', ''],
    ['History', 'Completed jobs move here automatically — Queue stays clean', ''],
  ];

  guide.getRange(1, 1, rows.length, 3).setValues(rows);

  // Title formatting
  guide.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#d93025');

  // Section headers
  ['A3', 'A7', 'A16', 'A23', 'A28'].forEach(function(cell) {
    guide.getRange(cell).setFontWeight('bold').setFontColor('#1a73e8');
  });

  // Table header rows
  [8, 24, 28].forEach(function(row) {
    guide.getRange(row, 1, 1, 3)
         .setFontWeight('bold')
         .setBackground('#f1f3f4');
  });

  // Tab color cells in the table
  const tabColors = { 'Pipelines': '#1a73e8', 'Actions': '#8430ce', 'Queue': '#1e8e3e', 'Schedules': '#e37400', 'History': '#5f6368' };
  guide.getRange(9, 1, 6, 3).getValues().forEach(function(r, i) {
    const color = tabColors[r[0]];
    if (color) guide.getRange(9 + i, 1).setFontColor(color).setFontWeight('bold');
  });

  guide.setColumnWidth(1, 200);
  guide.setColumnWidth(2, 400);
  guide.setColumnWidth(3, 280);
  guide.setFrozenRows(1);

  // Move Guide to first position
  ss.setActiveSheet(guide);
  ss.moveActiveSheet(1);
}

function generateUUID() {
  return Utilities.getUuid();
}

function calculateNextRun(pattern) {
  const now = new Date();
  const parts = pattern.split('-');
  
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
