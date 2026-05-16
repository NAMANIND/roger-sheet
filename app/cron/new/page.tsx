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
import { HttpMethod } from '@/types/job';
import { createCronJob } from '@/app/actions/cron';

export default function NewCronJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    queue: 'default',
    cronExpression: 'every-5-minutes',
    url: '',
    method: 'POST' as HttpMethod,
  });

  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');

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

      const result = await createCronJob({
        name: formData.name,
        queue: formData.queue,
        cronExpression: formData.cronExpression,
        url: formData.url,
        method: formData.method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: body,
      });

      if (result.success) {
        router.push('/cron');
      } else {
        setError(result.error || 'Failed to create cron job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON in headers or body');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-gray-900">
          Create Cron Job
        </h1>
        <p className="text-gray-500 mt-1 text-sm font-light">
          Set up a recurring scheduled job
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900">
              Basic Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Job Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Daily Health Check"
                required
              />
            </div>

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
                <Label htmlFor="schedule">Schedule</Label>
                <Select
                  value={formData.cronExpression}
                  onValueChange={(value) => {
                    if (value) setFormData({ ...formData, cronExpression: value });
                  }}
                >
                  <SelectTrigger id="schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="every-1-minutes">Every 1 minute</SelectItem>
                    <SelectItem value="every-5-minutes">Every 5 minutes</SelectItem>
                    <SelectItem value="every-15-minutes">Every 15 minutes</SelectItem>
                    <SelectItem value="every-30-minutes">Every 30 minutes</SelectItem>
                    <SelectItem value="every-1-hours">Every 1 hour</SelectItem>
                    <SelectItem value="every-2-hours">Every 2 hours</SelectItem>
                    <SelectItem value="every-6-hours">Every 6 hours</SelectItem>
                    <SelectItem value="every-12-hours">Every 12 hours</SelectItem>
                    <SelectItem value="daily-00:00">Daily at 00:00 UTC</SelectItem>
                    <SelectItem value="daily-06:00">Daily at 06:00 UTC</SelectItem>
                    <SelectItem value="daily-09:00">Daily at 09:00 UTC</SelectItem>
                    <SelectItem value="daily-12:00">Daily at 12:00 UTC</SelectItem>
                    <SelectItem value="daily-18:00">Daily at 18:00 UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900">
              HTTP Request Configuration
            </CardTitle>
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
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body (JSON)</Label>
              <Textarea
                id="body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder='{"key": "value"}'
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
            {isSubmitting ? 'Creating...' : 'Create Cron Job'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/cron')}
            className="font-normal"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
