import { getSupabaseClient } from './client.js';
import { User, NotificationSetting, NotificationHistory, Direction } from '../types/index.js';

// ============ User Queries ============

export async function findUserByLineId(lineUserId: string): Promise<User | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error finding user:', error);
    throw error;
  }

  return data;
}

export async function createUser(lineUserId: string, displayName?: string): Promise<User> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .insert({
      line_user_id: lineUserId,
      display_name: displayName || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
}

export async function findOrCreateUser(lineUserId: string, displayName?: string): Promise<User> {
  const existing = await findUserByLineId(lineUserId);
  if (existing) {
    return existing;
  }
  return createUser(lineUserId, displayName);
}

export async function updateUserActive(userId: string, isActive: boolean): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user active status:', error);
    throw error;
  }
}

// ============ Notification Settings Queries ============

export async function getNotificationSettings(userId: string): Promise<NotificationSetting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }

  return data || [];
}

export async function getActiveNotificationSettings(): Promise<(NotificationSetting & { user: User })[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .select(`
      *,
      user:users!inner(*)
    `)
    .eq('is_enabled', true)
    .eq('users.is_active', true);

  if (error) {
    console.error('Error getting active notification settings:', error);
    throw error;
  }

  return (data || []).map((item) => ({
    ...item,
    user: item.user as unknown as User,
  }));
}

export async function createNotificationSetting(
  userId: string,
  stationId: number,
  direction: Direction,
  triggerStops: number = 2,
  startTime?: string,
  endTime?: string,
  weekdays?: number[]
): Promise<NotificationSetting> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notification_settings')
    .insert({
      user_id: userId,
      station_id: stationId,
      direction,
      trigger_stops: triggerStops,
      start_time: startTime || null,
      end_time: endTime || null,
      weekdays: weekdays || null,
      is_enabled: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification setting:', error);
    throw error;
  }

  return data;
}

export async function updateNotificationSettingEnabled(
  settingId: string,
  isEnabled: boolean
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notification_settings')
    .update({
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settingId);

  if (error) {
    console.error('Error updating notification setting:', error);
    throw error;
  }
}

export async function deleteNotificationSetting(settingId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notification_settings')
    .delete()
    .eq('id', settingId);

  if (error) {
    console.error('Error deleting notification setting:', error);
    throw error;
  }
}

// ============ Notification History Queries ============

export async function hasRecentNotification(
  settingId: string,
  vehicleId: number,
  withinMinutes: number = 30
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes);

  const { data, error } = await supabase
    .from('notification_history')
    .select('id')
    .eq('setting_id', settingId)
    .eq('vehicle_id', vehicleId)
    .gte('notified_at', cutoffTime.toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking notification history:', error);
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

export async function recordNotification(
  settingId: string,
  vehicleId: number
): Promise<NotificationHistory> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notification_history')
    .insert({
      setting_id: settingId,
      vehicle_id: vehicleId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording notification:', error);
    throw error;
  }

  return data;
}

export async function cleanOldNotificationHistory(olderThanHours: number = 24): Promise<number> {
  const supabase = getSupabaseClient();

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

  const { data, error } = await supabase
    .from('notification_history')
    .delete()
    .lt('notified_at', cutoffTime.toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning notification history:', error);
    throw error;
  }

  return data?.length ?? 0;
}

// ============ Utility Functions ============

export function isWithinTimeRange(
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) {
    return true; // No time restriction
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Handle overnight ranges (e.g., 22:00 - 06:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}

export function isOnActiveWeekday(weekdays: number[] | null): boolean {
  if (!weekdays || weekdays.length === 0) {
    return true; // No weekday restriction
  }

  const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  return weekdays.includes(currentDay);
}
