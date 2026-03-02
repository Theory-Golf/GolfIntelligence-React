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

// Shot category type for trend chart (consistent with existing shot types)
export type SGShotCategory = 'Driving' | 'Approach' | 'Short Game' | 'Putting';

// Round-level SG data for trend chart
export interface SGRoundData {
  roundId: string;
  roundNumber: number;
  date: string;
  course: string;
  strokesGained: number;
  shotCount: number;
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

// Driving metrics for the Driving Tab
export interface DrivingMetrics {
  totalDrives: number;
  fairwaysHit: number;
  fairwayPct: number;
  drivingSG: number;
  avgDrivingSG: number;
  drivingDistance75th: number;  // 75th percentile of |Starting Distance - Ending Distance| for all drives
  totalPenalties: number;
  obPenalties: number;
  otherPenalties: number;
  penaltyRate: number;  // (OB × 2 + Other × 1) / Total drives (as percentage)
  sgPenalties: number;  // Total SG for drives with a penalty shot
  // Fairway % by driver type
  fairwayPctDriver: number;  // % FW when Did not hit driver = No
  fairwayPctNonDriver: number;  // % FW when Did not hit driver = Yes
  // % of drives with SG > 0
  positiveSGPct: number;
}

// Strokes Gained Separator by distance category
export interface SGSeparator {
  label: string;
  description: string;
  totalShots: number;
  strokesGained: number;
  avgStrokesGained: number;
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
  // SG Separators by distance
  sgSeparators: SGSeparator[];
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
  { id: 'mental', label: 'Mental', path: '/mental' },
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

// Drive Ending Location types for Driving Analysis
export type DriveEndingLocationType = 'Fairway' | 'Rough' | 'Recovery' | 'Sand' | 'Green' | 'Tee' | 'Out of Bounds' | 'Water' | 'Penalty Area' | 'Other';

export interface DriveEndingLocationData {
  location: DriveEndingLocationType;
  count: number;
  percentage: number;
  strokesGained: number;
  avgStrokesGained: number;
}

// Drive distance range for analysis
export interface DriveDistanceRange {
  label: string;
  minDistance: number;
  maxDistance: number;
  count: number;
  percentage: number;
  strokesGained: number;
  avgStrokesGained: number;
  scoreDifferential: number;
}

// Complete driving analysis data
export interface DrivingAnalysis {
  endingLocations: DriveEndingLocationData[];
  distanceRanges: DriveDistanceRange[];
}

// Problem Drive Metrics - for the Problem Drive Section
export interface ProblemDriveMetrics {
  // Total drives
  totalDrives: number;
  
  // Penalties breakdown
  totalPenalties: number;
  obPenalties: number;
  standardPenalties: number;
  penaltyPct: number;
  penaltySG: number;
  obPenaltyPct: number;
  obPenaltySG: number;
  standardPenaltyPct: number;
  standardPenaltySG: number;
  
  // Obstruction breakdown (sand + recovery)
  obstructionCount: number;
  obstructionPct: number;
  obstructionSG: number;
  
  // Sand breakdown
  sandCount: number;
  sandPct: number;
  sandSG: number;
  
