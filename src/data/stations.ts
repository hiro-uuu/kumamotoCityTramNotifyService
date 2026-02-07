import { Station, Direction } from '../types/index.js';

/**
 * Kumamoto City Tram Station Master Data
 *
 * A系統: 田崎橋 ⇔ 健軍町 (26 stations)
 * B系統: 上熊本 ⇔ 健軍町 (27 stations)
 * 共通区間: 辛島町 ⇔ 健軍町 (18 stations)
 *
 * Direction:
 * - up (us=0): Toward 田崎橋 (A) or 上熊本 (B)
 * - down (us=1): Toward 健軍町
 *
 * interval_id mapping (from original web01.js groupXXArray):
 * - A系統: 1-120
 * - B系統専用区間: 201-226
 * - 共通区間（辛島町以降）: 27-120 (B系統も使用)
 */

export const STATIONS: Station[] = [
  // A系統専用区間 (田崎橋 → 辛島町手前)
  // interval_id from groupAUArray: [1], [4], [8], [12], [16], [20], [24]
  { id: 1, name: '田崎橋', nameKana: 'たさきばし', intervalIdUp: null, intervalIdDown: 1, lines: ['A'] },
  { id: 2, name: '二本木口', nameKana: 'にほんぎぐち', intervalIdUp: 4, intervalIdDown: 4, lines: ['A'] },
  { id: 3, name: '熊本駅前', nameKana: 'くまもとえきまえ', intervalIdUp: 8, intervalIdDown: 8, lines: ['A'] },
  { id: 4, name: '祇園橋', nameKana: 'ぎおんばし', intervalIdUp: 12, intervalIdDown: 12, lines: ['A'] },
  { id: 5, name: '呉服町', nameKana: 'ごふくまち', intervalIdUp: 16, intervalIdDown: 16, lines: ['A'] },
  { id: 6, name: '河原町', nameKana: 'かわらまち', intervalIdUp: 20, intervalIdDown: 20, lines: ['A'] },
  { id: 7, name: '慶徳校前', nameKana: 'けいとくこうまえ', intervalIdUp: 24, intervalIdDown: 24, lines: ['A'] },

  // B系統専用区間 (上熊本 → 西辛島町)
  // interval_id from groupBUArray: [201], [204], [206], [208], [212], [216], [220], [223], [226]
  { id: 21, name: '上熊本', nameKana: 'かみくまもと', intervalIdUp: null, intervalIdDown: 201, lines: ['B'] },
  { id: 22, name: '県立体育館前', nameKana: 'けんりつたいいくかんまえ', intervalIdUp: 204, intervalIdDown: 204, lines: ['B'] },
  { id: 23, name: '本妙寺入口', nameKana: 'ほんみょうじいりぐち', intervalIdUp: 206, intervalIdDown: 206, lines: ['B'] },
  { id: 24, name: '杉塘', nameKana: 'すぎども', intervalIdUp: 208, intervalIdDown: 208, lines: ['B'] },
  { id: 25, name: '段山町', nameKana: 'だにやままち', intervalIdUp: 212, intervalIdDown: 212, lines: ['B'] },
  { id: 26, name: '蔚山町', nameKana: 'うるさんまち', intervalIdUp: 216, intervalIdDown: 216, lines: ['B'] },
  { id: 27, name: '新町', nameKana: 'しんまち', intervalIdUp: 220, intervalIdDown: 220, lines: ['B'] },
  { id: 28, name: '洗馬橋', nameKana: 'せんばばし', intervalIdUp: 223, intervalIdDown: 223, lines: ['B'] },
  { id: 29, name: '西辛島町', nameKana: 'にしからしままち', intervalIdUp: 226, intervalIdDown: 226, lines: ['B'] },

  // 共通区間 (辛島町 → 健軍町)
  // interval_id from groupAUArray: [30], [34], [38], [42], [45], [53], [56], [63], [69], [74], [80], [84], [90], [95], [100], [107], [111], [115], [120]
  { id: 8, name: '辛島町', nameKana: 'からしままち', intervalIdUp: 30, intervalIdDown: 30, lines: ['A', 'B'] },
  { id: 9, name: '花畑町', nameKana: 'はなばたちょう', intervalIdUp: 34, intervalIdDown: 34, lines: ['A', 'B'] },
  { id: 10, name: '熊本城・市役所前', nameKana: 'くまもとじょう・しやくしょまえ', intervalIdUp: 38, intervalIdDown: 38, lines: ['A', 'B'] },
  { id: 11, name: '通町筋', nameKana: 'とおりちょうすじ', intervalIdUp: 42, intervalIdDown: 42, lines: ['A', 'B'] },
  { id: 12, name: '水道町', nameKana: 'すいどうちょう', intervalIdUp: 45, intervalIdDown: 45, lines: ['A', 'B'] },
  { id: 13, name: '九品寺交差点', nameKana: 'くほんじこうさてん', intervalIdUp: 53, intervalIdDown: 53, lines: ['A', 'B'] },
  { id: 14, name: '交通局前', nameKana: 'こうつうきょくまえ', intervalIdUp: 56, intervalIdDown: 56, lines: ['A', 'B'] },
  { id: 15, name: '味噌天神前', nameKana: 'みそてんじんまえ', intervalIdUp: 63, intervalIdDown: 63, lines: ['A', 'B'] },
  { id: 16, name: '新水前寺駅前', nameKana: 'しんすいぜんじえきまえ', intervalIdUp: 69, intervalIdDown: 69, lines: ['A', 'B'] },
  { id: 17, name: '国府', nameKana: 'こくふ', intervalIdUp: 74, intervalIdDown: 74, lines: ['A', 'B'] },
  { id: 18, name: '水前寺公園', nameKana: 'すいぜんじこうえん', intervalIdUp: 80, intervalIdDown: 80, lines: ['A', 'B'] },
  { id: 19, name: '市立体育館前', nameKana: 'しりつたいいくかんまえ', intervalIdUp: 84, intervalIdDown: 84, lines: ['A', 'B'] },
  { id: 20, name: '商業高校前', nameKana: 'しょうぎょうこうこうまえ', intervalIdUp: 90, intervalIdDown: 90, lines: ['A', 'B'] },
  { id: 30, name: '八丁馬場', nameKana: 'はっちょうばば', intervalIdUp: 95, intervalIdDown: 95, lines: ['A', 'B'] },
  { id: 31, name: '神水交差点', nameKana: 'くわみずこうさてん', intervalIdUp: 100, intervalIdDown: 100, lines: ['A', 'B'] },
  { id: 32, name: '健軍校前', nameKana: 'けんぐんこうまえ', intervalIdUp: 107, intervalIdDown: 107, lines: ['A', 'B'] },
  { id: 33, name: '動植物園入口', nameKana: 'どうしょくぶつえんいりぐち', intervalIdUp: 111, intervalIdDown: 111, lines: ['A', 'B'] },
  { id: 34, name: '健軍交番前', nameKana: 'けんぐんこうばんまえ', intervalIdUp: 115, intervalIdDown: 115, lines: ['A', 'B'] },
  { id: 35, name: '健軍町', nameKana: 'けんぐんまち', intervalIdUp: 120, intervalIdDown: null, lines: ['A', 'B'] },
];

