import type { VercelRequest, VercelResponse } from '@vercel/node';
import { messagingApi } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// Station data with interval IDs for position calculation
const STATIONS = [
  { id: 1, name: '田崎橋', intervalIdUp: null, intervalIdDown: 101, lines: ['A'] },
  { id: 2, name: '二本木口', intervalIdUp: 101, intervalIdDown: 102, lines: ['A'] },
  { id: 3, name: '熊本駅前', intervalIdUp: 102, intervalIdDown: 103, lines: ['A'] },
  { id: 4, name: '祇園橋', intervalIdUp: 103, intervalIdDown: 104, lines: ['A'] },
  { id: 5, name: '呉服町', intervalIdUp: 104, intervalIdDown: 105, lines: ['A'] },
  { id: 6, name: '河原町', intervalIdUp: 105, intervalIdDown: 106, lines: ['A'] },
  { id: 7, name: '慶徳校前', intervalIdUp: 106, intervalIdDown: 107, lines: ['A'] },
  { id: 21, name: '上熊本', intervalIdUp: null, intervalIdDown: 201, lines: ['B'] },
  { id: 22, name: '県立体育館前', intervalIdUp: 201, intervalIdDown: 202, lines: ['B'] },
  { id: 23, name: '本妙寺入口', intervalIdUp: 202, intervalIdDown: 203, lines: ['B'] },
  { id: 24, name: '杉塘', intervalIdUp: 203, intervalIdDown: 204, lines: ['B'] },
  { id: 25, name: '段山町', intervalIdUp: 204, intervalIdDown: 205, lines: ['B'] },
  { id: 26, name: '蔚山町', intervalIdUp: 205, intervalIdDown: 206, lines: ['B'] },
  { id: 27, name: '新町', intervalIdUp: 206, intervalIdDown: 207, lines: ['B'] },
  { id: 28, name: '洗馬橋', intervalIdUp: 207, intervalIdDown: 208, lines: ['B'] },
  { id: 29, name: '西辛島町', intervalIdUp: 208, intervalIdDown: 209, lines: ['B'] },
  { id: 8, name: '辛島町', intervalIdUp: 107, intervalIdDown: 108, lines: ['A', 'B'] },
  { id: 9, name: '花畑町', intervalIdUp: 108, intervalIdDown: 109, lines: ['A', 'B'] },
  { id: 10, name: '熊本城・市役所前', intervalIdUp: 109, intervalIdDown: 110, lines: ['A', 'B'] },
  { id: 11, name: '通町筋', intervalIdUp: 110, intervalIdDown: 111, lines: ['A', 'B'] },
  { id: 12, name: '水道町', intervalIdUp: 111, intervalIdDown: 112, lines: ['A', 'B'] },
  { id: 13, name: '九品寺交差点', intervalIdUp: 112, intervalIdDown: 113, lines: ['A', 'B'] },
  { id: 14, name: '交通局前', intervalIdUp: 113, intervalIdDown: 114, lines: ['A', 'B'] },
  { id: 15, name: '味噌天神前', intervalIdUp: 114, intervalIdDown: 115, lines: ['A', 'B'] },
  { id: 16, name: '新水前寺駅前', intervalIdUp: 115, intervalIdDown: 116, lines: ['A', 'B'] },
  { id: 17, name: '国府', intervalIdUp: 116, intervalIdDown: 117, lines: ['A', 'B'] },
  { id: 18, name: '水前寺公園', intervalIdUp: 117, intervalIdDown: 118, lines: ['A', 'B'] },
  { id: 19, name: '市立体育館前', intervalIdUp: 118, intervalIdDown: 119, lines: ['A', 'B'] },
  { id: 20, name: '商業高校前', intervalIdUp: 119, intervalIdDown: 120, lines: ['A', 'B'] },
  { id: 30, name: '八丁馬場', intervalIdUp: 120, intervalIdDown: 121, lines: ['A', 'B'] },
  { id: 31, name: '神水交差点', intervalIdUp: 121, intervalIdDown: 122, lines: ['A', 'B'] },
  { id: 32, name: '健軍校前', intervalIdUp: 122, intervalIdDown: 123, lines: ['A', 'B'] },
  { id: 33, name: '動植物園入口', intervalIdUp: 123, intervalIdDown: 124, lines: ['A', 'B'] },
  { id: 34, name: '健軍町', intervalIdUp: 124, intervalIdDown: null, lines: ['A', 'B'] },
];

const A_LINE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 33, 34];
const B_LINE_ORDER = [21, 22, 23, 24, 25, 26, 27, 28, 29, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 33, 34];

// Build interval to station map
const INTERVAL_MAP = new Map<number, typeof STATIONS[0]>();
STATIONS.forEach(station => {
  if (station.intervalIdUp) INTERVAL_MAP.set(station.intervalIdUp, station);
  if (station.intervalIdDown) INTERVAL_MAP.set(station.intervalIdDown, station);
});

interface TramPosition {
  interval_id: number;
  rosen: 'A' | 'B';
  us: 0 | 1;
  vehicle_type: number;
  vehicle_id: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Morning cron started:', new Date().toISOString());

