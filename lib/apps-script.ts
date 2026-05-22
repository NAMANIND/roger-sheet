import { ApiResponse } from '@/types/job';

const APPS_SCRIPT_TIMEOUT_MS = 20_000;

export async function callAppsScript<T>(
  action: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;
  if (!url) {
    return {
      success: false,
      error: 'APPS_SCRIPT_WEB_APP_URL is not set in .env.local',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error:
          'Apps Script request timed out (20s). Check your web app URL, deployment, and that the script responds.',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
