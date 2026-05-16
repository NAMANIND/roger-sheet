'use client';

import { useState } from 'react';
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
import { CreateJobRequest, HttpMethod } from '@/types/job';
import { createJob } from '@/app/actions/jobs';

export function JobForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateJobRequest>({
    queue: 'default',
    type: 'immediate',
    url: '',
    method: 'POST',
    headers: {},
    body: null,
    priority: 5,
    maxRetries: 3,
  });

  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [delayMinutes, setDelayMinutes] = useState('0');
  const [cronExpression, setCronExpression] = useState('every-5-minutes');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let headers: Record<string, string> = {};
      if (headersText.trim()) {
        headers = JSON.parse(headersText);
      }

      let body = null;
      if (bodyText.trim()) {
        body = JSON.parse(bodyText);
      }

      let runAt: Date | undefined;
      if (formData.type === 'delayed') {
        const delay = parseInt(delayMinutes) || 0;
        runAt = new Date(Date.now() + delay * 60 * 1000);
      } else if (formData.type === 'cron') {
        runAt = new Date();
      }

      const jobData: CreateJobRequest = {
        ...formData,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: body,
        runAt: runAt?.toISOString(),
      };

      const result = await createJob(jobData);

      if (result.success) {
        router.push('/jobs');
      } else {
        setError(result.error || 'Failed to create job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON in headers or body');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900">Basic Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="queue">Queue Name</Label>
              <Input
                id="queue"
                value={formData.queue}
                onChange={(e) => setFormData({ ...formData, queue: e.target.value })}
                placeholder="default"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Job Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => {
                  if (value) setFormData({ ...formData, type: value as 'immediate' | 'delayed' | 'cron' });
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="cron">Cron/Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="0"
                max="10"
                value={formData.maxRetries}
                onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {formData.type === 'delayed' && (
            <div className="space-y-2">
              <Label htmlFor="delay">Delay (minutes)</Label>
              <Input
                id="delay"
                type="number"
                min="1"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                placeholder="5"
              />
            </div>
          )}

          {formData.type === 'cron' && (
            <div className="space-y-2">
              <Label htmlFor="cron">Cron Expression</Label>
              <Select 
                value={cronExpression} 
                onValueChange={(value) => setCronExpression(value || 'every-5-minutes')}
              >
                <SelectTrigger id="cron">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="every-1-minutes">Every 1 minute</SelectItem>
                  <SelectItem value="every-5-minutes">Every 5 minutes</SelectItem>
                  <SelectItem value="every-15-minutes">Every 15 minutes</SelectItem>
                  <SelectItem value="every-30-minutes">Every 30 minutes</SelectItem>
                  <SelectItem value="every-1-hours">Every 1 hour</SelectItem>
                  <SelectItem value="every-2-hours">Every 2 hours</SelectItem>
                  <SelectItem value="daily-00:00">Daily at 00:00 UTC</SelectItem>
                  <SelectItem value="daily-12:00">Daily at 12:00 UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900">HTTP Request Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://api.example.com/webhook"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">HTTP Method</Label>
            <Select
              value={formData.method}
              onValueChange={(value) => {
                if (value) setFormData({ ...formData, method: value as HttpMethod });
              }}
            >
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headers">Headers (JSON)</Label>
            <Textarea
              id="headers"
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body (JSON)</Label>
            <Textarea
              id="body"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder='{"key": "value", "data": "example"}'
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="font-normal">
          {isSubmitting ? 'Creating Job...' : 'Create Job'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/jobs')}
          className="font-normal"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
