import type { ApiResponse } from '@/types/job';

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function fail<T = never>(error: string): ApiResponse<T> {
  return { success: false, error };
}

export async function requireExecutor<T>(
  result: ApiResponse<T>,
  rollback?: () => Promise<unknown>
): Promise<ApiResponse<T>> {
  if (!result.success && rollback) {
    await rollback().catch(() => undefined);
  }
  return result;
}
