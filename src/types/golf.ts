/**
 * Golf Intelligence — Data Types
 */

// Raw shot data from Google Sheet
export interface RawShot {
  Player: string;
  'Round ID': string;
  Date: string;
  Course: string;
  'Weather Difficulty': string;
  'Course Difficulty': string;
  Tournament: string;
  Shot: number;
  Hole: number;
  Score: number;
  'Starting Distance': number;
  'Starting Lie': string;
  'Ending Distance': number;
  'Ending Lie': string;
  Penalty: string;
  'Did not Hit Driver': string;
  'Putt Result': string;
}

// Shot type classification
export type ShotType = 'Drive' | 'Approach' | 'Recovery' | 'Short Game' | 'Putt';

// Processed shot data with computed fields
export interface ProcessedShot extends RawShot {
  shotType: ShotType;
  holePar: number;
  scoreToPar: number; // Will need round-level data to calculate
  calculatedStrokesGained: number; // SG calculated from benchmark (not raw data)
}

// Shot category for aggregation
export interface ShotCategory {
  type: ShotType;
  totalShots: number;
  strokesGained: number;
  avgStrokesGained: number;
}

// Round-level summary
export interface RoundSummary {
  roundId: string;
  date: string;
  course: string;
  totalShots: number;
  strokesGained: number;
  avgStrokesGained: number;
  fairwaysHit: number;
  fairwaysTotal: number;
  gir: number;
  girTotal: number;
  penalties: number;
}

// Tiger 5 fail types with per-fail SG tracking
export interface Tiger5Fail {
  threePutts: number;
  threePuttsSG: number;
  bogeyOnPar5: number;
  bogeyOnPar5SG: number;
  doubleBogey: number;
  doubleBogeySG: number;
  bogeyApproach: number;
  bogeyApproachSG: number;
  missedGreen: number;
  missedGreenSG: number;
  totalFails: number;
  failsPerRound: number;
  sgOnFailHoles: number;
}

// Score tracking for a single hole
export interface HoleScore {
  roundId: string;
  hole: number;
  par: number;
  score: number;
  shots: ProcessedShot[];
}

// Tiger 5 summary metrics
export interface Tiger5Metrics {
  totalStrokesGained: number;
  avgStrokesGained: number;
  totalRounds: number;
  totalShots: number;
  scoringAvg: number;
  fairwayPct: number;
  girPct: number;
  byCategory: ShotCategory[];
  // Tiger 5 fails
  tiger5Fails: Tiger5Fail;
  // Root cause analysis
  rootCause: RootCauseMetrics;
  // Tiger 5 fail details
  failDetails: Tiger5FailDetails;
  // Root cause by fail type
  rootCauseByFailType: RootCauseByFailTypeList;
  // Tiger 5 trend data
  tiger5Trend: Tiger5TrendDataPoint[];
  lowestRound: number;
  highestRound: number;
  avgScore: number;
}

// Root cause for Tiger 5 fails
export interface RootCauseMetrics {
  // Total Tiger 5 fail holes
  totalFailHoles: number;
  // Penalty-related root causes
  penalties: number;
  penaltiesSG: number;
  failHolesWithPenalty: number;
  // Putt-related root causes
  makeablePutts: number;  // 0-12 feet
  makeablePuttsSG: number;
  lagPutts: number;       // 13+ feet
  lagPuttsSG: number;
  // Shot type root causes
  driving: number;        // Drive
  drivingSG: number;
  approach: number;       // Approach
  approachSG: number;
  shortGame: number;      // Short Game
  shortGameSG: number;
  recovery: number;       // Recovery
  recoverySG: number;
}

// Tiger 5 fail detail entry
export interface Tiger5FailDetail {
  date: string;
  course: string;
  hole: number;
  par: number;
  score: number;
  failType: string;
  shots: ProcessedShot[];
}

// Tiger 5 fail details grouped by fail type
export interface Tiger5FailDetails {
  threePutts: Tiger5FailDetail[];
  bogeyOnPar5: Tiger5FailDetail[];
  doubleBogey: Tiger5FailDetail[];
  bogeyApproach: Tiger5FailDetail[];
  missedGreen: Tiger5FailDetail[];
}

// Root cause breakdown by starting lie (for short game misses)
export interface RootCauseByLie {
  lie: string;
  count: number;
  percentageOfFailType: number;
  percentageOfTotal: number;
  sgTotal: number;
}

// Root cause for a specific fail type
export interface RootCauseByFailType {
  failType: string;
  totalCount: number;
  // Standard root causes
  makeablePutts: number;
  makeablePuttsSG: number;
  lagPutts: number;
  lagPuttsSG: number;
  driving: number;
  drivingSG: number;
  approach: number;
  approachSG: number;
  shortGame: number;
  shortGameSG: number;
  recovery: number;
  recoverySG: number;
  penalties: number;
  penaltiesSG: number;
  // For short game misses - breakdown by starting lie
  byStartingLie?: RootCauseByLie[];
}

// Root cause by fail type for all fail types
export interface RootCauseByFailTypeList {
  threePutts: RootCauseByFailType;
  bogeyOnPar5: RootCauseByFailType;
  doubleBogey: RootCauseByFailType;
  bogeyApproach: RootCauseByFailType;
  missedGreen: RootCauseByFailType;
}

// Tiger 5 trend chart data point
export interface Tiger5TrendDataPoint {
  roundId: string;
  date: string;
  course: string;
  threePutts: number;
  bogeyOnPar5: number;
  doubleBogey: number;
  bogeyApproach: number;
  missedGreen: number;
  totalScore: number;
}

// Tab configuration
export interface Tab {
  id: string;
  label: string;
  path: string;
}

export const TABS: Tab[] = [
  { id: 'tiger5', label: 'Tiger 5', path: '/' },
  { id: 'scoring', label: 'Scoring', path: '/scoring' },
  { id: 'sg', label: 'Strokes Gained', path: '/strokes-gained' },
  { id: 'driving', label: 'Driving', path: '/driving' },
  { id: 'approach', label: 'Approach', path: '/approach' },
  { id: 'shortgame', label: 'Short Game', path: '/short-game' },
  { id: 'putting', label: 'Putting', path: '/putting' },
  { id: 'path', label: 'Player Path', path: '/player-path' },
  { id: 'coaching', label: 'Coaching', path: '/coaching' },
];

// Filter types
export interface FilterState {
  players: string[];
  courses: string[];
  tournaments: string[];
  dates: string[];
}

export interface FilterOptions {
  players: string[];
  courses: string[];
  tournaments: string[];
  dates: string[];
}
