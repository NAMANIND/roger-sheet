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

export async function getProcessor(id: string): Promise<ApiResponse<Processor>> {
  return actionService.getAction(id);
}

export async function updateProcessor(
  id: string,
  config: unknown,
  description?: string,
  type?: ProcessorType
): Promise<ApiResponse<Processor>> {
  return actionService.updateAction(id, config as never, description, type);
}

export async function deleteProcessor(
  id: string
): Promise<ApiResponse<void>> {
  return actionService.deleteAction(id);
}

export async function testProcessor(
  id: string,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return actionService.testAction(id, testData);
}

export async function testProcessorDraft(
  type: ProcessorType,
  config: Record<string, unknown>,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return actionService.testActionDraft(type, config, testData);
}
