import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatDisplayJson,
  splitExecutionOutput,
} from '@/lib/job-data';
import { cn } from '@/lib/utils';

function PreBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        'rounded-md p-4 text-xs overflow-auto max-h-80 whitespace-pre-wrap font-mono',
        className
      )}
    >
      {children}
    </pre>
  );
}

interface ExecutionOutputProps {
  title?: string;
  value: unknown;
  borderClassName?: string;
  titleClassName?: string;
  emptyMessage?: string;
}

export function ExecutionOutput({
  title = 'Output',
  value,
  borderClassName,
  titleClassName,
  emptyMessage = 'No output recorded.',
}: ExecutionOutputProps) {
  const { logs, outputs, result, statusCode } = splitExecutionOutput(value);
  const hasLogs = logs.length > 0;
  const hasOutputs = outputs && outputs.length > 0;
  const hasResult =
    result !== null &&
    result !== undefined &&
    (typeof result !== 'string' || result.trim() !== '');
  const hasAnything = hasLogs || hasOutputs || hasResult || statusCode != null;

  if (!hasAnything) {
    return (
      <Card className={borderClassName}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-sm font-medium', titleClassName)}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {statusCode != null && (
        <p className="text-sm text-muted-foreground">
          HTTP status:{' '}
          <span className="font-medium text-foreground">{statusCode}</span>
        </p>
      )}

      {hasLogs && (
        <Card className={borderClassName}>
          <CardHeader className="pb-3">
            <CardTitle className={cn('text-sm font-medium', titleClassName)}>
              Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PreBlock className="bg-muted text-foreground">
              {logs.join('\n')}
            </PreBlock>
          </CardContent>
        </Card>
      )}

      {hasOutputs && (
        <Card className={borderClassName}>
          <CardHeader className="pb-3">
            <CardTitle className={cn('text-sm font-medium', titleClassName)}>
              Outputs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PreBlock className="bg-muted text-foreground">
              {formatDisplayJson(outputs)}
            </PreBlock>
          </CardContent>
        </Card>
      )}

      <Card className={borderClassName}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-sm font-medium', titleClassName)}>
            Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasResult ? (
            <PreBlock className="bg-emerald-50 text-emerald-900">
              {formatDisplayJson(result)}
            </PreBlock>
          ) : (
            <p className="text-sm text-muted-foreground">No return value.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
