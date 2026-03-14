/**
 * Golf Intelligence — Benchmark Data
 * 
 * Strokes Gained benchmark lookup tables
 * Formula: SG = Benchmark Expected from Start - (1 + Benchmark Expected from End)
 * 
 * Three benchmarks:
 * - pgaTour: PGA Tour averages
 * - eliteCollege: Elite College (+3 handicap)
 * - competitiveAm: Competitive Amateur (Scratch)
 * 
 * PGA Tour data based on the provided table (Distance 0-600)
 */

// Location types matching the data
export type BenchmarkLocation = 'Tee' | 'Fairway' | 'Rough' | 'Sand' | 'Green' | 'Recovery';

// Benchmark type
export type BenchmarkType = 'pgaTour' | 'eliteCollege' | 'competitiveAm';

// Expected strokes lookup based on distance (yards) and location
// These values are derived from the PGA Tour benchmark table the user provided
function getPGAExpectedStrokes(distance: number, location: string): number {
  const d = Math.round(distance);
  
  // Clamp distance to valid range
  const dist = Math.max(0, Math.min(600, d));
  
  // PGA Tour expected strokes by location and distance
  // Based on the user's benchmark data table
  // Format: [distance threshold, tee, fairway, rough, sand, green, recovery]
  
  const pgaData: number[][] = [
    [0, 0, 0, 0, 0, 0, 0],
    [1, 1.10, 1.10, 1.34, 2.32, 1.01, 1.86],
    [5, 1.85, 1.85, 1.79, 2.36, 1.22, 2.47],
    [10, 2.13, 2.13, 2.23, 2.42, 1.61, 3.07],
    [15, 2.26, 2.26, 2.40, 2.48, 1.78, 3.28],
    [20, 2.40, 2.40, 2.56, 2.53, 1.87, 3.49],
    [25, 2.45, 2.45, 2.62, 2.60, 1.92, 3.55],
    [30, 2.50, 2.50, 2.68, 2.68, 1.98, 3.61],
    [40, 2.60, 2.60, 2.78, 2.82, 2.05, 3.71],
    [50, 2.65, 2.65, 2.82, 2.99, 2.12, 3.76],
    [60, 2.70, 2.70, 2.91, 3.15, 2.19, 3.81],
    [70, 2.73, 2.73, 2.94, 3.20, 2.27, 3.81],
    [80, 2.75, 2.75, 2.96, 3.24, 2.34, 3.80],
    [90, 2.78, 2.78, 2.99, 3.24, 2.41, 3.80],
    [100, 2.92, 2.80, 3.02, 3.23, 2.49, 3.80],
    [110, 2.96, 2.83, 3.05, 3.22, 2.56, 3.79],
    [120, 2.99, 2.85, 3.08, 3.21, 2.63, 3.78],
    [130, 2.98, 2.88, 3.12, 3.22, 2.68, 3.79],
    [140, 2.97, 2.91, 3.15, 3.22, 2.73, 3.80],
    [150, 2.98, 2.95, 3.19, 3.25, 2.78, 3.81],
    [160, 2.99, 2.98, 3.23, 3.28, 2.83, 3.81],
    [170, 3.02, 3.03, 3.27, 3.34, 2.88, 3.82],
    [180, 3.05, 3.08, 3.31, 3.40, 2.93, 3.82],
    [190, 3.09, 3.14, 3.37, 3.48, 2.98, 3.85],
    [200, 3.12, 3.19, 3.42, 3.55, 3.03, 3.87],
    [210, 3.15, 3.26, 3.48, 3.63, 3.08, 3.90],
    [220, 3.17, 3.32, 3.53, 3.70, 3.13, 3.92],
    [230, 3.21, 3.39, 3.59, 3.77, 3.18, 3.95],
    [240, 3.25, 3.45, 3.64, 3.84, 3.23, 3.97],
    [250, 3.35, 3.52, 3.69, 3.89, 3.28, 4.00],
    [260, 3.45, 3.58, 3.74, 3.93, 3.33, 4.03],
    [270, 3.55, 3.64, 3.79, 3.97, 3.38, 4.07],
    [280, 3.65, 3.69, 3.83, 4.00, 3.43, 4.10],
    [290, 3.68, 3.74, 3.87, 4.02, 3.48, 4.15],
    [300, 3.71, 3.78, 3.90, 4.04, 3.53, 4.20],
    [320, 3.80, 3.84, 3.96, 4.13, 3.64, 4.32],
    [340, 3.86, 3.88, 4.02, 4.27, 3.73, 4.45],
    [360, 3.92, 3.95, 4.11, 4.41, 3.83, 4.56],
    [380, 3.96, 4.03, 4.21, 4.55, 3.93, 4.66],
    [400, 3.99, 4.11, 4.30, 4.69, 4.03, 4.75],
    [420, 4.02, 4.15, 4.34, 4.73, 4.13, 4.79],
    [440, 4.08, 4.20, 4.39, 4.78, 4.23, 4.84],
    [460, 4.17, 4.29, 4.48, 4.87, 4.33, 4.93],
    [480, 4.28, 4.40, 4.59, 4.98, 4.43, 5.04],
    [500, 4.41, 4.53, 4.72, 5.11, 4.53, 5.17],
    [520, 4.54, 4.66, 4.85, 5.24, 4.63, 5.30],
    [540, 4.65, 4.78, 4.97, 5.36, 4.73, 5.42],
    [560, 4.74, 4.86, 5.05, 5.44, 4.83, 5.50],
    [580, 4.79, 4.91, 5.10, 5.49, 4.93, 5.55],
    [600, 4.82, 4.94, 5.13, 5.52, 4.98, 5.58],
  ];

  // Map location string to column index
  const locIndex: Record<string, number> = {
    'Tee': 1,
    'Fairway': 2,
    'Rough': 3,
    'Sand': 4,
    'Green': 5,
    'Recovery': 6,
    'Putt': 5, // Putt maps to Green
  };
  
  const col = locIndex[location] ?? 2; // Default to Fairway
  
  // Find the appropriate row by interpolating
  let lower = pgaData[0];
  let upper = pgaData[pgaData.length - 1];
  
  for (let i = 0; i < pgaData.length - 1; i++) {
    if (dist >= pgaData[i][0] && dist <= pgaData[i + 1][0]) {
      lower = pgaData[i];
      upper = pgaData[i + 1];
      break;
    }
  }
  
  // Linear interpolation
  if (dist <= lower[0]) return lower[col];
  if (dist >= upper[0]) return upper[col];
  
  const ratio = (dist - lower[0]) / (upper[0] - lower[0]);
  return lower[col] + ratio * (upper[col] - lower[col]);
}

