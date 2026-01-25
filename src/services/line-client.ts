import { messagingApi, QuickReply, QuickReplyItem, FlexBubble, FlexCarousel, FlexComponent } from '@line/bot-sdk';
import { Station, Direction, PendingNotification } from '../types/index.js';
import { getTerminalName } from '../data/stations.js';
import { getVehicleTypeDescription } from './tram-api.js';

let client: messagingApi.MessagingApiClient | null = null;

export function getLineClient(): messagingApi.MessagingApiClient {
  if (client) {
    return client;
  }

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN environment variable');
  }

  client = new messagingApi.MessagingApiClient({ channelAccessToken });
  return client;
}

export function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new Error('Missing LINE_CHANNEL_SECRET environment variable');
  }
  return secret;
}

// ============ Reply Functions ============

export async function replyText(replyToken: string, text: string): Promise<void> {
  const lineClient = getLineClient();
  await lineClient.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

export async function replyWithQuickReply(
  replyToken: string,
  text: string,
  items: QuickReplyItem[]
): Promise<void> {
  const lineClient = getLineClient();
  const quickReply: QuickReply = { items };

  await lineClient.replyMessage({
    replyToken,
    messages: [{ type: 'text', text, quickReply }],
  });
}

export async function replyFlexMessage(
  replyToken: string,
  altText: string,
  contents: FlexBubble | FlexCarousel
): Promise<void> {
  const lineClient = getLineClient();

  await lineClient.replyMessage({
    replyToken,
    messages: [
      {
        type: 'flex',
        altText,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: contents as any,
      },
    ],
  });
}

// ============ Push Functions ============

export async function pushText(userId: string, text: string): Promise<void> {
  const lineClient = getLineClient();
  await lineClient.pushMessage({
    to: userId,
    messages: [{ type: 'text', text }],
  });
}

export async function pushFlexMessage(
  userId: string,
  altText: string,
  contents: FlexBubble | FlexCarousel
): Promise<void> {
  const lineClient = getLineClient();

  await lineClient.pushMessage({
    to: userId,
    messages: [
      {
        type: 'flex',
        altText,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: contents as any,
      },
    ],
  });
}

// ============ Notification Messages ============

export function buildNotificationMessage(notification: PendingNotification): FlexBubble {
  const { setting, station, tram, stopsAway, estimatedMinutes } = notification;

  const directionText = setting.direction === 'down' ? '健軍町方面' : getTerminalName('up', tram.rosen);
  const vehicleType = getVehicleTypeDescription(tram.vehicle_type);

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#27ACB2',
      paddingAll: '10px',
      contents: [
        {
          type: 'text',
          text: '電車接近通知',
          color: '#FFFFFF',
          weight: 'bold',
          size: 'md',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: `${station.name}駅（${directionText}）`,
          weight: 'bold',
          size: 'lg',
          wrap: true,
        },
        {
          type: 'separator',
        },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '📍',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `${stopsAway}駅前`,
                  size: 'sm',
                  color: '#666666',
                  flex: 1,
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '⏱',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `あと約${estimatedMinutes}分で到着予定`,
                  size: 'sm',
                  color: '#666666',
                  flex: 1,
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '🚋',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `${tram.rosen}系統 ${vehicleType}`,
                  size: 'sm',
                  color: '#666666',
                  flex: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

export async function sendTramNotification(notification: PendingNotification): Promise<void> {
  const bubble = buildNotificationMessage(notification);
  const altText = `電車接近通知: ${notification.station.name}駅に${notification.stopsAway}駅前`;

  await pushFlexMessage(notification.user.line_user_id, altText, bubble);
}

// ============ Setting Flow Messages ============

export function buildStationSelectCarousel(stations: Station[]): FlexCarousel {
  // Group stations into chunks of 10 for carousel
  const chunks: Station[][] = [];
  for (let i = 0; i < stations.length; i += 10) {
    chunks.push(stations.slice(i, i + 10));
  }

  const bubbles: FlexBubble[] = chunks.map((chunk, chunkIndex) => ({
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `電停を選択 (${chunkIndex + 1}/${chunks.length})`,
          weight: 'bold',
          size: 'sm',
        } as FlexComponent,
        ...chunk.map(
          (station) =>
            ({
              type: 'button',
              action: {
                type: 'postback',
                label: station.name,
                data: `action=select_station&station_id=${station.id}`,
              },
              height: 'sm',
              style: 'secondary',
            }) as FlexComponent
        ),
      ],
    },
  }));

  return {
    type: 'carousel',
    contents: bubbles,
  };
}

export function buildDirectionQuickReply(stationId: number, line: 'A' | 'B'): QuickReplyItem[] {
  const upTerminal = line === 'A' ? '田崎橋' : '上熊本';

  return [
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
  ];
}