/**
 * Interval groups for A-line Up direction (from original web01.js)
 * Each group represents either a station (single element) or between-station intervals (multiple elements)
 * Groups alternate: station, interval, station, interval, ...
 */
const GROUP_A_UP: number[][] = [
  [1],                          // 田崎橋
  [2, 3],                       // 田崎橋-二本木口間
  [4],                          // 二本木口
  [5, 6, 7],                    // 二本木口-熊本駅前間
  [8],                          // 熊本駅前
  [9, 10, 11],                  // 熊本駅前-祇園橋間
  [12],                         // 祇園橋
  [13, 14, 15],                 // 祇園橋-呉服町間
  [16],                         // 呉服町
  [17, 18, 19],                 // 呉服町-河原町間
  [20],                         // 河原町
  [21, 22, 23],                 // 河原町-慶徳校前間
  [24],                         // 慶徳校前
  [25, 26, 27, 28, 29],         // 慶徳校前-辛島町間
  [30],                         // 辛島町
  [31, 32, 33],                 // 辛島町-花畑町間
  [34],                         // 花畑町
  [35, 36, 37],                 // 花畑町-熊本城市役所前間
  [38],                         // 熊本城市役所前
  [39, 40, 41],                 // 熊本城市役所前-通町筋間
  [42],                         // 通町筋
  [43, 44],                     // 通町筋-水道町間
  [45],                         // 水道町
  [46, 47, 48, 49, 50, 51, 52], // 水道町-九品寺交差点間
  [53],                         // 九品寺交差点
  [54, 55],                     // 九品寺交差点-交通局前間
  [56],                         // 交通局前
  [57, 58, 59, 60, 61, 62],     // 交通局前-味噌天神前間
  [63],                         // 味噌天神前
  [64, 65, 66, 67, 68],         // 味噌天神前-新水前寺駅前間
  [69],                         // 新水前寺駅前
  [70, 71, 72, 73],             // 新水前寺駅前-国府間
  [74],                         // 国府
  [75, 76, 77, 78, 79],         // 国府-水前寺公園間
  [80],                         // 水前寺公園
  [81, 82, 83],                 // 水前寺公園-市立体育館前間
  [84],                         // 市立体育館前
  [85, 86, 87, 88, 89],         // 市立体育館前-商業高校前間
  [90],                         // 商業高校前
  [91, 92, 93, 94],             // 商業高校前-八丁馬場間
  [95],                         // 八丁馬場
  [96, 97, 98, 99],             // 八丁馬場-神水交差点間
  [100],                        // 神水交差点
  [101, 102, 103, 104, 105, 106], // 神水交差点-健軍校前間
  [107],                        // 健軍校前
  [108, 109, 110],              // 健軍校前-動植物園入口間
  [111],                        // 動植物園入口
  [112, 113, 114],              // 動植物園入口-健軍交番前間
  [115],                        // 健軍交番前
  [116, 117, 118, 119],         // 健軍交番前-健軍町間
  [120],                        // 健軍町
];