  // Recovery breakdown
  recoveryCount: number;
  recoveryPct: number;
  recoverySG: number;
}

// Approach distance bucket metrics for Approach by Distance section
export interface ApproachDistanceBucket {
  label: string;
  description: string;
  minDistance: number;
  maxDistance: number;
  totalShots: number;
  strokesGained: number;
  avgStrokesGained: number;
  greenHits: number;
  greenHitPct: number;
  proximity: number;  // Always in feet (converted from yards for non-green shots)
  proximityOnGreen: number;
}

// Approach heat map cell data
export interface ApproachHeatMapCell {
  lie: string;                    // Tee, Fairway, Rough, Sand, Recovery
  distanceBucket: string;          // Distance bucket label
  minDistance: number;
  maxDistance: number;
  totalShots: number;
  strokesGained: number;
  sgPerRound: number;             // strokesGained / totalRounds
}

// Approach heat map data structure
export interface ApproachHeatMapData {
  cells: ApproachHeatMapCell[];
  distanceBuckets: string[];       // X-axis labels
  lies: string[];                 // Y-axis labels (Tee, Fairway, Rough, Sand, Recovery)
  totalRounds: number;             // For SG per Round calculation
}

// Approach metrics for the Approach Tab
export interface ApproachMetrics {
  // Total approach shots
  totalApproaches: number;
  // Strokes Gained - Approach
  approachSG: number;
  avgApproachSG: number;
  // % of approaches with SG > 0
  positiveSGPct: number;
  positiveSGCount: number;
  // Green Hit % - % of approaches ending on Green
  greenHitPct: number;
  greenHits: number;
  // Green Hit % by starting lie (Fairway, Rough)
  greenHitPctFairway: number;
  greenHitsFairway: number;
  totalApproachesFairway: number;
  greenHitPctRough: number;
  greenHitsRough: number;
  totalApproachesRough: number;
  // Proximity < 150 - average proximity for approaches <= 150 yards
  proximityUnder150: number;
  proximityUnder150Count: number;
  // Proximity < 150 on Green - average proximity for approaches <= 150 yards that ended on green
  proximityUnder150OnGreen: number;
  proximityUnder150OnGreenCount: number;
  // % of approaches ending on green within 20 feet
  within20FeetPct: number;
  within20FeetCount: number;
  // Additional breakdown by distance
  approachesOver150: number;
  approachesUnder150: number;
  greenHitPctOver150: number;
  greenHitPctUnder150: number;
}

// Short Game metrics for the Short Game Tab
export interface ShortGameMetrics {
  // Total short game shots
  totalShortGameShots: number;
  // Strokes Gained - Short Game
  shortGameSG: number;
  avgShortGameSG: number;
  // % of short game shots with SG > 0
  positiveSGPct: number;
  positiveSGCount: number;
  // <= 8ft from Fairway - percentage of short game shots from Fairway that end on green within 8 feet
  within8FeetFairwayPct: number;
  within8FeetFairwayCount: number;
  totalShortGameFairway: number;
  // <= 8ft from Rough - percentage of short game shots from Rough that end on green within 8 feet
  within8FeetRoughPct: number;
  within8FeetRoughCount: number;
  totalShortGameRough: number;
  // <= 8ft from Sand - percentage of short game shots from Sand that end on green within 8 feet
  within8FeetSandPct: number;
  within8FeetSandCount: number;
  totalShortGameSand: number;
}

// Heat map cell for Short Game by Lie and Distance
export interface ShortGameHeatMapCell {
  lie: string;                    // Fairway, Rough, Sand, Recovery
  distanceBucket: string;         // Around the Green, Short Shots, Finesse Wedges
  minDistance: number;
  maxDistance: number;
  totalShots: number;
  strokesGained: number;
  sgPerRound: number;             // strokesGained / totalRounds
}

// Heat map data for Short Game tab
export interface ShortGameHeatMapData {
  cells: ShortGameHeatMapCell[];
  distanceBuckets: string[];     // X-axis labels
  lies: string[];                // Y-axis labels (Fairway, Rough, Sand, Recovery)
  totalRounds: number;           // For SG per Round calculation
}

// Putting by distance bucket metrics
export interface PuttingDistanceBucket {
  label: string;           // e.g., "0-4", "5-8"
  minDistance: number;     // inclusive
  maxDistance: number;     // inclusive
  // Core metrics
  totalPutts: number;
  totalStrokesGained: number;
  // Make %
  madePutts: number;
  makePct: number;
  // 3 putts (assigned to first putt's distance bucket)
  threePutts: number;
  // Speed Ratio (% long)
  longPutts: number;
  speedRatio: number;
  // Only for 13-60 ft buckets
  proximityMissed: number;     // avg ending distance for missed putts
  goodLagPct: number;          // % <= 3 feet
  poorLagPct: number;          // % >= 5 feet
}

// Putting metrics for the Putting Tab
export interface PuttingMetrics {
  // Total SG for all putts
  totalSGPutting: number;
  avgSGPutting: number;
  totalPutts: number;
  // Make % 0-4 feet
  makePct0to4Ft: number;
  made0to4Ft: number;
  total0to4Ft: number;
  // Total SG 5-12 feet
  totalSG5to12Ft: number;
  avgSG5to12Ft: number;
  total5to12Ft: number;
  // Poor Lag: # of first putts >20ft with end distance >=5ft
  poorLagCount: number;
  totalLagPutts: number;  // Total first putts >20ft for context
  // Speed Rating: % of first putts >=20ft with Putt Result = Long
  speedRating: number;
  longPutts: number;
  totalLongPutts: number;  // Total first putts >=20ft
  // Putting by distance
  puttingByDistance: PuttingDistanceBucket[];
}

// Lag putting distance distribution for charts
export interface LagDistanceDistribution {
  label: string;
  count: number;
  percentage: number;
}

// Lag putting metrics for the Lag Putting section
export interface LagPuttingMetrics {
  // Avg. Leave Distance - average ending distance for first putts >20 ft
  avgLeaveDistance: number;
  totalLagPutts: number;
  // 3 putts distribution by first putt starting distance
  threePuttsByStartDistance: LagDistanceDistribution[];
  // Leave distance distribution for lag putts (>20 ft starting)
  leaveDistanceDistribution: LagDistanceDistribution[];
}

// Hole outcome types for Scoring tab
export type HoleOutcome = 'Eagle' | 'Birdie' | 'Par' | 'Bogey' | 'Double Bogey+';

// Scoring metrics for a single par type (Par 3, 4, or 5)
export interface ParScoringMetrics {
  par: number;
  totalHoles: number;
  totalScore: number;
  avgScore: number;
  avgScoreVsPar: number;
  totalStrokesGained: number;
}

// Scoring breakdown by hole outcome
export interface HoleOutcomeData {
  outcome: HoleOutcome;
  count: number;
  percentage: number;
  scoreToPar: number;
}

// Complete Scoring tab metrics
export interface ScoringMetrics {
  // Overall hole outcome distribution (all holes)
  holeOutcomes: HoleOutcomeData[];
  totalHoles: number;
  
