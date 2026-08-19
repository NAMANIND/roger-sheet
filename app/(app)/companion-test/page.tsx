'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  extension,
  diagnoseRogerAiCompanionFlow,
  fetchRogerCompanionStatus,
  getCompanionGateSnapshot,
  type RogerCompanionResponse,
} from '@/lib/roger-companion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

type ManualPingState = {
  at: string;
  result: RogerCompanionResponse | { error: string };
} | null;

function PassFail({ pass }: { pass: boolean }) {
  return pass ? (
    <CheckCircle2 className="size-4 text-green-600 shrink-0" />
  ) : (
    <XCircle className="size-4 text-red-600 shrink-0" />
  );
}

export default function CompanionTestPage() {
  const [userId, setUserId] = useState('');
  const [extensionVersion, setExtensionVersion] = useState('');
  const [extensionId, setExtensionId] = useState(extension.id);
  const [simulateAuthenticated, setSimulateAuthenticated] = useState(true);
  const [gate, setGate] = useState(() => getCompanionGateSnapshot());
  const [manualPing, setManualPing] = useState<ManualPingState>(null);
  const [manualRunning, setManualRunning] = useState(false);

  const refreshGate = useCallback(() => {
    setGate(getCompanionGateSnapshot());
  }, []);

  useEffect(() => {
    refreshGate();
    const onFocus = () => refreshGate();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshGate]);

  const queryEnabled = gate.queryEnabled;

  const { data, isLoading, isError, error, isFetched, refetch, dataUpdatedAt, fetchStatus } =
    useQuery({
      queryKey: ['roger-companion-status', userId, extensionVersion, extensionId],
      queryFn: () =>
        fetchRogerCompanionStatus(
          userId || undefined,
          extensionVersion || null,
          extensionId || undefined,
        ),
      refetchInterval: 60000,
      refetchOnWindowFocus: true,
      enabled: queryEnabled,
    });

  const diagnosis = useMemo(
    () =>
      diagnoseRogerAiCompanionFlow({
        gate,
        isAuthenticated: simulateAuthenticated,
        isExtensionLinkedIn: true,
        isUnipileCredentialsRequired: false,
        isFetched,
        pingData: data,
        queryError: isError ? String(error) : null,
      }),
    [gate, simulateAuthenticated, isFetched, data, isError, error],
  );

  const runManual = useCallback(async () => {
    setManualRunning(true);
    refreshGate();
    try {
      const response = await fetchRogerCompanionStatus(
        userId || undefined,
        extensionVersion || null,
        extensionId || undefined,
      );
      setManualPing({ at: new Date().toISOString(), result: response });
    } catch (err) {
      setManualPing({
        at: new Date().toISOString(),
        result: { error: err instanceof Error ? err.message : String(err) },
      });
    } finally {
      setManualRunning(false);
      refreshGate();
    }
  }, [userId, extensionVersion, extensionId, refreshGate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companion test</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reproduces <strong>current</strong> rogerAI behavior — no fix applied here. Toggle
          extension off, hard refresh, watch which step fails.
        </p>
      </div>

      {diagnosis.showBanner && (
        <div className="border border-red-200 bg-red-50 rounded-md">
          <div className="px-4 py-2 flex items-center justify-center gap-2">
            <XCircle className="size-4 text-red-600 shrink-0" />
            <p className="text-sm font-medium text-red-800">
              Preview: LinkedIn banner would show — Your LinkedIn connection needs attention.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Outcome</CardTitle>
          <CardDescription>What rogerAI would do right now on this page load.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={diagnosis.showBanner ? 'destructive' : 'secondary'}>
              showBanner: {diagnosis.showBanner ? 'true' : 'false'}
            </Badge>
            <Badge variant={queryEnabled ? 'default' : 'destructive'}>
              auto query: {queryEnabled ? 'enabled' : 'disabled'}
            </Badge>
            <Badge variant="outline">
              fetch: {fetchStatus}
              {isLoading ? ' (loading)' : ''}
            </Badge>
          </div>
          {diagnosis.blockedAt && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Decision: </span>
              {diagnosis.blockedAt}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnosis pipeline</CardTitle>
          <CardDescription>Same gates as useRogerCompanion in rogerAI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {diagnosis.steps.map((step) => (
            <div
              key={step.id}
              className="flex gap-3 items-start rounded-md border px-3 py-2 text-sm"
            >
              <PassFail pass={step.pass} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                {step.codeRef && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{step.codeRef}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">NEXT_PUBLIC_EXTENSION_ID</dt>
              <dd className="font-mono text-xs break-all mt-0.5">{extension.id || '(empty)'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">NEXT_PUBLIC_EXTENSION_URL</dt>
              <dd className="font-mono text-xs break-all mt-0.5">
                {extension.url ? (
                  <a href={extension.url} className="underline text-primary" target="_blank" rel="noreferrer">
                    {extension.url}
                  </a>
                ) : (
                  '(empty)'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Page origin</dt>
              <dd className="font-mono text-xs mt-0.5">{gate.origin}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Auto ping last success</dt>
              <dd className="font-mono text-xs mt-0.5">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto ping (react-query)</CardTitle>
          <CardDescription>
            enabled = hasUserId && !impersonating && EXTENSION && extensionCheckable — matches
            rogerAI line 203.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={simulateAuthenticated}
              onChange={(e) => setSimulateAuthenticated(e.target.checked)}
            />
            Simulate isAuthenticated (linkedinConnected from GET /linkedin/auth-status)
          </label>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Ping status</dt>
              <dd className="font-mono text-xs">{data?.status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">lastError from extension</dt>
              <dd className="font-mono text-xs break-all">{data?.error ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">isFetched</dt>
              <dd className="font-mono text-xs">{isFetched}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">sendMessage</dt>
              <dd className="font-mono text-xs">{gate.chrome.sendMessage}</dd>
            </div>
          </dl>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={!queryEnabled}>
            Refetch now
          </Button>
          {!queryEnabled && (
            <p className="text-xs text-red-600">
              Auto ping disabled — extensionCheckable is false. This is the prod bug when
              sendMessage disappears after toggling extension off.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual ping</CardTitle>
          <CardDescription>
            Always calls sendMessage (bypasses query enabled). Use to see what extension returns
            even when auto ping is disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="extension-id">Extension ID</Label>
              <Input
                id="extension-id"
                value={extensionId}
                onChange={(e) => setExtensionId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-id">User ID</Label>
              <Input id="user-id" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="extension-version">Extension version</Label>
              <Input
                id="extension-version"
                value={extensionVersion}
                onChange={(e) => setExtensionVersion(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => void runManual()} disabled={manualRunning}>
            {manualRunning ? 'Pinging…' : 'Ping companion'}
          </Button>
          {manualPing && (
            <dl className="rounded-md border bg-muted/30 p-3 grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">At</dt>
                <dd className="font-mono text-xs">{manualPing.at}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="font-mono text-xs">
                  {'error' in manualPing.result
                    ? `error: ${manualPing.result.error}`
                    : manualPing.result.status ?? 'none'}
                </dd>
              </div>
              {'error' in manualPing.result ? null : (
                <div>
                  <dt className="text-xs text-muted-foreground">Full response</dt>
                  <dd className="font-mono text-xs break-all">
                    {JSON.stringify(manualPing.result)}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