export function buildTriggerStopsQuickReply(stationId: number, direction: Direction): QuickReplyItem[] {
  return [1, 2, 3].map((stops) => ({
    type: 'action',
    action: {
      type: 'postback',
      label: `${stops}駅前で通知`,
      data: `action=select_trigger&station_id=${stationId}&direction=${direction}&trigger=${stops}`,
    },
  }));
}

// ============ Settings Display ============

export function buildSettingsListBubble(
  settings: Array<{
    id: string;
    stationName: string;
    direction: Direction;
    triggerStops: number;
    isEnabled: boolean;
  }>
): FlexBubble {
  const bodyContents: FlexComponent[] =
    settings.length > 0
      ? settings.map(
          (s) =>
            ({
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: s.isEnabled ? '✅' : '⏸',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `${s.stationName} (${s.direction === 'down' ? '健軍町' : '始発'}方面)`,
                  size: 'sm',
                  flex: 3,
                  wrap: true,
                },
                {
                  type: 'text',
                  text: `${s.triggerStops}駅前`,
                  size: 'sm',
                  flex: 1,
                  align: 'end',
                },
              ],
            }) as FlexComponent
        )
      : [
          {
            type: 'text',
            text: '設定がありません',
            size: 'sm',
            color: '#888888',
          } as FlexComponent,
        ];

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#27ACB2',
      paddingAll: '10px',
      contents: [
        {
          type: 'text',
          text: '通知設定一覧',
          color: '#FFFFFF',
          weight: 'bold',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: bodyContents,
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '新規追加',
            data: 'action=new_setting',
          },
          style: 'primary',
          height: 'sm',
        },
      ],
    },
  };
}

// ============ Welcome Message ============

export function buildWelcomeMessage(): FlexBubble {
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#27ACB2',
      paddingAll: '15px',
      contents: [
        {
          type: 'text',
          text: '🚃 熊本市電通知サービス',
          color: '#FFFFFF',
          weight: 'bold',
          size: 'lg',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: 'ようこそ！',
          weight: 'bold',
          size: 'md',
        },
        {
          type: 'text',
          text: 'このBotは、熊本市電が指定した電停に近づいたらお知らせします。',
          wrap: true,
          size: 'sm',
        },
        {
          type: 'separator',
        },
        {
          type: 'text',
          text: '📝 使い方',
          weight: 'bold',
          size: 'sm',
        },
        {
          type: 'text',
          text: '「設定」と送信 → 通知設定\n「確認」と送信 → 設定一覧\n「オン」「オフ」 → 通知切替',
          wrap: true,
          size: 'sm',
          color: '#666666',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '通知設定を始める',
            data: 'action=new_setting',
          },
          style: 'primary',
        },
      ],
    },
  };
}

// ============ Morning Notification ============

interface MorningTramInfo {
  line: 'A' | 'B';
  stopsAway: number;
  estimatedMinutes: number;
  vehicleType: string;
}

interface MorningStationData {
  stationName: string;
  directionText: string;
  trams: MorningTramInfo[];
}

export function buildMorningNotificationMessage(stations: MorningStationData[]): FlexBubble {
  const now = new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  const stationContents: FlexComponent[] = [];

  for (const station of stations) {
    // Station header
    stationContents.push({
      type: 'text',
      text: `📍 ${station.stationName}（${station.directionText}）`,
      weight: 'bold',
      size: 'sm',
      margin: 'lg',
    } as FlexComponent);

    if (station.trams.length === 0) {
      stationContents.push({
        type: 'text',
        text: '  現在接近中の電車はありません',
        size: 'sm',
        color: '#888888',
        margin: 'sm',
      } as FlexComponent);
    } else {
      station.trams.forEach((tram, index) => {
        const label = index === 0 ? '次の電車' : 'その次';
        stationContents.push({
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          contents: [
            {
              type: 'text',
              text: `  ${label}:`,
              size: 'sm',
              flex: 2,
            },
            {
              type: 'text',
              text: `${tram.stopsAway}駅前 (約${tram.estimatedMinutes}分)`,
              size: 'sm',
              flex: 3,
            },
          ],
        } as FlexComponent);
        stationContents.push({
          type: 'text',
          text: `    ${tram.line}系統 ${tram.vehicleType}`,
          size: 'xs',
          color: '#666666',
        } as FlexComponent);
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
        {
          type: 'text',
          text: '🚃 おはようございます',
          color: '#FFFFFF',
          weight: 'bold',
          size: 'lg',
        },
        {
          type: 'text',
          text: `${timeStr} 現在の電車情報`,
          color: '#FFFFFF',
          size: 'sm',
        },
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

export async function sendMorningNotification(
  userId: string,
  stations: MorningStationData[]
): Promise<void> {
  const bubble = buildMorningNotificationMessage(stations);
  const altText = `おはようございます。${stations.map(s => s.stationName).join('、')}の電車情報です`;

  await pushFlexMessage(userId, altText, bubble);
}
