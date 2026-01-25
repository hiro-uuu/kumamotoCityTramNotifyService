import { fetchTramPositions } from '../services/tram-api.js';
import { sendMorningNotifications } from '../services/notification.js';

export interface CronResponse {
  statusCode: number;
  body: string;
}

/**
 * Morning cron job handler - sends daily notification at 7:25 JST
 * with next 2 trams for each user's configured stations
 */
export async function handleMorningCron(): Promise<CronResponse> {
  console.log('Morning cron job started:', new Date().toISOString());

  try {
    // Fetch current tram positions
    const trams = await fetchTramPositions();
    console.log(`Fetched ${trams.length} tram positions`);

    // Send morning notifications to all users
    const notificationCount = await sendMorningNotifications(trams);

    console.log(`Morning notifications sent: ${notificationCount} users`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        tramCount: trams.length,
        notificationCount,
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Morning cron job error:', errorMessage);

    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', error: errorMessage }),
    };
  }
}

/**
 * Vercel serverless function handler for morning cron
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

  const result = await handleMorningCron();
  res.status(result.statusCode).json(JSON.parse(result.body));
}
