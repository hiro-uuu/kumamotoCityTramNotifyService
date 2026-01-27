import type { VercelRequest, VercelResponse } from '@vercel/node';
import { messagingApi } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// Station data
const STATIONS = [
  { id: 1, name: '田崎橋', lines: ['A'] },
  { id: 2, name: '二本木口', lines: ['A'] },
  { id: 3, name: '熊本駅前', lines: ['A'] },
  { id: 4, name: '祇園橋', lines: ['A'] },
  { id: 5, name: '呉服町', lines: ['A'] },
  { id: 6, name: '河原町', lines: ['A'] },
  { id: 7, name: '慶徳校前', lines: ['A'] },
  { id: 21, name: '上熊本', lines: ['B'] },
  { id: 22, name: '県立体育館前', lines: ['B'] },
  { id: 23, name: '本妙寺入口', lines: ['B'] },
  { id: 24, name: '杉塘', lines: ['B'] },
  { id: 25, name: '段山町', lines: ['B'] },
  { id: 26, name: '蔚山町', lines: ['B'] },
  { id: 27, name: '新町', lines: ['B'] },
  { id: 28, name: '洗馬橋', lines: ['B'] },
  { id: 29, name: '西辛島町', lines: ['B'] },
  { id: 8, name: '辛島町', lines: ['A', 'B'] },
  { id: 9, name: '花畑町', lines: ['A', 'B'] },
  { id: 10, name: '熊本城・市役所前', lines: ['A', 'B'] },
  { id: 11, name: '通町筋', lines: ['A', 'B'] },
  { id: 12, name: '水道町', lines: ['A', 'B'] },
  { id: 13, name: '九品寺交差点', lines: ['A', 'B'] },
  { id: 14, name: '交通局前', lines: ['A', 'B'] },
  { id: 15, name: '味噌天神前', lines: ['A', 'B'] },
  { id: 16, name: '新水前寺駅前', lines: ['A', 'B'] },
  { id: 17, name: '国府', lines: ['A', 'B'] },
  { id: 18, name: '水前寺公園', lines: ['A', 'B'] },
  { id: 19, name: '市立体育館前', lines: ['A', 'B'] },
  { id: 20, name: '商業高校前', lines: ['A', 'B'] },
  { id: 30, name: '八丁馬場', lines: ['A', 'B'] },
  { id: 31, name: '神水交差点', lines: ['A', 'B'] },
  { id: 32, name: '健軍校前', lines: ['A', 'B'] },
  { id: 33, name: '動植物園入口', lines: ['A', 'B'] },
  { id: 34, name: '健軍町', lines: ['A', 'B'] },
];

// A系統 上り(us=0)の区間グループ
const A_UP_GROUPS: number[][] = [
  [1], [2, 3], [4], [5, 6, 7], [8], [9, 10, 11], [12], [13, 14, 15], [16], [17, 18, 19],
  [20], [21, 22, 23], [24], [25, 26, 27, 28, 29], [30], [31, 32, 33], [34], [35, 36, 37],
  [38], [39, 40, 41], [42], [43, 44], [45], [46, 47, 48, 49, 50, 51, 52], [53], [54, 55],
  [56], [57, 58, 59, 60, 61, 62], [63], [64, 65, 66, 67, 68], [69], [70, 71, 72, 73],
  [74], [75, 76, 77, 78, 79], [80], [81, 82, 83], [84], [85, 86, 87, 88, 89], [90],
  [91, 92, 93, 94], [95], [96, 97, 98, 99], [100], [101, 102, 103, 104, 105, 106], [107],
  [108, 109, 110], [111], [112, 113, 114], [115], [116, 117, 118, 119], [120]
];

// A系統 下り(us=1)の区間グループ
const A_DOWN_GROUPS: number[][] = [
  [1], [2, 3], [4], [5, 6, 7], [8], [9, 10, 11], [12], [13, 14, 15, 16], [17], [18, 19],
  [20], [21, 22, 23], [24], [25, 26, 27, 28, 29], [30], [31, 32, 33], [34], [35, 36, 37],
  [38], [39, 40, 41], [42], [43, 44], [45], [46, 47, 48, 49, 50, 51], [52], [53, 54, 55],
  [56], [57, 58, 59, 60, 61, 62], [63], [64, 65, 66, 67, 68], [69], [70, 71, 72, 73],
  [74], [75, 76, 77, 78, 79], [80], [81, 82, 83], [84], [85, 86, 87, 88, 89], [90],
  [91, 92, 93, 94], [95], [96, 97, 98], [99], [100, 101, 102, 103, 104, 105, 106], [107],
  [108, 109, 110], [111], [112, 113, 114], [115], [116, 117, 118, 119], [120]
];

