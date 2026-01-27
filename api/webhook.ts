import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WebhookEvent, validateSignature } from '@line/bot-sdk';
import { messagingApi } from '@line/bot-sdk';

// Initialize LINE client
function getLineClient() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  }
  return new messagingApi.MessagingApiClient({ channelAccessToken });
}

function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new Error('Missing LINE_CHANNEL_SECRET');
  }
  return secret;
}

// Supabase client
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const body = JSON.stringify(req.body);
    const signature = req.headers['x-line-signature'] as string;

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify signature
    if (!validateSignature(body, getChannelSecret(), signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const events: WebhookEvent[] = req.body.events || [];

    // Process events
    for (const event of events) {
      await processEvent(event);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processEvent(event: WebhookEvent) {
  const client = getLineClient();
  const supabase = getSupabase();

  switch (event.type) {
    case 'follow':
      await handleFollow(event, client, supabase);
      break;
    case 'message':
      if (event.message.type === 'text') {
        await handleMessage(event, client, supabase);
      }
      break;
    case 'postback':
      await handlePostback(event, client, supabase);
      break;
  }
}

async function handleFollow(
  event: WebhookEvent & { type: 'follow' },
  client: messagingApi.MessagingApiClient,
  supabase: ReturnType<typeof createClient>
) {
  const userId = event.source.userId;
  if (!userId) return;

  // Get user profile
  let displayName: string | undefined;
  try {
    const profile = await client.getProfile(userId);
    displayName = profile.displayName;
  } catch (e) {
    console.warn('Could not get profile:', e);
  }

  // Create or update user
  await supabase.from('users').upsert({
    line_user_id: userId,
    display_name: displayName,
    is_active: true,
  }, { onConflict: 'line_user_id' });

  // Send welcome message
  if (event.replyToken) {
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'flex',
        altText: '熊本市電通知サービスへようこそ！',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: buildWelcomeMessage() as any,
      }],
    });
  }
}

