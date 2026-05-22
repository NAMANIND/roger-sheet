'use server';

import {
  Processor,
  CreateProcessorRequest,
  ApiResponse,
} from '@/types/job';
import { callAppsScript } from '@/lib/apps-script';

export async function createProcessor(
  request: CreateProcessorRequest
): Promise<ApiResponse<Processor>> {
  return callAppsScript<Processor>('createProcessor', request);
}

export async function getProcessors(): Promise<ApiResponse<Processor[]>> {
  return callAppsScript<Processor[]>('getProcessors');
}

export async function getProcessor(
  name: string
): Promise<ApiResponse<Processor>> {
  return callAppsScript<Processor>('getProcessor', { name });
}

export async function updateProcessor(
  name: string,
  config: unknown,
  description?: string
): Promise<ApiResponse<Processor>> {
  return callAppsScript<Processor>('updateProcessor', { name, config, description });
}

export async function deleteProcessor(
  name: string
): Promise<ApiResponse<void>> {
  return callAppsScript<void>('deleteProcessor', { name });
}

export async function testProcessor(
  name: string,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return callAppsScript('testProcessor', { name, testData });
}

export async function testProcessorDraft(
  type: 'http' | 'script',
  config: Record<string, unknown>,
  testData?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return callAppsScript('testProcessorDraft', { type, config, testData });
}
