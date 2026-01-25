import { FollowEvent } from '@line/bot-sdk';
import { findOrCreateUser } from '../db/queries.js';
import { replyFlexMessage, buildWelcomeMessage, getLineClient } from '../services/line-client.js';

/**
 * Handle follow event (user adds bot as friend)
 */
export async function handleFollow(event: FollowEvent): Promise<void> {
  const userId = event.source.userId;
  if (!userId) {
    console.error('Follow event missing userId');
    return;
  }

  try {
    // Get user profile from LINE
    const client = getLineClient();
    let displayName: string | undefined;

    try {
      const profile = await client.getProfile(userId);
      displayName = profile.displayName;
    } catch (error) {
      console.warn('Could not fetch user profile:', error);
    }

    // Create or find user in database
    await findOrCreateUser(userId, displayName);

    // Send welcome message
    if (event.replyToken) {
      await replyFlexMessage(
        event.replyToken,
        '熊本市電通知サービスへようこそ！',
        buildWelcomeMessage()
      );
    }

    console.log(`New user followed: ${userId} (${displayName || 'unknown'})`);
  } catch (error) {
    console.error('Error handling follow event:', error);
  }
}

/**
 * Handle unfollow event (user blocks or removes bot)
 */
export async function handleUnfollow(userId: string): Promise<void> {
  // Note: We don't delete the user, just mark as inactive
  // This preserves their settings if they re-follow
  try {
    const { findUserByLineId, updateUserActive } = await import('../db/queries.js');
    const user = await findUserByLineId(userId);

    if (user) {
      await updateUserActive(user.id, false);
      console.log(`User unfollowed: ${userId}`);
    }
  } catch (error) {
    console.error('Error handling unfollow event:', error);
  }
}
