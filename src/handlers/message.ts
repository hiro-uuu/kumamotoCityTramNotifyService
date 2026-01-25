import { MessageEvent, TextEventMessage } from '@line/bot-sdk';
import {
  findUserByLineId,
  getNotificationSettings,
  updateNotificationSettingEnabled,
} from '../db/queries.js';
import {
  replyText,
  replyFlexMessage,
  buildSettingsListBubble,
  buildStationSelectCarousel,
  buildWelcomeMessage,
} from '../services/line-client.js';
import { STATIONS, getStationById } from '../data/stations.js';
import { fetchTramPositions } from '../services/tram-api.js';
import { findTramsApproaching } from '../services/notification.js';
import { estimateMinutesToArrival } from '../data/stations.js';

/**
 * Handle text message from user
 */
export async function handleMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') {
    return;
  }

  const textMessage = event.message as TextEventMessage;
  const text = textMessage.text.trim();
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  if (!userId || !replyToken) {
    return;
  }

  // Normalize text for command matching
  const normalizedText = text.toLowerCase();

  try {
    // Check if user exists
    const user = await findUserByLineId(userId);
    if (!user) {
      // User not registered - prompt to add as friend properly
      await replyFlexMessage(replyToken, 'ようこそ', buildWelcomeMessage());
      return;
    }

    // Command routing
    switch (true) {
      case /^(設定|せってい|setting)$/i.test(normalizedText):
        await handleSettingCommand(replyToken, user.id);
        break;

      case /^(確認|かくにん|status|list)$/i.test(normalizedText):
        await handleListCommand(replyToken, user.id);
        break;

      case /^(オン|on|有効)$/i.test(normalizedText):
        await handleToggleCommand(replyToken, user.id, true);
        break;

      case /^(オフ|off|無効)$/i.test(normalizedText):
        await handleToggleCommand(replyToken, user.id, false);
        break;

      case /^(削除|delete)$/i.test(normalizedText):
        await handleDeleteCommand(replyToken, user.id);
        break;

      case /^(ヘルプ|help|使い方|\?)$/i.test(normalizedText):
        await handleHelpCommand(replyToken);
        break;

      case /^(いま|今|now|current)$/i.test(normalizedText):
        await handleCurrentCommand(replyToken, user.id);
        break;

      default:
        // Unknown command - show help
        await replyText(
          replyToken,
          '📝 コマンド一覧\n\n' +
            '「設定」→ 通知設定\n' +
            '「確認」→ 設定一覧\n' +
            '「オン」→ 通知有効化\n' +
            '「オフ」→ 通知無効化\n' +
            '「削除」→ 設定削除\n' +
            '「いま」→ 接近中の電車'
        );
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await replyText(replyToken, 'エラーが発生しました。しばらくしてから再度お試しください。');
  }
}

/**
 * Handle "設定" command - start notification setting flow
 */
async function handleSettingCommand(replyToken: string, _userId: string): Promise<void> {
  // Show station selection carousel
  const carousel = buildStationSelectCarousel(STATIONS);
  await replyFlexMessage(replyToken, '電停を選択してください', carousel);
}

/**
 * Handle "確認" command - show current settings
 */
async function handleListCommand(replyToken: string, userId: string): Promise<void> {
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

/**
 * Handle "オン/オフ" command - toggle notifications
 */
async function handleToggleCommand(
  replyToken: string,
  userId: string,
  enable: boolean
): Promise<void> {
  const settings = await getNotificationSettings(userId);

  if (settings.length === 0) {
    await replyText(replyToken, '通知設定がありません。「設定」から追加してください。');
    return;
  }

  // Toggle all settings
  for (const setting of settings) {
    await updateNotificationSettingEnabled(setting.id, enable);
  }

  const status = enable ? '有効' : '無効';
  await replyText(replyToken, `✅ すべての通知を${status}にしました。`);
}

/**
 * Handle "削除" command - show delete options
 */
async function handleDeleteCommand(replyToken: string, userId: string): Promise<void> {
  const settings = await getNotificationSettings(userId);

  if (settings.length === 0) {
    await replyText(replyToken, '削除する設定がありません。');
    return;
  }

  // For now, just list settings with instruction
  let message = '削除する設定の番号を送信してください:\n\n';

  settings.forEach((s, index) => {
    const station = getStationById(s.station_id);
    const dirText = s.direction === 'down' ? '健軍町方面' : '始発方面';
    message += `${index + 1}. ${station?.name || '不明'} (${dirText})\n`;
  });

  message += '\n例: 「1」と送信で1番を削除';

  await replyText(replyToken, message);
}

/**
 * Handle "ヘルプ" command
 */
async function handleHelpCommand(replyToken: string): Promise<void> {
  await replyFlexMessage(replyToken, 'ようこそ', buildWelcomeMessage());
}

/**
 * Handle "いま" command - show approaching trams
 */
async function handleCurrentCommand(replyToken: string, userId: string): Promise<void> {
  const settings = await getNotificationSettings(userId);

  if (settings.length === 0) {
    await replyText(
      replyToken,
      '設定された電停がありません。「設定」から通知電停を追加してください。'
    );
    return;
  }

  try {
    const trams = await fetchTramPositions();

    let message = '🚃 現在の電車状況\n';

    for (const setting of settings) {
      const station = getStationById(setting.station_id);
      if (!station) continue;

      const dirText = setting.direction === 'down' ? '健軍町方面' : '始発方面';
      message += `\n📍 ${station.name} (${dirText})\n`;

      const approaching = findTramsApproaching(trams, setting.station_id, setting.direction, 5);

      if (approaching.length === 0) {
        message += '  → 近くに電車はありません\n';
      } else {
        for (const { tram, stopsAway } of approaching.slice(0, 3)) {
          const mins = estimateMinutesToArrival(stopsAway);
          message += `  → ${stopsAway}駅前 (約${mins}分) ${tram.rosen}系統\n`;
        }
      }
    }

    await replyText(replyToken, message);
  } catch (error) {
    console.error('Error fetching tram positions:', error);
    await replyText(replyToken, '電車情報の取得に失敗しました。');
  }
}
