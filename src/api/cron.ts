import { smartPoll, cleanupTask } from '../services/polling.js';

export interface CronResponse {
  statusCode: number;
  body: string;
}

/**
 * Cron job handler - runs periodically to poll tram positions and send notifications
 */
export async function handleCron(): Promise<CronResponse> {
  console.log('Cron job started:', new Date().toISOString());

  try {
    const result = await smartPoll();

    if (result.skipped) {
      console.log('Poll skipped - outside operating hours');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'skipped', reason: 'outside_operating_hours' }),
      };
    }

    if (!result.success) {
      console.error('Poll failed:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({ status: 'error', error: result.error }),
      };
    }

    console.log(`Poll completed: ${result.tramCount} trams, ${result.notificationCount} notifications`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        tramCount: result.tramCount,
        notificationCount: result.notificationCount,
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron job error:', errorMessage);

    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', error: errorMessage }),
    };
  }
}

/**
 * Cleanup cron handler - runs daily to clean old notification history
 */
export async function handleCleanup(): Promise<CronResponse> {
  console.log('Cleanup job started:', new Date().toISOString());

  try {
    const deletedCount = await cleanupTask();

    console.log(`Cleanup completed: ${deletedCount} records deleted`);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', deletedCount }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cleanup job error:', errorMessage);

    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', error: errorMessage }),
    };
  }
}

/**
 * Vercel serverless function handler for main polling cron
 */
export default async function handler(
  req: { headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
): Promise<void> {
  // Verify cron secret (optional but recommended)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await handleCron();
  res.status(result.statusCode).json(JSON.parse(result.body));
}
