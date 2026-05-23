"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Processor } from "@/types/job";
import { buildTestDataFromDefaults } from "@/lib/params";
import { deleteProcessor, testProcessor } from "@/app/actions/processors";
import { ExecutionOutput } from "@/components/execution-output";
import { Code2, Globe, Trash2, FlaskConical, Plus, Pencil } from "lucide-react";

interface ProcessorsListProps {
  initialProcessors: Processor[];
  onReload?: () => void | Promise<void>;
}

export function ProcessorsList({
  initialProcessors,
  onReload,
}: ProcessorsListProps) {
  const router = useRouter();
  const [processors, setProcessors] = useState(initialProcessors);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processorToDelete, setProcessorToDelete] = useState<string | null>(
    null,
  );
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingProcessor, setTestingProcessor] = useState<string | null>(null);

  useEffect(() => {
    setProcessors(initialProcessors);
  }, [initialProcessors]);

  const handleDelete = async () => {
    if (!processorToDelete) return;

    const result = await deleteProcessor(processorToDelete);
    if (result.success) {
      setProcessors(processors.filter((p) => p.name !== processorToDelete));
      setDeleteDialogOpen(false);
      setProcessorToDelete(null);
      void onReload?.();
    }
  };

  const handleTest = async (processor: Processor) => {
    setTestingProcessor(processor.name);

    const defaults = processor.config.paramDefaults ?? {};
    const testData =
      Object.keys(defaults).length > 0
        ? buildTestDataFromDefaults(defaults)
        : {};

    const result = await testProcessor(processor.name, testData);

    setTestResults({
      ...testResults,
      [processor.name]: result,
    });
    setTestingProcessor(null);
  };

  const getIcon = (type: string) => {
    return type === "script" ? (
      <Code2 className="h-4 w-4" />
    ) : (
      <Globe className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processors</h1>
          <p className="text-muted-foreground mt-1">
            Reusable job execution logic
          </p>
        </div>
        <Button onClick={() => router.push("/actions/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Processor
        </Button>
      </div>

      {processors.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No processors yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first processor to define reusable job logic
              </p>
              <Button onClick={() => router.push("/actions/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Processor
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {processors.map((processor) => (
            <Card key={processor.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">
                        {processor.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {getIcon(processor.type)}
                        {processor.type === "http_ping"
                          ? "ping"
                          : processor.type}
                      </Badge>
                    </div>
                    {processor.description && (
                      <CardDescription>{processor.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/actions/${encodeURIComponent(processor.name)}/edit`,
                        )
                      }
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(processor)}
                      disabled={testingProcessor === processor.name}
                    >
                      <FlaskConical className="h-4 w-4 mr-1" />
                      {testingProcessor === processor.name
                        ? "Testing..."
                        : "Test"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProcessorToDelete(processor.name);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processor.type === "script" &&
                    "script" in processor.config && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Script</h4>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                          {processor.config.script}
                        </pre>
                      </div>
                    )}
                  {(processor.type === "http" ||
                    processor.type === "http_ping") &&
                    "url" in processor.config && (
                      <div className="space-y-2">
                        <div className="flex gap-4">
                          <div>
                            <h4 className="text-sm font-medium">Method</h4>
                            <Badge variant="outline">
                              {processor.config.method}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium">URL</h4>
                            <code className="text-sm">
                              {processor.config.url}
                            </code>
                          </div>
                        </div>
                        {processor.config.headers && (
                          <div>
                            <h4 className="text-sm font-medium">Headers</h4>
                            <pre className="bg-muted p-2 rounded text-xs">
                              {JSON.stringify(
                                processor.config.headers,
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                  {testResults[processor.name] && (
                    <div className="space-y-3 pt-2 border-t">
                      <h4 className="text-sm font-medium">Test result</h4>
                      {testResults[processor.name].success ? (
                        <ExecutionOutput
                          title="Test output"
                          value={testResults[processor.name].data}
                          borderClassName="border-emerald-200"
                          titleClassName="text-emerald-700"
                        />
                      ) : (
                        <pre className="p-3 rounded text-xs overflow-x-auto bg-red-50 text-red-900 font-mono whitespace-pre-wrap">
                          {testResults[processor.name].error ?? "Test failed"}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Processor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete processor &quot;
              {processorToDelete}&quot;? Jobs using this processor will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