// Distance-varying adjustment for Green/putting location.
// A flat adjustment cancels in the SG formula (SG = expectedStart - 1 - expectedEnd)
// because both start and end are on the Green. By making the adjustment
// distance-dependent, adj_start ≠ adj_end for most putts, preserving the
// benchmark signal in SG Putting.
// scale: 1.0 = elite college, 2.0 = competitive am
function getGreenPuttAdjustment(distance: number, scale: number): number {
  if (distance <= 0) return 0;           // made putt (in hole) — no adjustment
  if (distance <= 2) return 0.03 * scale;
  if (distance <= 4) return 0.08 * scale;
  if (distance <= 6) return 0.12 * scale;
  if (distance <= 10) return 0.15 * scale;
  if (distance <= 15) return 0.17 * scale;
  if (distance <= 20) return 0.18 * scale;
  if (distance <= 30) return 0.20 * scale;
  return 0.22 * scale;
}

// Get expected strokes for Elite College benchmark (+3)
function getEliteCollegeExpectedStrokes(distance: number, location: string): number {
  const pgaValue = getPGAExpectedStrokes(distance, location);
  const adjustment = location === 'Green'
    ? getGreenPuttAdjustment(distance, 1.0)
    : 0.25;
  return pgaValue + adjustment;
}

// Get expected strokes for Competitive Am (Scratch)
function getCompetitiveAmExpectedStrokes(distance: number, location: string): number {
  const pgaValue = getPGAExpectedStrokes(distance, location);
  const adjustment = location === 'Green'
    ? getGreenPuttAdjustment(distance, 2.0)
    : 0.50;
  return pgaValue + adjustment;
}

/**
 * Look up expected strokes from a benchmark table
 */
export function lookupExpectedStrokes(
  benchmark: BenchmarkType,
  distance: number,
  location: string
): number {
  switch (benchmark) {
    case 'pgaTour':
      return getPGAExpectedStrokes(distance, location);
    case 'eliteCollege':
      return getEliteCollegeExpectedStrokes(distance, location);
    case 'competitiveAm':
      return getCompetitiveAmExpectedStrokes(distance, location);
    default:
      return getPGAExpectedStrokes(distance, location);
  }
}

/**
 * Calculate Strokes Gained for a single shot
 * SG = Expected from Start - (1 + Expected from End)
 * For penalty shots: SG = Expected from Start - (2 + Expected from End)
 * The extra "-1" accounts for the penalty stroke
 */
export function calculateStrokesGained(
  benchmark: BenchmarkType,
  startDistance: number,
  startLocation: string,
  endDistance: number,
  endLocation: string,
  isPenalty: boolean = false
): number {
  const expectedStart = lookupExpectedStrokes(benchmark, startDistance, startLocation);
  const expectedEnd = lookupExpectedStrokes(benchmark, endDistance, endLocation);
  
  // For penalty shots, subtract an extra stroke (penalty stroke)
  const penaltyAdjustment = isPenalty ? 1 : 0;
  
  // SG = Expected from start position - (1 + expected from end position + penalty adjustment)
  // The "1" represents the stroke just taken, penaltyAdjustment accounts for penalty strokes
  return expectedStart - (1 + expectedEnd + penaltyAdjustment);
}

/**
 * Benchmark display names
 */
export const BENCHMARK_LABELS: Record<BenchmarkType, string> = {
  pgaTour: 'PGA Tour',
  eliteCollege: 'Elite College (+3)',
  competitiveAm: 'Competitive Am (Scratch)',
};

/**
 * Get all benchmark options for dropdown
 */
export function getBenchmarkOptions(): { value: BenchmarkType; label: string }[] {
  return [
    { value: 'pgaTour', label: BENCHMARK_LABELS.pgaTour },
    { value: 'eliteCollege', label: BENCHMARK_LABELS.eliteCollege },
    { value: 'competitiveAm', label: BENCHMARK_LABELS.competitiveAm },
  ];
}