async function handleMessage(
  event: WebhookEvent & { type: 'message'; message: { type: 'text'; text: string } },
  client: messagingApi.MessagingApiClient,
  supabase: ReturnType<typeof createClient>
) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  if (!userId || !replyToken) return;

  const text = event.message.text.trim().toLowerCase();

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', userId)
    .single();

  if (!user) {
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'flex',
        altText: 'ようこそ',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: buildWelcomeMessage() as any,
      }],
    });
    return;
  }

  // Command handling
  if (/^(設定|せってい|setting)$/i.test(text)) {
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'flex',
        altText: '電停を選択してください',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: buildStationCarousel() as any,
      }],
    });
  } else if (/^(確認|かくにん|status|list)$/i.test(text)) {
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id);

    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'flex',
        altText: '通知設定一覧',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: buildSettingsList(settings || []) as any,
      }],
    });
  } else if (/^(オン|on|有効)$/i.test(text)) {
    await supabase
      .from('notification_settings')
      .update({ is_enabled: true })
      .eq('user_id', user.id);

    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: '✅ すべての通知を有効にしました。' }],
    });
  } else if (/^(オフ|off|無効)$/i.test(text)) {
    await supabase
      .from('notification_settings')
      .update({ is_enabled: false })
      .eq('user_id', user.id);

    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: '✅ すべての通知を無効にしました。' }],
    });
  } else if (/^(削除|delete)$/i.test(text)) {
    // Delete all settings for user
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id);

    if (!settings || settings.length === 0) {
      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '削除する設定がありません。' }],
      });
    } else {
      await supabase
        .from('notification_settings')
        .delete()
        .eq('user_id', user.id);

      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: `✅ ${settings.length}件の設定を削除しました。` }],
      });
    }
  } else if (/^(いま|今|now|current)$/i.test(text)) {
    // Show current tram positions for user's stations
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id);

    if (!settings || settings.length === 0) {
      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '設定された電停がありません。「設定」から通知電停を追加してください。' }],
      });
    } else {
      // Fetch tram positions
      try {
        const tramResponse = await fetch('https://www.kumamoto-city-tram.jp/Sys/web01List', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'KumamotoTramNotify/1.0',
            'Accept': 'application/json',
          },
          body: '',
        });

        if (!tramResponse.ok) {
          console.error('Tram API error:', tramResponse.status, tramResponse.statusText);
          await client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: `電車情報の取得に失敗しました。(HTTP ${tramResponse.status})` }],
          });
          return;
        }

        const responseText = await tramResponse.text();
        let trams: Array<{ interval_id: number; rosen: 'A' | 'B'; us: number; vehicle_type: number }>;

        try {
          trams = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', responseText.substring(0, 200));
          await client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: '電車情報の解析に失敗しました。' }],
          });
          return;
        }

        if (!Array.isArray(trams)) {
          console.error('Unexpected response format:', typeof trams);
          await client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: '電車情報の形式が不正です。' }],
          });
          return;
        }

        let message = '🚃 現在の電車状況\n';

        for (const setting of settings) {
          const station = STATIONS.find(s => s.id === setting.station_id);
          if (!station) continue;

          const dirText = setting.direction === 'down' ? '健軍町方面' : '始発方面';
          message += `\n📍 ${station.name} (${dirText})\n`;

          const approaching = findApproachingTrams(trams, setting.station_id, setting.direction as 'up' | 'down');

          if (approaching.length === 0) {
            message += '  → 近くに電車はありません\n';
          } else {
            for (const tram of approaching.slice(0, 3)) {
              message += `  → ${tram.stopsAway}駅前 (約${tram.minutes}分) ${tram.line}系統\n`;
            }
          }
        }

        await client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: message }],
        });
      } catch (e) {
        console.error('Tram fetch error:', e);
        await client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `電車情報の取得に失敗しました。(${e instanceof Error ? e.message : 'Unknown error'})` }],
        });
      }
    }
  } else {
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: '📝 コマンド一覧\n\n「設定」→ 通知設定\n「確認」→ 設定一覧\n「オン」→ 通知有効化\n「オフ」→ 通知無効化\n「削除」→ 設定削除\n「いま」→ 現在の電車',
      }],
    });
  }
}

async function handlePostback(
  event: WebhookEvent & { type: 'postback' },
  client: messagingApi.MessagingApiClient,
  supabase: ReturnType<typeof createClient>
) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  if (!userId || !replyToken) return;

  const params = new URLSearchParams(event.postback.data);
  const action = params.get('action');

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', userId)
    .single();

  if (!user) return;

  if (action === 'new_setting') {
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'flex',
        altText: '電停を選択してください',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: buildStationCarousel() as any,
      }],
    });
  } else if (action === 'select_station') {
    const stationId = params.get('station_id');
    const station = STATIONS.find(s => s.id === Number(stationId));
    if (!station) return;

    const line = station.lines[0];
    const upTerminal = line === 'A' ? '田崎橋' : '上熊本';

    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: `📍 ${station.name}\n\nどちら方面の電車を通知しますか？`,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'postback',
                label: `${upTerminal}方面`,
                data: `action=select_direction&station_id=${stationId}&direction=up`,
              },
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '健軍町方面',
                data: `action=select_direction&station_id=${stationId}&direction=down`,
              },
            },
          ],
        },
      }],
    });
  } else if (action === 'select_direction') {
    const stationId = params.get('station_id');
    const direction = params.get('direction');
    const station = STATIONS.find(s => s.id === Number(stationId));
    if (!station) return;

    // Save setting (default trigger_stops = 2, but not used for morning notification)
    await supabase.from('notification_settings').insert({
      user_id: user.id,
      station_id: Number(stationId),
      direction,
      trigger_stops: 2,
      is_enabled: true,
    });

    const dirText = direction === 'down' ? '健軍町方面' : '始発方面';

    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: `✅ 設定完了！\n\n📍 ${station.name}\n🚃 ${dirText}\n\n毎朝7:25に電車情報をお届けします。\n「確認」で設定一覧を表示できます。`,
      }],
    });
  }
}

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

