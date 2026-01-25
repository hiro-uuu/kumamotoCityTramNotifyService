import { TramPosition, NotificationSetting, PendingNotification, Direction } from '../types/index.js';
import {
  getStationById,
  getOrderedStations,
  estimateMinutesToArrival,
  INTERVAL_TO_STATION_MAP,
} from '../data/stations.js';
import {
  getActiveNotificationSettings,
  hasRecentNotification,
  recordNotification,
  isWithinTimeRange,
  isOnActiveWeekday,
} from '../db/queries.js';
import { sendTramNotification, sendMorningNotification } from './line-client.js';
import { User } from '../types/index.js';

/**
 * Calculate the number of stops between a tram's current position and a target station
 */
function calculateStopsAway(
  tram: TramPosition,
  targetStationId: number,
  targetDirection: Direction
): number | null {
  // Get the tram's current interval info
  const intervalInfo = INTERVAL_TO_STATION_MAP.get(tram.interval_id);
  if (!intervalInfo) {
    return null;
  }

  // Check if tram direction matches target direction
  const tramDirection: Direction = tram.us === 0 ? 'up' : 'down';
  if (tramDirection !== targetDirection) {
    return null;
  }

  // Get ordered stations for the tram's line
  const orderedStations = getOrderedStations(tram.rosen);

  // Find indices
  const currentIndex = orderedStations.findIndex((s) => s.id === intervalInfo.station.id);
  const targetIndex = orderedStations.findIndex((s) => s.id === targetStationId);

  if (currentIndex === -1 || targetIndex === -1) {
    return null;
  }

  // Calculate distance based on direction
  let stopsAway: number;
  if (targetDirection === 'down') {
    // Going toward Kengunmachi (increasing index)
    stopsAway = targetIndex - currentIndex;
  } else {
    // Going up (decreasing index)
    stopsAway = currentIndex - targetIndex;
  }

  // Return null if tram has already passed the station
  if (stopsAway < 0) {
    return null;
  }

  return stopsAway;
}

/**
 * Check if a tram triggers a notification for a setting
 */
function checkTramTrigger(
  tram: TramPosition,
  setting: NotificationSetting
): { stopsAway: number } | null {
  const stopsAway = calculateStopsAway(tram, setting.station_id, setting.direction);

  if (stopsAway === null) {
    return null;
  }

  // Check if tram is at or within the trigger distance
  // We notify when the tram is exactly at trigger_stops away
  if (stopsAway === setting.trigger_stops) {
    return { stopsAway };
  }

  return null;
}

/**
 * Process all active settings against current tram positions
 */
export async function processNotifications(trams: TramPosition[]): Promise<number> {
  let notificationCount = 0;

  try {
    // Get all active notification settings with user info
    const activeSettings = await getActiveNotificationSettings();

    for (const settingWithUser of activeSettings) {
      const { user, ...setting } = settingWithUser;

      // Check time and weekday constraints
      if (!isWithinTimeRange(setting.start_time, setting.end_time)) {
        continue;
      }

      if (!isOnActiveWeekday(setting.weekdays)) {
        continue;
      }

      // Get station info
      const station = getStationById(setting.station_id);
      if (!station) {
        console.warn(`Station not found for setting ${setting.id}: ${setting.station_id}`);
        continue;
      }

      // Check each tram
      for (const tram of trams) {
        const trigger = checkTramTrigger(tram, setting);

        if (trigger) {
          // Check if we already notified for this tram recently
          const alreadyNotified = await hasRecentNotification(
            setting.id,
            tram.vehicle_id,
            30 // within 30 minutes
          );

          if (alreadyNotified) {
            continue;
          }

          // Build and send notification
          const pendingNotification: PendingNotification = {
            setting,
            user,
            station,
            tram,
            stopsAway: trigger.stopsAway,
            estimatedMinutes: estimateMinutesToArrival(trigger.stopsAway),
          };

          try {
            await sendTramNotification(pendingNotification);

            // Record the notification to prevent duplicates
            await recordNotification(setting.id, tram.vehicle_id);

            notificationCount++;
            console.log(
              `Sent notification to ${user.line_user_id} for station ${station.name}, vehicle ${tram.vehicle_id}`
            );
          } catch (error) {
            console.error(`Failed to send notification for setting ${setting.id}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing notifications:', error);
    throw error;
  }

  return notificationCount;
}

/**
 * Find trams approaching a specific station
 */
export function findTramsApproaching(
  trams: TramPosition[],
  stationId: number,
  direction: Direction,
  maxStopsAway: number = 5
): Array<{ tram: TramPosition; stopsAway: number }> {
  const results: Array<{ tram: TramPosition; stopsAway: number }> = [];

  for (const tram of trams) {
    const stopsAway = calculateStopsAway(tram, stationId, direction);

    if (stopsAway !== null && stopsAway >= 0 && stopsAway <= maxStopsAway) {
      results.push({ tram, stopsAway });
    }
  }

  // Sort by closest first
  results.sort((a, b) => a.stopsAway - b.stopsAway);

  return results;
}

/**
 * Morning notification data structure
 */
export interface MorningNotificationData {
  stationName: string;
  directionText: string;
  trams: Array<{
    line: 'A' | 'B';
    stopsAway: number;
    estimatedMinutes: number;
    vehicleType: string;
  }>;
}

/**
 * Send morning notifications to all users with their configured stations
 */
export async function sendMorningNotifications(trams: TramPosition[]): Promise<number> {
  let notificationCount = 0;

  try {
    const activeSettings = await getActiveNotificationSettings();

    // Group settings by user
    const userSettingsMap = new Map<string, { user: User; settings: typeof activeSettings }>();

    for (const settingWithUser of activeSettings) {
      const { user } = settingWithUser;
      const existing = userSettingsMap.get(user.line_user_id);

      if (existing) {
        existing.settings.push(settingWithUser);
      } else {
        userSettingsMap.set(user.line_user_id, {
          user,
          settings: [settingWithUser],
        });
      }
    }

    // Process each user
    for (const [lineUserId, { settings }] of userSettingsMap) {
      const notificationDataList: MorningNotificationData[] = [];

      for (const settingWithUser of settings) {
        const setting = settingWithUser;
        const station = getStationById(setting.station_id);

        if (!station) {
          continue;
        }

        const directionText = setting.direction === 'down' ? '健軍町方面' :
          (station.lines.includes('A') ? '田崎橋方面' : '上熊本方面');

        // Find approaching trams (up to 10 stops away to get next 2)
        const approaching = findTramsApproaching(trams, setting.station_id, setting.direction, 15);

        // Get next 2 trams
        const nextTrams = approaching.slice(0, 2).map(({ tram, stopsAway }) => ({
          line: tram.rosen,
          stopsAway,
          estimatedMinutes: estimateMinutesToArrival(stopsAway),
          vehicleType: tram.vehicle_type === 2 ? '超低床車' : '一般車',
        }));

        notificationDataList.push({
          stationName: station.name,
          directionText,
          trams: nextTrams,
        });
      }

      if (notificationDataList.length > 0) {
        try {
          await sendMorningNotification(lineUserId, notificationDataList);
          notificationCount++;
          console.log(`Sent morning notification to ${lineUserId}`);
        } catch (error) {
          console.error(`Failed to send morning notification to ${lineUserId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error sending morning notifications:', error);
    throw error;
  }

  return notificationCount;
}