/**
 * Interval groups for A-line Down direction
 */
const GROUP_A_DOWN: number[][] = [
  [1],
  [2, 3],
  [4],
  [5, 6, 7],
  [8],
  [9, 10, 11],
  [12],
  [13, 14, 15, 16],
  [17],
  [18, 19],
  [20],
  [21, 22, 23],
  [24],
  [25, 26, 27, 28, 29],
  [30],
  [31, 32, 33],
  [34],
  [35, 36, 37],
  [38],
  [39, 40, 41],
  [42],
  [43, 44],
  [45],
  [46, 47, 48, 49, 50, 51],
  [52],
  [53, 54, 55],
  [56],
  [57, 58, 59, 60, 61, 62],
  [63],
  [64, 65, 66, 67, 68],
  [69],
  [70, 71, 72, 73],
  [74],
  [75, 76, 77, 78, 79],
  [80],
  [81, 82, 83],
  [84],
  [85, 86, 87, 88, 89],
  [90],
  [91, 92, 93, 94],
  [95],
  [96, 97, 98],
  [99],
  [100, 101, 102, 103, 104, 105, 106],
  [107],
  [108, 109, 110],
  [111],
  [112, 113, 114],
  [115],
  [116, 117, 118, 119],
  [120],
];

/**
 * Interval groups for B-line Up direction
 * B-line starts at interval_id 201-226, then joins A-line at interval 27+
 */
const GROUP_B_UP: number[][] = [
  [201],                        // 上熊本
  [202, 203],                   // 上熊本-県立体育館前間
  [204],                        // 県立体育館前
  [205],                        // 県立体育館前-本妙寺入口間
  [206],                        // 本妙寺入口
  [207],                        // 本妙寺入口-杉塘間
  [208],                        // 杉塘
  [209, 210, 211],              // 杉塘-段山町間
  [212],                        // 段山町
  [213, 214, 215],              // 段山町-蔚山町間
  [216],                        // 蔚山町
  [217, 218, 219],              // 蔚山町-新町間
  [220],                        // 新町
  [221, 222],                   // 新町-洗馬橋間
  [223],                        // 洗馬橋
  [224, 225],                   // 洗馬橋-西辛島町間
  [226],                        // 西辛島町
  [27, 28, 29],                 // 西辛島町-辛島町間（共通区間に合流）
  [30],                         // 辛島町
  [31, 32, 33],
  [34],
  [35, 36, 37],
  [38],
  [39, 40, 41],
  [42],
  [43, 44],
  [45],
  [46, 47, 48, 49, 50, 51, 52],
  [53],
  [54, 55],
  [56],
  [57, 58, 59, 60, 61, 62],
  [63],
  [64, 65, 66, 67, 68],
  [69],
  [70, 71, 72, 73],
  [74],
  [75, 76, 77, 78, 79],
  [80],
  [81, 82, 83],
  [84],
  [85, 86, 87, 88, 89],
  [90],
  [91, 92, 93, 94],
  [95],
  [96, 97, 98, 99],
  [100],
  [101, 102, 103, 104, 105, 106],
  [107],
  [108, 109, 110],
  [111],
  [112, 113, 114],
  [115],
  [116, 117, 118, 119],
  [120],
];

