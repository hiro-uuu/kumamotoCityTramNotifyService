import { Station } from '../types/index.js';

/**
 * Kumamoto City Tram Station Master Data
 *
 * A系統: 田崎橋 ⇔ 健軍町 (17 stations)
 * B系統: 上熊本 ⇔ 健軍町 (18 stations)
 * 共通区間: 辛島町 ⇔ 健軍町 (12 stations)
 *
 * Direction:
 * - up (us=0): Toward 田崎橋 (A) or 上熊本 (B)
 * - down (us=1): Toward 健軍町
 */

export const STATIONS: Station[] = [
  // A系統専用区間 (田崎橋 → 辛島町)
  { id: 1, name: '田崎橋', nameKana: 'たさきばし', intervalIdUp: null, intervalIdDown: 101, lines: ['A'] },
  { id: 2, name: '二本木口', nameKana: 'にほんぎぐち', intervalIdUp: 101, intervalIdDown: 102, lines: ['A'] },
  { id: 3, name: '熊本駅前', nameKana: 'くまもとえきまえ', intervalIdUp: 102, intervalIdDown: 103, lines: ['A'] },
  { id: 4, name: '祇園橋', nameKana: 'ぎおんばし', intervalIdUp: 103, intervalIdDown: 104, lines: ['A'] },
  { id: 5, name: '呉服町', nameKana: 'ごふくまち', intervalIdUp: 104, intervalIdDown: 105, lines: ['A'] },
  { id: 6, name: '河原町', nameKana: 'かわらまち', intervalIdUp: 105, intervalIdDown: 106, lines: ['A'] },
  { id: 7, name: '慶徳校前', nameKana: 'けいとくこうまえ', intervalIdUp: 106, intervalIdDown: 107, lines: ['A'] },

  // B系統専用区間 (上熊本 → 辛島町)
  { id: 21, name: '上熊本', nameKana: 'かみくまもと', intervalIdUp: null, intervalIdDown: 201, lines: ['B'] },
  { id: 22, name: '県立体育館前', nameKana: 'けんりつたいいくかんまえ', intervalIdUp: 201, intervalIdDown: 202, lines: ['B'] },
  { id: 23, name: '本妙寺入口', nameKana: 'ほんみょうじいりぐち', intervalIdUp: 202, intervalIdDown: 203, lines: ['B'] },
  { id: 24, name: '杉塘', nameKana: 'すぎども', intervalIdUp: 203, intervalIdDown: 204, lines: ['B'] },
  { id: 25, name: '段山町', nameKana: 'だにやままち', intervalIdUp: 204, intervalIdDown: 205, lines: ['B'] },
  { id: 26, name: '蔚山町', nameKana: 'うるさんまち', intervalIdUp: 205, intervalIdDown: 206, lines: ['B'] },
  { id: 27, name: '新町', nameKana: 'しんまち', intervalIdUp: 206, intervalIdDown: 207, lines: ['B'] },
  { id: 28, name: '洗馬橋', nameKana: 'せんばばし', intervalIdUp: 207, intervalIdDown: 208, lines: ['B'] },
  { id: 29, name: '西辛島町', nameKana: 'にしからしままち', intervalIdUp: 208, intervalIdDown: 209, lines: ['B'] },

  // 共通区間 (辛島町 → 健軍町)
  { id: 8, name: '辛島町', nameKana: 'からしままち', intervalIdUp: 107, intervalIdDown: 108, lines: ['A', 'B'] },
  { id: 9, name: '花畑町', nameKana: 'はなばたちょう', intervalIdUp: 108, intervalIdDown: 109, lines: ['A', 'B'] },
  { id: 10, name: '熊本城・市役所前', nameKana: 'くまもとじょう・しやくしょまえ', intervalIdUp: 109, intervalIdDown: 110, lines: ['A', 'B'] },
  { id: 11, name: '通町筋', nameKana: 'とおりちょうすじ', intervalIdUp: 110, intervalIdDown: 111, lines: ['A', 'B'] },
  { id: 12, name: '水道町', nameKana: 'すいどうちょう', intervalIdUp: 111, intervalIdDown: 112, lines: ['A', 'B'] },
  { id: 13, name: '九品寺交差点', nameKana: 'くほんじこうさてん', intervalIdUp: 112, intervalIdDown: 113, lines: ['A', 'B'] },
  { id: 14, name: '交通局前', nameKana: 'こうつうきょくまえ', intervalIdUp: 113, intervalIdDown: 114, lines: ['A', 'B'] },
  { id: 15, name: '味噌天神前', nameKana: 'みそてんじんまえ', intervalIdUp: 114, intervalIdDown: 115, lines: ['A', 'B'] },
  { id: 16, name: '新水前寺駅前', nameKana: 'しんすいぜんじえきまえ', intervalIdUp: 115, intervalIdDown: 116, lines: ['A', 'B'] },
  { id: 17, name: '国府', nameKana: 'こくふ', intervalIdUp: 116, intervalIdDown: 117, lines: ['A', 'B'] },
  { id: 18, name: '水前寺公園', nameKana: 'すいぜんじこうえん', intervalIdUp: 117, intervalIdDown: 118, lines: ['A', 'B'] },
  { id: 19, name: '市立体育館前', nameKana: 'しりつたいいくかんまえ', intervalIdUp: 118, intervalIdDown: 119, lines: ['A', 'B'] },
  { id: 20, name: '商業高校前', nameKana: 'しょうぎょうこうこうまえ', intervalIdUp: 119, intervalIdDown: 120, lines: ['A', 'B'] },
  { id: 30, name: '八丁馬場', nameKana: 'はっちょうばば', intervalIdUp: 120, intervalIdDown: 121, lines: ['A', 'B'] },
  { id: 31, name: '神水交差点', nameKana: 'くわみずこうさてん', intervalIdUp: 121, intervalIdDown: 122, lines: ['A', 'B'] },
  { id: 32, name: '健軍校前', nameKana: 'けんぐんこうまえ', intervalIdUp: 122, intervalIdDown: 123, lines: ['A', 'B'] },
  { id: 33, name: '動植物園入口', nameKana: 'どうしょくぶつえんいりぐち', intervalIdUp: 123, intervalIdDown: 124, lines: ['A', 'B'] },
  { id: 34, name: '健軍町', nameKana: 'けんぐんまち', intervalIdUp: 124, intervalIdDown: null, lines: ['A', 'B'] },
];

