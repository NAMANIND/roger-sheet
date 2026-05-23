'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddJobRequest, JobFormPrefill, Processor } from '@/types/job';
import { addJob } from '@/app/actions/jobs';
import { addRepeatableJob } from '@/app/actions/repeatable';
import { getProcessors } from '@/app/actions/processors';
import { pairsFromDefinitions } from '@/lib/params';
import {
  IMMEDIATE_EXECUTION_LABEL,
  REPEATABLE_PATTERN_OPTIONS,
  validateRepeatablePattern,
} from '@/lib/schedule-patterns';
import { X } from 'lucide-react';

type ExecutionType = 'immediate' | 'schedule';
type ScheduleType = 'once' | 'repeatable';
type DataInputMode = 'simple' | 'json';

interface KeyValuePair {
  key: string;
  value: string;
}

function dataToKeyValuePairs(data: Record<string, unknown>): KeyValuePair[] {
  const entries = Object.entries(data);
  if (entries.length === 0) return [{ key: '', value: '' }];
  return entries.map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
}

interface JobFormProps {
  queueName?: string;
  prefill?: JobFormPrefill;
  sourceJobId?: string;
}

export function JobForm({
  queueName: initialQueueName = 'default',
  prefill,
  sourceJobId,
}: JobFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processors, setProcessors] = useState<Processor[]>([]);
  const [isLoadingProcessors, setIsLoadingProcessors] = useState(true);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const [queue, setQueue] = useState(initialQueueName);
  const [selectedProcessor, setSelectedProcessor] = useState(prefill?.processor ?? '');
  const [dataInputMode, setDataInputMode] = useState<DataInputMode>('simple');
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>(
    prefill ? dataToKeyValuePairs(prefill.data) : [{ key: '', value: '' }]
  );
  const [jobDataText, setJobDataText] = useState(
    prefill ? JSON.stringify(prefill.data, null, 2) : '{}'
  );
  const [priority, setPriority] = useState(prefill?.priority ?? 0);
  const [attempts, setAttempts] = useState(prefill?.attempts ?? 3);
  
  // Scheduling
  const [executionType, setExecutionType] = useState<ExecutionType>('immediate');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('once');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [cronPattern, setCronPattern] = useState('every-5-minutes');

  useEffect(() => {
    loadProcessors();
  }, []);

  useEffect(() => {
    if (!prefill || processors.length === 0 || prefillApplied) return;

    setQueue(prefill.queueName);
    setSelectedProcessor(prefill.processor);
    setPriority(prefill.priority ?? 0);
    setAttempts(prefill.attempts ?? 3);
    setKeyValuePairs(dataToKeyValuePairs(prefill.data));
    setJobDataText(JSON.stringify(prefill.data, null, 2));
    setPrefillApplied(true);
  }, [prefill, processors, prefillApplied]);

  const loadProcessors = async () => {
    try {
      const result = await getProcessors();
      if (result.success && result.data) {
        setProcessors(result.data);
        if (result.data.length > 0 && !prefill) {
          const first = result.data[0];
          setSelectedProcessor(first.name);
          applyProcessorParams(first);
        }
      }
    } catch (error) {
      console.error('Failed to load processors:', error);
    } finally {
      setIsLoadingProcessors(false);
    }
  };

  const applyProcessorParams = (processor: Processor) => {
    const { params, paramDefaults } = processor.config;
    if (params?.length) {
      setKeyValuePairs(pairsFromDefinitions(params, paramDefaults));
      setJobDataText(
        JSON.stringify(
          Object.fromEntries(params.map((k) => [k, paramDefaults?.[k] ?? ''])),
          null,
          2
        )
      );
    } else {
      setKeyValuePairs([{ key: '', value: '' }]);
      setJobDataText('{}');
    }
  };

  const handleProcessorChange = (processorName: string) => {
    setSelectedProcessor(processorName);
    const processor = processors.find((p) => p.name === processorName);
    if (processor) applyProcessorParams(processor);
  };

  const addKeyValuePair = () => {
    setKeyValuePairs([...keyValuePairs, { key: '', value: '' }]);
  };

  const removeKeyValuePair = (index: number) => {
    setKeyValuePairs(keyValuePairs.filter((_, i) => i !== index));
  };

  const updateKeyValuePair = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...keyValuePairs];
    updated[index][field] = value;
    setKeyValuePairs(updated);
  };

  const keyValuePairsToObject = (): Record<string, any> => {
    const obj: Record<string, any> = {};
    keyValuePairs.forEach(pair => {
      if (pair.key.trim()) {
        // Try to parse value as JSON for numbers, booleans, etc.
        try {
          obj[pair.key] = JSON.parse(pair.value);
        } catch {
          obj[pair.key] = pair.value;
        }
      }
    });
    return obj;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let jobData: Record<string, any> = {};
      
      if (dataInputMode === 'simple') {
        jobData = keyValuePairsToObject();
      } else {
        if (jobDataText.trim() && jobDataText !== '{}') {
          try {
            jobData = JSON.parse(jobDataText);
          } catch (e) {
            throw new Error('Invalid JSON in job data');
          }
        }
      }

      // Handle repeatable jobs
      if (executionType === 'schedule' && scheduleType === 'repeatable') {
        const patternError = validateRepeatablePattern(cronPattern);
        if (patternError) {
          throw new Error(patternError);
        }

        const result = await addRepeatableJob({
          queueName: queue,
          processor: selectedProcessor,
          pattern: cronPattern,
          data: jobData,
        });

        if (result.success) {
          router.replace('/schedules');
          return;
        } else {
          setError(result.error || 'Failed to create repeatable job');
        }
        return;
      }

      // Handle immediate or scheduled once jobs
      let delay = 0;
      
      if (executionType === 'schedule' && scheduleType === 'once') {
        if (!scheduledDate || !scheduledTime) {
          throw new Error('Please select both date and time');
        }
        
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        delay = scheduledDateTime.getTime() - now.getTime();
        
        if (delay < 0) {
          throw new Error('Scheduled time must be in the future');
        }
      }

      const request: AddJobRequest = {
        queueName: queue,
        processor: selectedProcessor,
        data: jobData,
        opts: {
          priority,
          delay,
          attempts,
        },
      };

      const result = await addJob(request);

      if (result.success) {
        router.replace(result.data?.id ? `/queue/${result.data.id}` : '/queue');
        return;
      } else {
        setError(result.error || 'Failed to create job');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProcessors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading processors...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (processors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Processors Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You need to create a processor before adding jobs.
          </p>
          <Button onClick={() => router.push('/actions/new')}>
            Create Processor
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedProcessorObj = processors.find(p => p.name === selectedProcessor);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {sourceJobId ? 'Create new job from graveyard' : `Add Job to ${queue}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {sourceJobId && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-md text-sm">
              Pre-filled from graveyard job{' '}
              <span className="font-mono">{sourceJobId.substring(0, 8)}…</span>.
              Edit anything below, then create a new job.
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="queue">Queue</Label>
            <Input
              id="queue"
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              placeholder="default"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="processor">Processor</Label>
            <Select value={selectedProcessor} onValueChange={(value) => value && handleProcessorChange(value)}>
              <SelectTrigger id="processor">
                <SelectValue placeholder="Select processor" />
              </SelectTrigger>
              <SelectContent>
                {processors.map((processor) => (
                  <SelectItem key={processor.name} value={processor.name}>
                    {processor.name} ({processor.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProcessorObj && selectedProcessorObj.description && (
              <p className="text-sm text-muted-foreground">{selectedProcessorObj.description}</p>
            )}
          </div>

          <Tabs value={dataInputMode} onValueChange={(v) => setDataInputMode(v as DataInputMode)}>
            <div className="flex items-center justify-between mb-2">
              <Label>Job Data</Label>
              <TabsList className="h-8">
                <TabsTrigger value="simple" className="text-xs px-3">Simple</TabsTrigger>
                <TabsTrigger value="json" className="text-xs px-3">JSON</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="simple" className="space-y-3 mt-0">
                {keyValuePairs.map((pair, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={pair.key}
                      onChange={(e) => updateKeyValuePair(index, 'key', e.target.value)}
                      className="flex-1"
                      readOnly={pair.key !== '' && pair.value === ''}
                    />
                    <Input
                      placeholder="Value"
                      value={pair.value}
                      onChange={(e) => updateKeyValuePair(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    {keyValuePairs.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeKeyValuePair(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addKeyValuePair}
                  className="w-full"
                >
                  + Add Field
                </Button>
                <p className="text-xs text-muted-foreground">
                  {keyValuePairs.some(p => p.key && !p.value) && (
                    <span className="text-blue-600">✨ Keys auto-detected from processor. </span>
                  )}
                  Fill in values. Numbers/booleans are auto-detected.
                </p>
              </TabsContent>
              
            <TabsContent value="json" className="mt-0">
              <Textarea
                value={jobDataText}
                onChange={(e) => setJobDataText(e.target.value)}
                placeholder='{"userId": "123", "action": "send-email"}'
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Advanced: Enter raw JSON for complex data structures.
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="executionType">Execution</Label>
            <Select value={executionType} onValueChange={(value) => value && setExecutionType(value as ExecutionType)}>
              <SelectTrigger id="executionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{IMMEDIATE_EXECUTION_LABEL}</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {executionType === 'schedule' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="scheduleType">Run</Label>
                <Select value={scheduleType} onValueChange={(value) => value && setScheduleType(value as ScheduleType)}>
                  <SelectTrigger id="scheduleType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="repeatable">Repeatable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleType === 'once' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {scheduleType === 'repeatable' && (
                <div className="space-y-2">
                  <Label htmlFor="cronPattern">Repeat every</Label>
                  <Select value={cronPattern} onValueChange={(v) => v && setCronPattern(v)}>
                    <SelectTrigger id="cronPattern">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPEATABLE_PATTERN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Minimum interval is 5 minutes. Immediate jobs run in about 1-2 minutes.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Higher = runs first</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attempts">Max Attempts</Label>
              <Input
                id="attempts"
                type="number"
                value={attempts}
                onChange={(e) => setAttempts(parseInt(e.target.value))}
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || !selectedProcessor}>
              {isSubmitting
                ? 'Creating...'
                : executionType === 'schedule' && scheduleType === 'repeatable'
                  ? 'Create Repeatable Job'
                  : sourceJobId
                    ? 'Create new job'
                    : 'Create Job'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(sourceJobId ? '/history' : '/')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