/**
 * Interval groups for B-line Down direction
 */
const GROUP_B_DOWN: number[][] = [
  [201],
  [202, 203],
  [204],
  [205],
  [206],
  [207],
  [208],
  [209, 210, 211],
  [212],
  [213, 214, 215],
  [216],
  [217, 218, 219],
  [220],
  [221, 222],
  [223],
  [224, 225],
  [226],
  [27, 28, 29],
  [30],
  [31, 32, 33],
  [34],
  [35, 36, 37],
  [38],
  [39, 40, 41],
  [42],
  [43, 44],
  [45],
  [46, 47, 48, 49, 50, 51],
  [52],
  [53, 54, 55],
  [56],
  [57, 58, 59, 60, 61, 62],
  [63],
  [64, 65, 66, 67, 68],
  [69],
  [70, 71, 72, 73],
  [74],
  [75, 76, 77, 78, 79],
  [80],
  [81, 82, 83],
  [84],
  [85, 86, 87, 88, 89],
  [90],
  [91, 92, 93, 94],
  [95],
  [96, 97, 98],
  [99],
  [100, 101, 102, 103, 104, 105, 106],
  [107],
  [108, 109, 110],
  [111],
  [112, 113, 114],
  [115],
  [116, 117, 118, 119],
  [120],
];

/**
 * Get the interval groups for a specific line and direction
 */
export function getIntervalGroups(line: 'A' | 'B', direction: Direction): number[][] {
  if (line === 'A') {
    return direction === 'up' ? GROUP_A_UP : GROUP_A_DOWN;
  }
  return direction === 'up' ? GROUP_B_UP : GROUP_B_DOWN;
}

/**
 * Station order for A-line (田崎橋 → 健軍町)
 */
const A_LINE_STATION_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 33, 34, 35];

/**
 * Station order for B-line (上熊本 → 健軍町)
 */
const B_LINE_STATION_ORDER = [21, 22, 23, 24, 25, 26, 27, 28, 29, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 33, 34, 35];

/**
 * Map interval_id to station and group index
 * Built from the interval groups
 */
interface IntervalInfo {
  station: Station;
  groupIndex: number;
  isAtStation: boolean; // true if at station, false if between stations
}

// Build interval to station map for all lines and directions
const INTERVAL_MAPS: Record<string, Map<number, IntervalInfo>> = {};

function buildIntervalMap(line: 'A' | 'B', direction: Direction): Map<number, IntervalInfo> {
  const map = new Map<number, IntervalInfo>();
  const groups = getIntervalGroups(line, direction);
  const stationOrder = line === 'A' ? A_LINE_STATION_ORDER : B_LINE_STATION_ORDER;

  let stationIndex = 0;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const isStationGroup = groupIndex % 2 === 0; // Even indices are stations

    if (isStationGroup && stationIndex < stationOrder.length) {
      const stationId = stationOrder[stationIndex];
      const station = STATIONS.find((s) => s.id === stationId);

      if (station) {
        for (const intervalId of group) {
          map.set(intervalId, {
            station,
            groupIndex,
            isAtStation: true,
          });
        }
      }
      stationIndex++;
    } else if (!isStationGroup) {
      // Between stations - assign to the station the tram is approaching
      // Group array is ordered from 田崎橋/上熊本 to 健軍町
      // - Down direction (toward 健軍町): approaching the NEXT station in array (stationIndex)
      // - Up direction (toward 田崎橋/上熊本): approaching the PREVIOUS station in array (stationIndex - 1)
      let approachingStationIndex: number;

      if (direction === 'down') {
        // Going toward Kengunmachi - approaching the next station
        approachingStationIndex = stationIndex;
      } else {
        // Going up (toward Tasaki/Kamikumamoto) - approaching the previous station
        approachingStationIndex = stationIndex - 1;
      }

      if (approachingStationIndex >= 0 && approachingStationIndex < stationOrder.length) {
        const approachingStationId = stationOrder[approachingStationIndex];
        const approachingStation = STATIONS.find((s) => s.id === approachingStationId);

        if (approachingStation) {
          for (const intervalId of group) {
            map.set(intervalId, {
              station: approachingStation,
              groupIndex,
              isAtStation: false,
            });
          }
        }
      }
    }
  }

  return map;
}