// A系統 下り(us=1)の区間グループ（3箇所で上りと異なる）
const A_DOWN_GROUPS: number[][] = [
  [1], [2, 3], [4], [5, 6, 7], [8], [9, 10, 11], [12], [13, 14, 15, 16], [17], [18, 19],
  [20], [21, 22, 23], [24], [25, 26, 27, 28, 29], [30], [31, 32, 33], [34], [35, 36, 37],
  [38], [39, 40, 41], [42], [43, 44], [45], [46, 47, 48, 49, 50, 51], [52], [53, 54, 55],
  [56], [57, 58, 59, 60, 61, 62], [63], [64, 65, 66, 67, 68], [69], [70, 71, 72, 73],
  [74], [75, 76, 77, 78, 79], [80], [81, 82, 83], [84], [85, 86, 87, 88, 89], [90],
  [91, 92, 93, 94], [95], [96, 97, 98], [99], [100, 101, 102, 103, 104, 105, 106], [107],
  [108, 109, 110], [111], [112, 113, 114], [115], [116, 117, 118, 119], [120]
];

// B系統 共通区間部分
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

// B系統固有部分
const B_PREFIX: number[][] = [
  [201], [202, 203], [204], [205], [206], [207], [208], [209, 210, 211], [212],
  [213, 214, 215], [216], [217, 218, 219], [220], [221, 222], [223], [224, 225], [226],
];

// B系統 上り/下り
const B_UP_GROUPS: number[][] = [...B_PREFIX, ...SHARED_UP];
const B_DOWN_GROUPS: number[][] = [...B_PREFIX, ...SHARED_DOWN];

// 電停ID → 区間グループインデックスのマッピング
// A系統: 偶数インデックスが電停位置 (0=田崎橋, 2=二本木口, ...)
const A_STATION_POSITIONS: Map<number, number> = new Map([
  [1, 0],   // 田崎橋
  [2, 2],   // 二本木口
  [3, 4],   // 熊本駅前
  [4, 6],   // 祇園橋
  [5, 8],   // 呉服町
  [6, 10],  // 河原町
  [7, 12],  // 慶徳校前
  [8, 14],  // 辛島町
  [9, 16],  // 花畑町
  [10, 18], // 熊本城・市役所前
  [11, 20], // 通町筋
  [12, 22], // 水道町
  [13, 24], // 九品寺交差点
  [14, 26], // 交通局前
  [15, 28], // 味噌天神前
  [16, 30], // 新水前寺駅前
  [17, 32], // 国府
  [18, 34], // 水前寺公園
  [19, 36], // 市立体育館前
  [20, 38], // 商業高校前
  [30, 40], // 八丁馬場
  [31, 42], // 神水交差点
  [32, 44], // 健軍校前
  [33, 46], // 動植物園入口
  [34, 48], // 健軍町
]);

