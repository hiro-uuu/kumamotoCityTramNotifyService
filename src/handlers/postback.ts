import { PostbackEvent } from '@line/bot-sdk';
import { Direction } from '../types/index.js';
import {
  findUserByLineId,
  createNotificationSetting,
  deleteNotificationSetting,
  getNotificationSettings,
} from '../db/queries.js';
import {
  replyText,
  replyWithQuickReply,
  replyFlexMessage,
  buildDirectionQuickReply,
  buildTriggerStopsQuickReply,
  buildStationSelectCarousel,
  buildSettingsListBubble,
} from '../services/line-client.js';
import { STATIONS, getStationById } from '../data/stations.js';

/**
 * Parse postback data string into key-value pairs
 */
function parsePostbackData(data: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = data.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  }

  return params;
}

/**
 * Handle postback event from LINE
 */
export async function handlePostback(event: PostbackEvent): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  if (!userId || !replyToken) {
    return;
  }

  const data = parsePostbackData(event.postback.data);
  const action = data.action;

  try {
    // Get user from database
    const user = await findUserByLineId(userId);
    if (!user) {
      await replyText(replyToken, 'ユーザー情報が見つかりません。もう一度友だち追加してください。');
      return;
    }

    switch (action) {
      case 'new_setting':
        await handleNewSetting(replyToken);
        break;

      case 'select_station':
        await handleSelectStation(replyToken, data);
        break;

      case 'select_direction':
        await handleSelectDirection(replyToken, data);
        break;

      case 'select_trigger':
        await handleSelectTrigger(replyToken, user.id, data);
        break;

      case 'delete_setting':
        await handleDeleteSetting(replyToken, user.id, data);
        break;

      case 'view_settings':
        await handleViewSettings(replyToken, user.id);
        break;

      default:
        console.warn('Unknown postback action:', action);
        await replyText(replyToken, '不明な操作です。');
    }
  } catch (error) {
    console.error('Error handling postback:', error);
    await replyText(replyToken, 'エラーが発生しました。しばらくしてから再度お試しください。');
  }
}

/**
 * Start new setting flow - show station selection
 */
async function handleNewSetting(replyToken: string): Promise<void> {
  const carousel = buildStationSelectCarousel(STATIONS);
  await replyFlexMessage(replyToken, '通知を受け取りたい電停を選択してください', carousel);
}

/**
 * Handle station selection - show direction selection
 */
async function handleSelectStation(
  replyToken: string,
  data: Record<string, string>
): Promise<void> {
  const stationId = parseInt(data.station_id, 10);
  const station = getStationById(stationId);

  if (!station) {
    await replyText(replyToken, '電停が見つかりません。');
    return;
  }

  // Determine which line to use for direction labels
  const line = station.lines[0];

  const quickReply = buildDirectionQuickReply(stationId, line);

  await replyWithQuickReply(
    replyToken,
    `📍 ${station.name}\n\nどちら方面の電車を通知しますか？`,
    quickReply
  );
}

/**
 * Handle direction selection - show trigger stops selection
 */
async function handleSelectDirection(
  replyToken: string,
  data: Record<string, string>
): Promise<void> {
  const stationId = parseInt(data.station_id, 10);
  const direction = data.direction as Direction;

  const station = getStationById(stationId);
  if (!station) {
    await replyText(replyToken, '電停が見つかりません。');
    return;
  }

  const dirText = direction === 'down' ? '健軍町方面' : '始発方面';

  const quickReply = buildTriggerStopsQuickReply(stationId, direction);

  await replyWithQuickReply(
    replyToken,
    `📍 ${station.name} (${dirText})\n\n何駅前で通知しますか？\n（目安: 1駅=約2分）`,
    quickReply
  );
}

/**
 * Handle trigger selection - save setting and confirm
 */
async function handleSelectTrigger(
  replyToken: string,
  userId: string,
  data: Record<string, string>
): Promise<void> {
  const stationId = parseInt(data.station_id, 10);
  const direction = data.direction as Direction;
  const triggerStops = parseInt(data.trigger, 10);

  const station = getStationById(stationId);
  if (!station) {
    await replyText(replyToken, '電停が見つかりません。');
    return;
  }

  // Create the notification setting
  await createNotificationSetting(userId, stationId, direction, triggerStops);

  const dirText = direction === 'down' ? '健軍町方面' : '始発方面';

  await replyText(
    replyToken,
    `✅ 設定完了！\n\n` +
      `📍 ${station.name}\n` +
      `🚃 ${dirText}\n` +
      `⏰ ${triggerStops}駅前で通知\n\n` +
      `電車が近づいたらお知らせします。\n` +
      `「確認」で設定一覧を表示できます。`
  );
}

/**
 * Handle delete setting
 */
async function handleDeleteSetting(
  replyToken: string,
  _userId: string,
  data: Record<string, string>
): Promise<void> {
  const settingId = data.setting_id;

  if (!settingId) {
    await replyText(replyToken, '設定IDが指定されていません。');
    return;
  }

  await deleteNotificationSetting(settingId);
  await replyText(replyToken, '✅ 設定を削除しました。');
}

/**
 * Handle view settings
 */
async function handleViewSettings(replyToken: string, userId: string): Promise<void> {
  const settings = await getNotificationSettings(userId);

  const formattedSettings = settings.map((s) => {
    const station = getStationById(s.station_id);
    return {
      id: s.id,
      stationName: station?.name || `駅ID:${s.station_id}`,
      direction: s.direction,
      triggerStops: s.trigger_stops,
      isEnabled: s.is_enabled,
    };
  });

  const bubble = buildSettingsListBubble(formattedSettings);
  await replyFlexMessage(replyToken, '通知設定一覧', bubble);
}
