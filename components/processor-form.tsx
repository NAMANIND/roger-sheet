'use client';

import { useMemo, useState } from 'react';
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
import {
  Processor,
  ProcessorType,
  HttpMethod,
  HttpProcessorConfig,
  ScriptProcessorConfig,
  CreateProcessorRequest,
} from '@/types/job';
import {
  createProcessor,
  updateProcessor,
  testProcessorDraft,
} from '@/app/actions/processors';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutionOutput } from '@/components/execution-output';
import { ParamFieldsEditor, ParamPair } from '@/components/param-fields-editor';
import { ParamScriptEditor } from '@/components/param-script-editor';
import {
  ParamUsageSummary,
  TemplateHighlight,
  getUsedRefsFromText,
} from '@/components/template-highlight';
import {
  buildTestDataFromDefaults,
  collectHttpConfigRefs,
  definitionsFromPairs,
  extractScriptDataRefs,
  isValidParamName,
  normalizeParamName,
  pairsFromDefinitions,
  validateParamUsage,
} from '@/lib/params';
import { X, Play } from 'lucide-react';

interface KeyValuePair {
  key: string;
  value: string;
}

interface ProcessorFormProps {
  processor?: Processor;
}

const DEFAULT_SCRIPT = `// Access job data via 'data' parameter
log('Processing job with data:', data);

// Example: Validate email
const response = fetch('https://vemail.vercel.app/validate?email=' + data.email, {
  method: 'GET'
});

log('Validation status: ' + response.status);
const result = parseJSON(response.body);
log('Email valid: ' + result.isValid);

return {
  success: true,
  isValid: result.isValid
};`;

function objectToPairs(obj: Record<string, unknown> | null | undefined): KeyValuePair[] {
  if (!obj || typeof obj !== 'object') {
    return [{ key: '', value: '' }];
  }
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return [{ key: '', value: '' }];
  }
  return entries.map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
}

