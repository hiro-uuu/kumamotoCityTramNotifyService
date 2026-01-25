import { TramPosition } from '../types/index.js';

const BASE_URL = 'https://www.kumamoto-city-tramway.jp/Sys';

interface Web01ListResponse {
  interval_id: number;
  rosen: string;
  us: number;
  vehicle_type: number;
  vehicle_id: number;
}

/**
 * Fetch all tram positions from Kumamoto City Tram Navi API
 * Endpoint: /Sys/web01List (POST)
 */
export async function fetchTramPositions(): Promise<TramPosition[]> {
  try {
    const response = await fetch(`${BASE_URL}/web01List`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KumamotoTramNotify/1.0',
        Accept: 'application/json',
      },
      body: '',
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as Web01ListResponse[];

    return data.map((item) => ({
      interval_id: item.interval_id,
      rosen: item.rosen as 'A' | 'B',
      us: item.us as 0 | 1,
      vehicle_type: item.vehicle_type,
      vehicle_id: item.vehicle_id,
    }));
  } catch (error) {
    console.error('Error fetching tram positions:', error);
    throw error;
  }
}

/**
 * Fetch announcement/notice information
 * Endpoint: /Sys/web01Info (POST)
 */
export async function fetchNoticeInfo(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/web01Info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KumamotoTramNotify/1.0',
        Accept: 'application/json',
      },
      body: '',
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching notice info:', error);
    return [];
  }
}

/**
 * Get vehicle type description
 */
export function getVehicleTypeDescription(vehicleType: number): string {
  switch (vehicleType) {
    case 2:
      return '超低床車';
    default:
      return '一般車';
  }
}

/**
 * Get direction description in Japanese
 */
export function getDirectionDescription(us: 0 | 1, rosen: 'A' | 'B'): string {
  if (us === 0) {
    // Up direction
    return rosen === 'A' ? '田崎橋方面' : '上熊本方面';
  }
  // Down direction
  return '健軍町方面';
}

/**
 * Filter trams by line and direction
 */
export function filterTrams(
  trams: TramPosition[],
  line?: 'A' | 'B',
  direction?: 'up' | 'down'
): TramPosition[] {
  return trams.filter((tram) => {
    if (line && tram.rosen !== line) {
      return false;
    }
    if (direction !== undefined) {
      const tramDirection = tram.us === 0 ? 'up' : 'down';
      if (tramDirection !== direction) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Check if tram is a super low floor type
 */
export function isSuperLowFloor(tram: TramPosition): boolean {
  return tram.vehicle_type === 2;
}
