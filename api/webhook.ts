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
  } else {
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: '📝 コマンド一覧\n\n「設定」→ 通知設定\n「確認」→ 設定一覧\n「オン」→ 通知有効化\n「オフ」→ 通知無効化',
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
