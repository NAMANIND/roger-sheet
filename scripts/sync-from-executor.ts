/**
 * One-shot or cron: push outbox + pull from Sheets.
 * Requires DATABASE_URL, APPS_SCRIPT_WEB_APP_URL, INTERNAL_API_SECRET (for HTTP only).
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { runSync } from '../lib/services/sync-run';

async function main() {
  const result = await runSync({ push: true, pull: true });
  if (!result.success) {
    console.error(result.error ?? 'Sync failed');
    process.exit(1);
  }
  console.log('Sync OK:', JSON.stringify(result.data, null, 2));
}

main();