// Map from interval_id to station information
export const INTERVAL_TO_STATION_MAP: Map<number, { station: Station; direction: 'approaching' | 'departing' }> = new Map();

// Build interval to station map
STATIONS.forEach((station) => {
  if (station.intervalIdUp !== null) {
    // Tram is in interval approaching this station from down direction (going up)
    INTERVAL_TO_STATION_MAP.set(station.intervalIdUp, { station, direction: 'approaching' });
  }
  if (station.intervalIdDown !== null) {
    // Tram is in interval departing from this station going down
    INTERVAL_TO_STATION_MAP.set(station.intervalIdDown, { station, direction: 'departing' });
  }
});

// Get station by ID
export function getStationById(id: number): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

// Get station by name
export function getStationByName(name: string): Station | undefined {
  return STATIONS.find((s) => s.name === name || s.nameKana === name);
}

// Get stations for a specific line
export function getStationsByLine(line: 'A' | 'B'): Station[] {
  return STATIONS.filter((s) => s.lines.includes(line));
}

// Calculate distance in stops between two stations for a given direction and line
export function getStopsDistance(
  fromStationId: number,
  toStationId: number,
  direction: 'up' | 'down',
  line: 'A' | 'B'
): number | null {
  const lineStations = getStationsByLine(line);

  // Sort stations by their position on the line
  const orderedStations = sortStationsByLine(lineStations, line);

  const fromIndex = orderedStations.findIndex((s) => s.id === fromStationId);
  const toIndex = orderedStations.findIndex((s) => s.id === toStationId);

  if (fromIndex === -1 || toIndex === -1) {
    return null;
  }

  if (direction === 'down') {
    // Going toward Kengunmachi (increasing index)
    return toIndex - fromIndex;
  } else {
    // Going up (decreasing index)
    return fromIndex - toIndex;
  }
}

// Sort stations by their order on a specific line
function sortStationsByLine(stations: Station[], line: 'A' | 'B'): Station[] {
  // Define station order for each line
  const aLineOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 33, 34];
  const bLineOrder = [21, 22, 23, 24, 25, 26, 27, 28, 29, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 33, 34];

  const order = line === 'A' ? aLineOrder : bLineOrder;

  return stations
    .filter((s) => order.includes(s.id))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

// Get the terminal station name for a direction
export function getTerminalName(direction: 'up' | 'down', line: 'A' | 'B'): string {
  if (direction === 'down') {
    return '健軍町';
  }
  return line === 'A' ? '田崎橋' : '上熊本';
}

// Get ordered station list for a line
export function getOrderedStations(line: 'A' | 'B'): Station[] {
  return sortStationsByLine(getStationsByLine(line), line);
}

// Get current station from interval_id
export function getCurrentStationFromInterval(intervalId: number): Station | null {
  const info = INTERVAL_TO_STATION_MAP.get(intervalId);
  if (!info) return null;

  return info.station;
}

// Estimate minutes to arrival (rough: ~2 min per stop)
export function estimateMinutesToArrival(stopsAway: number): number {
  return Math.max(1, Math.round(stopsAway * 2));
}
