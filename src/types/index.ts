// Tram API Types
export interface TramPosition {
  interval_id: number;
  rosen: 'A' | 'B';
  us: 0 | 1; // 0 = up (toward Tasaki/Kamikmamoto), 1 = down (toward Kengunmachi)
  vehicle_type: number; // 2 = super low floor car
  vehicle_id: number;
}

export interface TramApiResponse {
  positions: TramPosition[];
  timestamp: Date;
}

export type Direction = 'up' | 'down';

// Station Types
export interface Station {
  id: number;
  name: string;
  nameKana: string;
  intervalIdUp: number | null; // interval_id for up direction
  intervalIdDown: number | null; // interval_id for down direction
  lines: ('A' | 'B')[];
}

export interface StationInterval {
  intervalId: number;
  fromStationId: number;
  toStationId: number;
  direction: Direction;
  line: 'A' | 'B';
}

// Database Types
export interface User {
  id: string;
  line_user_id: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NotificationSetting {
  id: string;
  user_id: string;
  station_id: number;
  direction: Direction;
  trigger_stops: number;
  start_time: string | null;
  end_time: string | null;
  weekdays: number[] | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  setting_id: string;
  vehicle_id: number;
  notified_at: string;
}

// LINE Types
export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// Notification Types
export interface PendingNotification {
  setting: NotificationSetting;
  user: User;
  station: Station;
  tram: TramPosition;
  stopsAway: number;
  estimatedMinutes: number;
}

// Conversation State for Settings Flow
export type SettingState =
  | { step: 'idle' }
  | { step: 'select_station' }
  | { step: 'select_direction'; stationId: number }
  | { step: 'select_trigger'; stationId: number; direction: Direction }
  | { step: 'select_time'; stationId: number; direction: Direction; triggerStops: number }
  | { step: 'confirm'; stationId: number; direction: Direction; triggerStops: number; startTime?: string; endTime?: string };

export interface UserConversationState {
  userId: string;
  state: SettingState;
  updatedAt: Date;
}