// Initialize interval maps
INTERVAL_MAPS['A_up'] = buildIntervalMap('A', 'up');
INTERVAL_MAPS['A_down'] = buildIntervalMap('A', 'down');
INTERVAL_MAPS['B_up'] = buildIntervalMap('B', 'up');
INTERVAL_MAPS['B_down'] = buildIntervalMap('B', 'down');

/**
 * Get interval info for a specific interval_id, line, and direction
 */
export function getIntervalInfo(
  intervalId: number,
  line: 'A' | 'B',
  direction: Direction
): IntervalInfo | undefined {
  const key = `${line}_${direction}`;
  return INTERVAL_MAPS[key]?.get(intervalId);
}

/**
 * Legacy map for backward compatibility
 * Maps interval_id to nearest station (direction-agnostic)
 */
export const INTERVAL_TO_STATION_MAP: Map<number, { station: Station; direction: 'approaching' | 'departing' }> =
  new Map();

// Build legacy map from A-line up direction (most common use case)
INTERVAL_MAPS['A_up'].forEach((info, intervalId) => {
  INTERVAL_TO_STATION_MAP.set(intervalId, {
    station: info.station,
    direction: info.isAtStation ? 'departing' : 'approaching',
  });
});

// Add B-line specific intervals (201-226)
INTERVAL_MAPS['B_up'].forEach((info, intervalId) => {
  if (intervalId >= 201 && intervalId <= 226) {
    INTERVAL_TO_STATION_MAP.set(intervalId, {
      station: info.station,
      direction: info.isAtStation ? 'departing' : 'approaching',
    });
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

// Sort stations by their order on a specific line
function sortStationsByLine(stations: Station[], line: 'A' | 'B'): Station[] {
  const order = line === 'A' ? A_LINE_STATION_ORDER : B_LINE_STATION_ORDER;

  return stations
    .filter((s) => order.includes(s.id))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

// Calculate distance in stops between two stations for a given direction and line
export function getStopsDistance(
  fromStationId: number,
  toStationId: number,
  direction: 'up' | 'down',
  line: 'A' | 'B'
): number | null {
  const lineStations = getStationsByLine(line);
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

/**
 * Get the group index for an interval_id within a specific line and direction
 * Returns -1 if not found
 */
export function getGroupIndex(
  intervalId: number,
  line: 'A' | 'B',
  direction: Direction
): number {
  const info = getIntervalInfo(intervalId, line, direction);
  return info?.groupIndex ?? -1;
}

/**
 * Get station index (position in line order) from interval_id
 */
export function getStationIndex(
  intervalId: number,
  line: 'A' | 'B',
  direction: Direction
): number {
  const info = getIntervalInfo(intervalId, line, direction);
  if (!info) return -1;

  const stationOrder = line === 'A' ? A_LINE_STATION_ORDER : B_LINE_STATION_ORDER;
  return stationOrder.indexOf(info.station.id);
}

// Get current station from interval_id (legacy)
export function getCurrentStationFromInterval(intervalId: number): Station | null {
  const info = INTERVAL_TO_STATION_MAP.get(intervalId);
  if (!info) return null;
  return info.station;
}

// Estimate minutes to arrival (rough: ~2 min per stop)
export function estimateMinutesToArrival(stopsAway: number): number {
  return Math.max(1, Math.round(stopsAway * 2));
}