const SHARED_UP: number[][] = [
  [27, 28, 29], [30], [31, 32, 33], [34], [35, 36, 37], [38], [39, 40, 41], [42],
  [43, 44], [45], [46, 47, 48, 49, 50, 51, 52], [53], [54, 55], [56], [57, 58, 59, 60, 61, 62],
  [63], [64, 65, 66, 67, 68], [69], [70, 71, 72, 73], [74], [75, 76, 77, 78, 79], [80],
  [81, 82, 83], [84], [85, 86, 87, 88, 89], [90], [91, 92, 93, 94], [95], [96, 97, 98, 99],
  [100], [101, 102, 103, 104, 105, 106], [107], [108, 109, 110], [111], [112, 113, 114],
  [115], [116, 117, 118, 119], [120]
];

const SHARED_DOWN: number[][] = [
  [27, 28, 29], [30], [31, 32, 33], [34], [35, 36, 37], [38], [39, 40, 41], [42],
  [43, 44], [45], [46, 47, 48, 49, 50, 51], [52], [53, 54, 55], [56], [57, 58, 59, 60, 61, 62],
  [63], [64, 65, 66, 67, 68], [69], [70, 71, 72, 73], [74], [75, 76, 77, 78, 79], [80],
  [81, 82, 83], [84], [85, 86, 87, 88, 89], [90], [91, 92, 93, 94], [95], [96, 97, 98],
  [99], [100, 101, 102, 103, 104, 105, 106], [107], [108, 109, 110], [111], [112, 113, 114],
  [115], [116, 117, 118, 119], [120]
];

const B_PREFIX: number[][] = [
  [201], [202, 203], [204], [205], [206], [207], [208], [209, 210, 211], [212],
  [213, 214, 215], [216], [217, 218, 219], [220], [221, 222], [223], [224, 225], [226],
];

const B_UP_GROUPS: number[][] = [...B_PREFIX, ...SHARED_UP];
const B_DOWN_GROUPS: number[][] = [...B_PREFIX, ...SHARED_DOWN];

// 電停ID → 区間グループインデックスのマッピング
const A_STATION_POSITIONS: Map<number, number> = new Map([
  [1, 0], [2, 2], [3, 4], [4, 6], [5, 8], [6, 10], [7, 12],
  [8, 14], [9, 16], [10, 18], [11, 20], [12, 22], [13, 24], [14, 26], [15, 28],
  [16, 30], [17, 32], [18, 34], [19, 36], [20, 38], [30, 40], [31, 42], [32, 44], [33, 46], [34, 48],
]);

const B_STATION_POSITIONS: Map<number, number> = new Map([
  [21, 0], [22, 2], [23, 4], [24, 6], [25, 8], [26, 10], [27, 12], [28, 14], [29, 16],
  [8, 18], [9, 20], [10, 22], [11, 24], [12, 26], [13, 28], [14, 30], [15, 32],
  [16, 34], [17, 36], [18, 38], [19, 40], [20, 42], [30, 44], [31, 46], [32, 48], [33, 50], [34, 52],
]);

// interval_id → 区間グループインデックス のマップを構築
function buildIntervalToPositionMap(groups: number[][]): Map<number, number> {
  const map = new Map<number, number>();
  groups.forEach((group, index) => {
    group.forEach(intervalId => {
      map.set(intervalId, index);
    });
  });
  return map;
}

const A_UP_INTERVAL_MAP = buildIntervalToPositionMap(A_UP_GROUPS);
const A_DOWN_INTERVAL_MAP = buildIntervalToPositionMap(A_DOWN_GROUPS);
const B_UP_INTERVAL_MAP = buildIntervalToPositionMap(B_UP_GROUPS);
const B_DOWN_INTERVAL_MAP = buildIntervalToPositionMap(B_DOWN_GROUPS);

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
    const tramResponse = await fetch('https://www.kumamoto-city-tram.jp/Sys/web01List', {
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

    // 電車の現在位置（区間グループインデックス）を取得
    // 上り(us=0)はU配列、下り(us=1)はD配列を使用
    const intervalToPosition = tram.us === 0
      ? (tram.rosen === 'A' ? A_UP_INTERVAL_MAP : B_UP_INTERVAL_MAP)
      : (tram.rosen === 'A' ? A_DOWN_INTERVAL_MAP : B_DOWN_INTERVAL_MAP);
    const currentPosition = intervalToPosition.get(tram.interval_id);
    if (currentPosition === undefined) continue;

    // ターゲット電停の位置を取得
    const stationPositions = tram.rosen === 'A' ? A_STATION_POSITIONS : B_STATION_POSITIONS;
    const targetPosition = stationPositions.get(targetStationId);
    if (targetPosition === undefined) continue;

    // 位置の差分を計算（2グループで1駅分）
    let positionDiff: number;
    if (targetDirection === 'down') {
      // 下り（健軍町方面）: 位置が増加する方向
      positionDiff = targetPosition - currentPosition;
    } else {
      // 上り（始発方面）: 位置が減少する方向
      positionDiff = currentPosition - targetPosition;
    }

    // 区間グループは2つで1駅なので、駅数に変換
    const stopsAway = Math.round(positionDiff / 2);

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
