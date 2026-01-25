import { fetchTramPositions } from './tram-api.js';
import { processNotifications } from './notification.js';
import { cleanOldNotificationHistory } from '../db/queries.js';

let isPolling = false;
let pollIntervalId: NodeJS.Timeout | null = null;

/**
 * Single poll iteration: fetch tram positions and process notifications
 */
export async function pollOnce(): Promise<{
  success: boolean;
  tramCount: number;
  notificationCount: number;
  error?: string;
}> {
  try {
    // Fetch current tram positions
    const trams = await fetchTramPositions();

    // Process notifications based on positions
    const notificationCount = await processNotifications(trams);

    return {
      success: true,
      tramCount: trams.length,
      notificationCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Poll error:', errorMessage);

    return {
      success: false,
      tramCount: 0,
      notificationCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Start continuous polling at specified interval
 */
export function startPolling(intervalMs: number = 30000): void {
  if (isPolling) {
    console.warn('Polling is already running');
    return;
  }

  isPolling = true;
  console.log(`Starting polling with interval: ${intervalMs}ms`);

  // Run immediately, then at intervals
  pollOnce().then((result) => {
    console.log(`Initial poll: ${result.tramCount} trams, ${result.notificationCount} notifications`);
  });

  pollIntervalId = setInterval(async () => {
    const result = await pollOnce();
    if (!result.success) {
      console.error(`Poll failed: ${result.error}`);
    } else if (result.notificationCount > 0) {
      console.log(`Poll: sent ${result.notificationCount} notifications`);
    }
  }, intervalMs);
}

/**
 * Stop continuous polling
 */
export function stopPolling(): void {
  if (!isPolling || !pollIntervalId) {
    return;
  }

  clearInterval(pollIntervalId);
  pollIntervalId = null;
  isPolling = false;
  console.log('Polling stopped');
}

/**
 * Check if polling is currently active
 */
export function isPollingActive(): boolean {
  return isPolling;
}

/**
 * Cleanup task: remove old notification history records
 */
export async function cleanupTask(): Promise<number> {
  try {
    const deletedCount = await cleanOldNotificationHistory(24);
    console.log(`Cleaned up ${deletedCount} old notification history records`);
    return deletedCount;
  } catch (error) {
    console.error('Cleanup error:', error);
    return 0;
  }
}

/**
 * Check if current time is within operating hours
 * Kumamoto tram operates roughly 6:00 AM - 11:00 PM
 */
export function isWithinOperatingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();

  // Operating hours: 6 AM to 11 PM (23:00)
  return hour >= 6 && hour < 23;
}

/**
 * Smart polling: only poll during operating hours
 */
export async function smartPoll(): Promise<{
  success: boolean;
  skipped: boolean;
  tramCount: number;
  notificationCount: number;
  error?: string;
}> {
  if (!isWithinOperatingHours()) {
    return {
      success: true,
      skipped: true,
      tramCount: 0,
      notificationCount: 0,
    };
  }

  const result = await pollOnce();
  return {
    ...result,
    skipped: false,
  };
}