  // Par 3 metrics
  par3: ParScoringMetrics;
  // Par 4 metrics
  par4: ParScoringMetrics;
  // Par 5 metrics
  par5: ParScoringMetrics;
}

// Bogey Rate by Par type
export interface BogeyRateByPar {
  par: number;  // 0 for overall, 3, 4, 5 for specific par
  label: string;
  totalHoles: number;
  bogeyCount: number;
  bogeyRate: number;
}

// Birdie Opportunity metrics
export interface BirdieOpportunityMetrics {
  opportunities: number;        // GIR with putt <= 20 feet
  conversions: number;         // Birdies made from opportunities
  conversionPct: number;        // conversions / opportunities * 100
}

// Root Cause for Scoring (Bogey/Double Bogey+)
export interface ScoringRootCause {
  penalties: number;
  penaltiesSG: number;
  driving: number;
  drivingSG: number;
  approach: number;
  approachSG: number;
  lagPutts: number;        // 20+ feet
  lagPuttsSG: number;
  makeablePutts: number;   // 0-20 feet
  makeablePuttsSG: number;
  shortGame: number;
  shortGameSG: number;
  recovery: number;
  recoverySG: number;
}

// Complete Birdie and Bogey metrics
export interface BirdieAndBogeyMetrics {
  bogeyRates: BogeyRateByPar[];
  birdieOpportunities: BirdieOpportunityMetrics;
  bogeyRootCause: ScoringRootCause;
  doubleBogeyPlusRootCause: ScoringRootCause;
  totalBogeys: number;
  totalDoubleBogeyPlus: number;
}

// Mental resilience metrics for the Mental Tab
export interface MentalMetrics {
  // Bounce Back: Par or better after Bogey+
  bounceBackCount: number;
  bounceBackTotal: number;  // Total Bogey+ holes (opportunities)
  bounceBackPct: number;
  
  // Drop Off: Bogey+ after Birdie
  dropOffCount: number;
  dropOffTotal: number;  // Total Birdie holes (opportunities)
  dropOffPct: number;
  
  // Gas Pedal: Birdie+ after Birdie+
  gasPedalCount: number;
  gasPedalTotal: number;  // Total Birdie+ holes (opportunities)
  gasPedalPct: number;
  
  // Bogey Train: Bogey+ after Bogey+
  bogeyTrainCount: number;
  bogeyTrainTotal: number;  // Total Bogey+ holes (opportunities)
  bogeyTrainPct: number;
  
  // Drive after Tiger 5 Fail
  driveAfterT5FailCount: number;  // Number of drives after T5 fail
  driveAfterT5FailSG: number;  // Total SG on those drives
  avgDriveSGBenchmark: number;  // Benchmark average SG per drive
  driveAfterT5FailVsBenchmark: number;  // Difference from benchmark
}