function pairsToObject(pairs: KeyValuePair[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  pairs.forEach((pair) => {
    if (pair.key.trim()) {
      try {
        obj[pair.key] = JSON.parse(pair.value);
      } catch {
        obj[pair.key] = pair.value;
      }
    }
  });
  return obj;
}

function getParamPairsFromConfig(config: HttpProcessorConfig | ScriptProcessorConfig): ParamPair[] {
  return pairsFromDefinitions(config.params, config.paramDefaults);
}

function getInitialFormState(processor?: Processor) {
  if (!processor) {
    return {
      name: '',
      description: '',
      processorType: 'script' as ProcessorType,
      script: DEFAULT_SCRIPT,
      url: '',
      method: 'POST' as HttpMethod,
      headerPairs: [{ key: 'Content-Type', value: 'application/json' }],
      bodyPairs: [{ key: '', value: '' }],
      headersText: '{"Content-Type": "application/json"}',
      bodyText: '',
      urlTemplate: true,
      paramPairs: [{ key: 'email', value: 'test@example.com' }] as ParamPair[],
    };
  }

  const description = processor.description || '';
  const paramPairs = getParamPairsFromConfig(processor.config);

  if (processor.type === 'script' && 'script' in processor.config) {
    return {
      name: processor.name,
      description,
      processorType: 'script' as ProcessorType,
      script: processor.config.script,
      url: '',
      method: 'POST' as HttpMethod,
      headerPairs: [{ key: 'Content-Type', value: 'application/json' }],
      bodyPairs: [{ key: '', value: '' }],
      headersText: '{}',
      bodyText: '',
      urlTemplate: false,
      paramPairs,
    };
  }

  const http = processor.config as HttpProcessorConfig;
  return {
    name: processor.name,
    description,
    processorType: (processor.type === 'http_ping' ? 'http_ping' : 'http') as ProcessorType,
    script: DEFAULT_SCRIPT,
    url: http.url || '',
    method: http.method || 'POST',
    headerPairs: objectToPairs(http.headers as Record<string, unknown>),
    bodyPairs: objectToPairs(http.body as Record<string, unknown>),
    headersText: JSON.stringify(http.headers ?? {}, null, 2),
    bodyText: http.body ? JSON.stringify(http.body, null, 2) : '',
    urlTemplate: http.urlTemplate ?? true,
    paramPairs,
  };
}

type InsertTarget =
  | 'url'
  | 'script'
  | 'headersText'
  | 'headerValue'
  | 'bodyText'
  | 'bodyValue';

export function ProcessorForm({ processor }: ProcessorFormProps) {
  const isEdit = !!processor;
  const initial = getInitialFormState(processor);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [processorType, setProcessorType] = useState<ProcessorType>(initial.processorType);
  const [script, setScript] = useState(initial.script);
  const [url, setUrl] = useState(initial.url);
  const [method, setMethod] = useState<HttpMethod>(initial.method);
  const [headerPairs, setHeaderPairs] = useState<KeyValuePair[]>(initial.headerPairs);
  const [bodyPairs, setBodyPairs] = useState<KeyValuePair[]>(initial.bodyPairs);
  const [headersText, setHeadersText] = useState(initial.headersText);
  const [bodyText, setBodyText] = useState(initial.bodyText);
  const [headerMode, setHeaderMode] = useState<'simple' | 'json'>('simple');
  const [bodyMode, setBodyMode] = useState<'simple' | 'json'>('simple');
  const [urlTemplate, setUrlTemplate] = useState(initial.urlTemplate);
  const [paramPairs, setParamPairs] = useState<ParamPair[]>(initial.paramPairs);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget>('url');
  const [bodyInsertIndex, setBodyInsertIndex] = useState(0);
  const [headerInsertIndex, setHeaderInsertIndex] = useState(0);

  const { params: definedParams, paramDefaults } = useMemo(
    () => definitionsFromPairs(paramPairs),
    [paramPairs]
  );

  const httpBodyPreview = useMemo(() => {
    if (method === 'GET') return '';
    if (bodyMode === 'json') return bodyText;
    const obj = pairsToObject(bodyPairs);
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';
  }, [method, bodyMode, bodyText, bodyPairs]);

  const httpHeadersPreview = useMemo(() => {
    if (headerMode === 'json') return headersText;
    const obj = pairsToObject(headerPairs);
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';
  }, [headerMode, headersText, headerPairs]);

  const httpUsedRefs = useMemo(() => {
    if (processorType !== 'http' && processorType !== 'http_ping') return [];
    return collectHttpConfigRefs({
      url,
      headers: headerMode === 'simple' ? (pairsToObject(headerPairs) as Record<string, string>) : undefined,
      body: bodyMode === 'simple' ? pairsToObject(bodyPairs) : undefined,
      headersText: headerMode === 'json' ? headersText : undefined,
      bodyText: bodyMode === 'json' ? bodyText : undefined,
    });
  }, [processorType, url, headerMode, headerPairs, headersText, bodyMode, bodyPairs, bodyText]);

  const scriptUsedRefs = useMemo(
    () => (processorType === 'script' ? extractScriptDataRefs(script) : []),
    [processorType, script]
  );

  const insertParam = (paramName: string, format: 'brace' | 'data') => {
    const token = format === 'brace' ? `{${paramName}}` : `data.${paramName}`;
    switch (insertTarget) {
      case 'url':
        setUrl((v) => v + token);
        break;
      case 'script':
        setScript((v) => v + token);
        break;
      case 'headersText':
        setHeadersText((v) => v + token);
        setHeaderMode('json');
        break;
      case 'bodyText':
        setBodyText((v) => v + token);
        setBodyMode('json');
        break;
      case 'headerValue': {
        const next = [...headerPairs];
        next[headerInsertIndex] = {
          ...next[headerInsertIndex],
          value: (next[headerInsertIndex]?.value || '') + token,
        };
        setHeaderPairs(next);
        setHeaderMode('simple');
        break;
      }
      case 'bodyValue': {
        const next = [...bodyPairs];
        next[bodyInsertIndex] = {
          ...next[bodyInsertIndex],
          value: (next[bodyInsertIndex]?.value || '') + token,
        };
        setBodyPairs(next);
        setBodyMode('simple');
        break;
      }
    }
  };

  const validateParamsBeforeSave = (): string | null => {
    const invalidNames = paramPairs
      .filter((p) => p.key.trim())
      .map((p) => normalizeParamName(p.key))
      .filter((n) => n && !isValidParamName(n));
    if (invalidNames.length > 0) {
      return 'Parameter names must be letters, numbers, or underscore';
    }

    const used =
      processorType === 'http' || processorType === 'http_ping'
        ? httpUsedRefs
        : scriptUsedRefs;
    const { unknown } = validateParamUsage(definedParams, used);
    if (unknown.length > 0) {
      const hint =
        processorType === 'http' || processorType === 'http_ping'
          ? unknown.map((p) => `{${p}}`).join(', ')
          : unknown.map((p) => `data.${p}`).join(', ');
      return `Unknown parameters in config: ${hint}. Add them in Parameters first.`;
    }
    return null;
  };

  const buildConfigPayload = (): HttpProcessorConfig | ScriptProcessorConfig => {
    const schema = { params: definedParams, paramDefaults };

    if (processorType === 'script') {
      return { script, ...schema };
    }

    let headers: Record<string, string> = {};
    if (headerMode === 'simple') {
      headers = pairsToObject(headerPairs) as Record<string, string>;
    } else if (headersText.trim()) {
      headers = JSON.parse(headersText);
    }

    let body: unknown = null;
    if (method !== 'GET') {
      if (bodyMode === 'simple') {
        const bodyObj = pairsToObject(bodyPairs);
        body = Object.keys(bodyObj).length > 0 ? bodyObj : null;
      } else if (bodyText.trim()) {
        body = JSON.parse(bodyText);
      }
    }

    return {
      url,
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body,
      urlTemplate,
      ...schema,
    };
  };

  const handleTest = async () => {
    const paramError = validateParamsBeforeSave();
    if (paramError) {
      setError(paramError);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const config = buildConfigPayload();
      const testData = buildTestDataFromDefaults(paramDefaults);

      const result = await testProcessorDraft(
        processorType,
        config as unknown as Record<string, unknown>,
        testData
      );

      setTestResult(result);
      if (!result.success) {
        setError(result.error || 'Test failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      setError(msg);
      setTestResult({ success: false, error: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const addHeaderPair = () => {
    setHeaderPairs([...headerPairs, { key: '', value: '' }]);
  };

  const removeHeaderPair = (index: number) => {
    setHeaderPairs(headerPairs.filter((_, i) => i !== index));
  };

  const updateHeaderPair = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...headerPairs];
    updated[index][field] = value;
    setHeaderPairs(updated);
  };

  const addBodyPair = () => {
    setBodyPairs([...bodyPairs, { key: '', value: '' }]);
  };

  const removeBodyPair = (index: number) => {
    setBodyPairs(bodyPairs.filter((_, i) => i !== index));
  };

  const updateBodyPair = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...bodyPairs];
    updated[index][field] = value;
    setBodyPairs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        throw new Error('Action name is required');
      }

      const paramError = validateParamsBeforeSave();
      if (paramError) throw new Error(paramError);

      let config: HttpProcessorConfig | ScriptProcessorConfig;

      if (processorType === 'script') {
        if (!script.trim()) throw new Error('Script code is required');
        config = buildConfigPayload() as ScriptProcessorConfig;
      } else {
        if (!url.trim()) throw new Error('URL is required');
        try {
          config = buildConfigPayload() as HttpProcessorConfig;
        } catch {
          throw new Error('Invalid JSON in headers or body');
        }
      }

      if (isEdit) {
        const result = await updateProcessor(
          name,
          config,
          description.trim() || undefined
        );

        if (result.success) {
          router.replace('/actions');
          return;
        } else {
          setError(result.error || 'Failed to update processor');
        }
      } else {
        const request: CreateProcessorRequest = {
          name,
          type: processorType,
          config,
          description: description.trim() || undefined,
        };

        const result = await createProcessor(request);

        if (result.success) {
          router.replace('/actions');
          return;
        } else {
          setError(result.error || 'Failed to create processor');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Processor Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="validate-email"
              required
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? 'Processor name cannot be changed'
                : 'Unique identifier for this processor'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Validates email addresses"
            />
          </div>

          <ParamFieldsEditor
            pairs={paramPairs}
            onChange={setParamPairs}
            onInsert={insertParam}
          />

          <Tabs
            value={processorType === 'script' ? 'script' : 'http'}
            onValueChange={(v) => {
              if (!isEdit) setProcessorType(v === 'script' ? 'script' : 'http');
            }}
          >
            {!isEdit && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="script">Custom Script</TabsTrigger>
                <TabsTrigger value="http">HTTP Request</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="script" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="script">JavaScript Code</Label>
                <ParamScriptEditor
                  id="script"
                  value={script}
                  onChange={setScript}
                  onFocus={() => setInsertTarget('script')}
                  definedParams={definedParams}
                  rows={16}
                  placeholder="// Use data.paramName for parameters you defined above"
                />
                <ParamUsageSummary
                  definedParams={definedParams}
                  usedRefs={scriptUsedRefs}
                  mode="script"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Available functions:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><code>fetch(url, options)</code> - Make HTTP requests</li>
                    <li><code>log(message)</code> - Log messages</li>
                    <li><code>addJob(queue, processor, data, opts)</code> - Create jobs</li>
                    <li><code>parseJSON(str)</code>, <code>stringifyJSON(obj)</code></li>
                    <li><code>getProperty(key)</code>, <code>setProperty(key, val)</code></li>
                    <li><code>sleep(ms)</code> - Delay execution</li>
                  </ul>
                  <p className="mt-2">
                    Use <code>data.paramName</code> only for names defined in Parameters above.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="http" className="space-y-4">
              {!isEdit && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <p className="text-sm font-medium">Execution mode</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="httpMode"
                        checked={processorType === 'http'}
                        onChange={() => setProcessorType('http')}
                        className="h-4 w-4"
                      />
                      Full — logs and response in History
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="httpMode"
                        checked={processorType === 'http_ping'}
                        onChange={() => setProcessorType('http_ping')}
                        className="h-4 w-4"
                      />
                      Ping — fire webhook, no wait for response
                    </label>
                  </div>
                </div>
              )}
              {isEdit && processorType === 'http_ping' && (
                <p className="text-sm text-muted-foreground">
                  Ping action — webhook is fired from the platform without waiting for a response.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onFocus={() => setInsertTarget('url')}
                  placeholder="https://api.example.com/users/{userId}"
                  type="url"
                  className="font-mono text-sm"
                />
                <TemplateHighlight text={url} definedParams={definedParams} mode="brace" />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="urlTemplate"
                    checked={urlTemplate}
                    onChange={(e) => setUrlTemplate(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="urlTemplate" className="text-sm font-normal cursor-pointer">
                    Substitute {'{param}'} placeholders from job data
                  </Label>
                </div>
              </div>

              <ParamUsageSummary
                definedParams={definedParams}
                usedRefs={httpUsedRefs}
                mode="brace"
              />

              <div className="space-y-2">
                <Label htmlFor="method">HTTP Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={headerMode} onValueChange={(v) => setHeaderMode(v as 'simple' | 'json')}>
                <div className="flex items-center justify-between mb-2">
                  <Label>Headers</Label>
                  <TabsList className="h-8">
                    <TabsTrigger value="simple" className="text-xs px-3">Simple</TabsTrigger>
                    <TabsTrigger value="json" className="text-xs px-3">JSON</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="simple" className="space-y-3 mt-0">
                    {headerPairs.map((pair, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Header Name"
                          value={pair.key}
                          onChange={(e) => updateHeaderPair(index, 'key', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value or {param}"
                          value={pair.value}
                          onChange={(e) => updateHeaderPair(index, 'value', e.target.value)}
                          onFocus={() => {
                            setInsertTarget('headerValue');
                            setHeaderInsertIndex(index);
                          }}
                          className="flex-1 font-mono text-sm"
                        />
                        {headerPairs.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeHeaderPair(index)}
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
                      onClick={addHeaderPair}
                      className="w-full"
                    >
                      + Add Header
                    </Button>
                  <p className="text-xs text-muted-foreground">
                    Use {'{variable}'} for template values
                  </p>
                </TabsContent>
                
                <TabsContent value="json" className="mt-0 space-y-2">
                  <Textarea
                    value={headersText}
                    onChange={(e) => setHeadersText(e.target.value)}
                    onFocus={() => setInsertTarget('headersText')}
                    placeholder='{"Authorization": "Bearer {token}"}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <TemplateHighlight
                    text={headersText}
                    definedParams={definedParams}
                    mode="brace"
                  />
                </TabsContent>
              </Tabs>

              {method !== 'GET' && (
                <Tabs value={bodyMode} onValueChange={(v) => setBodyMode(v as 'simple' | 'json')}>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Request Body</Label>
                    <TabsList className="h-8">
                      <TabsTrigger value="simple" className="text-xs px-3">Simple</TabsTrigger>
                      <TabsTrigger value="json" className="text-xs px-3">JSON</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="simple" className="space-y-3 mt-0">
                      {bodyPairs.map((pair, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Field Name"
                            value={pair.key}
                            onChange={(e) => updateBodyPair(index, 'key', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Value or {param}"
                            value={pair.value}
                            onChange={(e) => updateBodyPair(index, 'value', e.target.value)}
                            onFocus={() => {
                              setInsertTarget('bodyValue');
                              setBodyInsertIndex(index);
                            }}
                            className="flex-1 font-mono text-sm"
                          />
                          {bodyPairs.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeBodyPair(index)}
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
                        onClick={addBodyPair}
                        className="w-full"
                      >
                        + Add Field
                      </Button>
                    <p className="text-xs text-muted-foreground">
                      Use {'{variable}'} in values (e.g. {'{content}'}). Job data must include a matching key named <code>content</code>.
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="json" className="mt-0 space-y-2">
                    <Textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      onFocus={() => setInsertTarget('bodyText')}
                      placeholder='{"message": "Hello {message}"}'
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <TemplateHighlight
                      text={bodyText}
                      definedParams={definedParams}
                      mode="brace"
                    />
                    <p className="text-xs text-muted-foreground">
                      Only {'{param}'} names from Parameters are allowed (green = ok, red = unknown).
                    </p>
                  </TabsContent>
                </Tabs>
              )}
            </TabsContent>
          </Tabs>

          <Card className="border-primary/20 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Test action
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Runs with parameter defaults above — no need to save first.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleTest}
                disabled={isTesting || definedParams.length === 0}
              >
                {isTesting ? 'Running…' : 'Run test'}
              </Button>
              {definedParams.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add at least one parameter to enable testing.
                </p>
              )}
              {testResult && (
                testResult.success ? (
                  <ExecutionOutput
                    title="Test output"
                    value={testResult.data}
                    borderClassName="border-emerald-200"
                    titleClassName="text-emerald-700"
                  />
                ) : (
                  <pre className="rounded-md p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap bg-red-50 text-red-900 border border-red-200">
                    {testResult.error || 'Test failed'}
                  </pre>
                )
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Action'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/actions')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