// B系統: 偶数インデックスが電停位置 (0=上熊本, 2=県立体育館前, ...)
const B_STATION_POSITIONS: Map<number, number> = new Map([
  [21, 0],  // 上熊本
  [22, 2],  // 県立体育館前
  [23, 4],  // 本妙寺入口
  [24, 6],  // 杉塘
  [25, 8],  // 段山町
  [26, 10], // 蔚山町
  [27, 12], // 新町
  [28, 14], // 洗馬橋
  [29, 16], // 西辛島町
  [8, 18],  // 辛島町（共通区間開始、グループ17=[27,28,29]の次）
  [9, 20],  // 花畑町
  [10, 22], // 熊本城・市役所前
  [11, 24], // 通町筋
  [12, 26], // 水道町
  [13, 28], // 九品寺交差点
  [14, 30], // 交通局前
  [15, 32], // 味噌天神前
  [16, 34], // 新水前寺駅前
  [17, 36], // 国府
  [18, 38], // 水前寺公園
  [19, 40], // 市立体育館前
  [20, 42], // 商業高校前
  [30, 44], // 八丁馬場
  [31, 46], // 神水交差点
  [32, 48], // 健軍校前
  [33, 50], // 動植物園入口
  [34, 52], // 健軍町
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

// 方向別のinterval_id → 位置マップ
const A_UP_INTERVAL_MAP = buildIntervalToPositionMap(A_UP_GROUPS);
const A_DOWN_INTERVAL_MAP = buildIntervalToPositionMap(A_DOWN_GROUPS);
const B_UP_INTERVAL_MAP = buildIntervalToPositionMap(B_UP_GROUPS);
const B_DOWN_INTERVAL_MAP = buildIntervalToPositionMap(B_DOWN_GROUPS);

function findApproachingTrams(
  trams: Array<{ interval_id: number; rosen: 'A' | 'B'; us: number; vehicle_type: number }>,
  targetStationId: number,
  targetDirection: 'up' | 'down'
): Array<{ line: 'A' | 'B'; stopsAway: number; minutes: number; vehicleType: string }> {
  const results: Array<{ line: 'A' | 'B'; stopsAway: number; minutes: number; vehicleType: string }> = [];

  for (const tram of trams) {
    const tramDirection = tram.us === 0 ? 'up' : 'down';
    if (tramDirection !== targetDirection) continue;

    // 電車の現在位置（区間グループインデックス）を取得
    // 原本と同様に、上り(us=0)はU配列、下り(us=1)はD配列を使用
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

function buildWelcomeMessage() {
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#27ACB2',
      paddingAll: '15px',
      contents: [
        { type: 'text', text: '🚃 熊本市電通知サービス', color: '#FFFFFF', weight: 'bold', size: 'lg' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: 'ようこそ！', weight: 'bold', size: 'md' },
        { type: 'text', text: '毎朝7:25に、設定した電停の電車情報をお届けします。', wrap: true, size: 'sm' },
        { type: 'separator' },
        { type: 'text', text: '📝 使い方', weight: 'bold', size: 'sm' },
        { type: 'text', text: '「設定」→ 通知設定\n「確認」→ 設定一覧\n「オン」「オフ」→ 通知切替', wrap: true, size: 'sm', color: '#666666' },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'button', action: { type: 'postback', label: '通知設定を始める', data: 'action=new_setting' }, style: 'primary' },
      ],
    },
  };
}

function buildStationCarousel() {
  const chunks: typeof STATIONS[] = [];
  for (let i = 0; i < STATIONS.length; i += 10) {
    chunks.push(STATIONS.slice(i, i + 10));
  }

  return {
    type: 'carousel',
    contents: chunks.map((chunk, idx) => ({
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: `電停を選択 (${idx + 1}/${chunks.length})`, weight: 'bold', size: 'sm' },
          ...chunk.map(station => ({
            type: 'button',
            action: { type: 'postback', label: station.name, data: `action=select_station&station_id=${station.id}` },
            height: 'sm',
            style: 'secondary',
          })),
        ],
      },
    })),
  };
}

function buildSettingsList(settings: Array<{ station_id: number; direction: string; is_enabled: boolean }>) {
  const contents = settings.length > 0
    ? settings.map(s => {
        const station = STATIONS.find(st => st.id === s.station_id);
        return {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            { type: 'text', text: s.is_enabled ? '✅' : '⏸', size: 'sm', flex: 0 },
            { type: 'text', text: `${station?.name || '不明'} (${s.direction === 'down' ? '健軍町' : '始発'}方面)`, size: 'sm', flex: 3, wrap: true },
          ],
        };
      })
    : [{ type: 'text', text: '設定がありません', size: 'sm', color: '#888888' }];

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#27ACB2',
      paddingAll: '10px',
      contents: [
        { type: 'text', text: '通知設定一覧', color: '#FFFFFF', weight: 'bold' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents,
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'button', action: { type: 'postback', label: '新規追加', data: 'action=new_setting' }, style: 'primary', height: 'sm' },
      ],
    },
  };
}
