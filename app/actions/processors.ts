'use server';

import {
  Processor,
  CreateProcessorRequest,
  ApiResponse,
  ProcessorType,
} from '@/types/job';
import * as actionService from '@/lib/services/actions';

export async function createProcessor(
  request: CreateProcessorRequest
): Promise<ApiResponse<Processor>> {
  return actionService.createAction(request);
}

export async function getProcessors(): Promise<ApiResponse<Processor[]>> {
  return actionService.listActions();
}

export async function getProcessor(
  name: string
): Promise<ApiResponse<Processor>> {
  return actionService.getAction(name);
}

export async function updateProcessor(
  name: string,
  config: unknown,
  description?: string
): Promise<ApiResponse<Processor>> {
  return actionService.updateAction(name, config as never, description);
}

export async function deleteProcessor(
  name: string
): Promise<ApiResponse<void>> {
  return actionService.deleteAction(name);
}

export async function testProcessor(
  name: string,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return actionService.testAction(name, testData);
}

export async function testProcessorDraft(
  type: ProcessorType,
  config: Record<string, unknown>,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return actionService.testActionDraft(type, config, testData);
}