  try {
    // Fetch tram positions
    const tramResponse = await fetch('https://www.kumamoto-city-tramway.jp/Sys/web01List', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KumamotoTramNotify/1.0',
      },
      body: '',
    });

    if (!tramResponse.ok) {
      throw new Error(`Tram API error: ${tramResponse.status}`);
    }

    const trams: TramPosition[] = await tramResponse.json();
    console.log(`Fetched ${trams.length} trams`);

    // Get Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Get all active settings with users
    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select(`
        *,
        users!inner(line_user_id, is_active)
      `)
      .eq('is_enabled', true)
      .eq('users.is_active', true);

    if (error) {
      throw error;
    }

    if (!settings || settings.length === 0) {
      console.log('No active settings found');
      return res.status(200).json({ status: 'ok', notifications: 0 });
    }

    // Group by user
    const userSettings = new Map<string, typeof settings>();
    for (const setting of settings) {
      const lineUserId = (setting.users as { line_user_id: string }).line_user_id;
      const existing = userSettings.get(lineUserId) || [];
      existing.push(setting);
      userSettings.set(lineUserId, existing);
    }

    // Initialize LINE client
    const lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    });

    let notificationCount = 0;

    // Send notifications to each user
    for (const [lineUserId, userSettingsList] of userSettings) {
      const stationInfos = [];

      for (const setting of userSettingsList) {
        const station = STATIONS.find(s => s.id === setting.station_id);
        if (!station) continue;

        const direction = setting.direction as 'up' | 'down';
        const directionText = direction === 'down' ? '健軍町方面' :
          (station.lines.includes('A') ? '田崎橋方面' : '上熊本方面');

        // Find approaching trams
        const approaching = findApproachingTrams(trams, setting.station_id, direction);
        const nextTrams = approaching.slice(0, 2);

        stationInfos.push({
          stationName: station.name,
          directionText,
          trams: nextTrams,
        });
      }

      if (stationInfos.length > 0) {
        try {
          await lineClient.pushMessage({
            to: lineUserId,
            messages: [{
              type: 'flex',
              altText: `おはようございます。電車情報です`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              contents: buildMorningMessage(stationInfos) as any,
            }],
          });
          notificationCount++;
          console.log(`Sent to ${lineUserId}`);
        } catch (e) {
          console.error(`Failed to send to ${lineUserId}:`, e);
        }
      }
    }

    console.log(`Sent ${notificationCount} notifications`);
    return res.status(200).json({ status: 'ok', notifications: notificationCount });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: String(error) });
  }
}

function findApproachingTrams(
  trams: TramPosition[],
  targetStationId: number,
  targetDirection: 'up' | 'down'
): Array<{ line: 'A' | 'B'; stopsAway: number; minutes: number; vehicleType: string }> {
  const results: Array<{ line: 'A' | 'B'; stopsAway: number; minutes: number; vehicleType: string }> = [];

  for (const tram of trams) {
    const tramDirection = tram.us === 0 ? 'up' : 'down';
    if (tramDirection !== targetDirection) continue;

    const currentStation = INTERVAL_MAP.get(tram.interval_id);
    if (!currentStation) continue;

    const lineOrder = tram.rosen === 'A' ? A_LINE_ORDER : B_LINE_ORDER;
    const currentIdx = lineOrder.indexOf(currentStation.id);
    const targetIdx = lineOrder.indexOf(targetStationId);

    if (currentIdx === -1 || targetIdx === -1) continue;

    let stopsAway: number;
    if (targetDirection === 'down') {
      stopsAway = targetIdx - currentIdx;
    } else {
      stopsAway = currentIdx - targetIdx;
    }

    if (stopsAway > 0 && stopsAway <= 15) {
      results.push({
        line: tram.rosen,
        stopsAway,
        minutes: Math.max(1, Math.round(stopsAway * 2)),
        vehicleType: tram.vehicle_type === 2 ? '超低床車' : '一般車',
      });
    }
  }

  results.sort((a, b) => a.stopsAway - b.stopsAway);
  return results;
}

function buildMorningMessage(stations: Array<{
  stationName: string;
  directionText: string;
  trams: Array<{ line: string; stopsAway: number; minutes: number; vehicleType: string }>;
}>) {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const timeStr = `${jstNow.getUTCHours()}:${jstNow.getUTCMinutes().toString().padStart(2, '0')}`;

  const stationContents: object[] = [];

  for (const station of stations) {
    stationContents.push({
      type: 'text',
      text: `📍 ${station.stationName}（${station.directionText}）`,
      weight: 'bold',
      size: 'sm',
      margin: 'lg',
    });

    if (station.trams.length === 0) {
      stationContents.push({
        type: 'text',
        text: '  現在接近中の電車はありません',
        size: 'sm',
        color: '#888888',
        margin: 'sm',
      });
    } else {
      station.trams.forEach((tram, index) => {
        const label = index === 0 ? '次の電車' : 'その次';
        stationContents.push({
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          contents: [
            { type: 'text', text: `  ${label}:`, size: 'sm', flex: 2 },
            { type: 'text', text: `${tram.stopsAway}駅前 (約${tram.minutes}分)`, size: 'sm', flex: 3 },
          ],
        });
        stationContents.push({
          type: 'text',
          text: `    ${tram.line}系統 ${tram.vehicleType}`,
          size: 'xs',
          color: '#666666',
        });
      });
    }
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#27ACB2',
      paddingAll: '15px',
      contents: [
        { type: 'text', text: '🚃 おはようございます', color: '#FFFFFF', weight: 'bold', size: 'lg' },
        { type: 'text', text: `${timeStr} 現在の電車情報`, color: '#FFFFFF', size: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: stationContents,
    },
  };
}
