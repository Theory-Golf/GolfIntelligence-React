/**
 * Golf Intelligence — PlayerPath Calculations
 * Comprehensive performance driver calculations for the PlayerPath tab
 */

import type {
  ProcessedShot,
  PlayerPathMetrics,
  DrivingDriverD1,
  DrivingDriverD2,
  DrivingDriverD3,
  DrivingDriverD4,
  DrivingDriverD5,
  ApproachDriverA1,
  ApproachDriverA2,
  ApproachDriverA3,
  ApproachDriverA4,
  ApproachDistanceBand,
  LagPuttingDriver,
  PuttingDriverM1,
  PuttingDriverM2,
  MakeablePuttBucket,
  ShortGameDriverS1,
  ShortGameDriverS2,
  ShortGameDriverS3,
  ShortGameLieMetric,
  ShortGameDistanceMetric,
  DriverSeverity,
} from '../types/golf';

/**
 * Get severity based on value and thresholds
 */
function getSeverity(
  value: number,
  moderateThreshold: number,
  significantThreshold: number,
  criticalThreshold: number,
  inverted: boolean = false
): DriverSeverity {
  if (inverted) {
    if (value < criticalThreshold) return 'Critical';
    if (value < significantThreshold) return 'Significant';
    if (value < moderateThreshold) return 'Moderate';
    return 'Strong';
  }
  
  if (value > criticalThreshold) return 'Critical';
  if (value > significantThreshold) return 'Significant';
  if (value > moderateThreshold) return 'Moderate';
  return 'Strong';
}

/**
 * Calculate yards to feet conversion for proximity
 */
function yardsToFeet(yards: number): number {
  return yards * 3;
}

// ============================================
// DRIVING DRIVERS (D1-D5)
// ============================================

/**
 * D1 — Tee Shot Penalty Rate
 * Flag when tee shot penalties exceed 5% (moderate) or 10% (severe)
 */
export function calculateDrivingDriverD1(shots: ProcessedShot[]): DrivingDriverD1 | null {
  const teeShots = shots.filter(s => s['Starting Lie'] === 'Tee');
  
  if (teeShots.length === 0) return null;
  
  const penaltyCount = teeShots.filter(s => s.Penalty === 'Yes').length;
  const penaltyRate = (penaltyCount / teeShots.length) * 100;
  const sgImpact = teeShots
    .filter(s => s.Penalty === 'Yes')
    .reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  const severity = getSeverity(penaltyRate, 5, 10, 20);
  
  return {
    code: 'D1',
    name: 'Tee Shot Penalty Rate',
    description: 'Percentage of tee shots resulting in penalties',
    value: penaltyRate,
    totalTeeShots: teeShots.length,
    penaltyCount,
    severity,
    sgImpact,
  };
}

/**
 * D2 — Distance Deficiency
 * Flag when >50% of fairway tee shots produce negative SG
 */
export function calculateDrivingDriverD2(shots: ProcessedShot[]): DrivingDriverD2 | null {
  const teeShots = shots.filter(s => s['Starting Lie'] === 'Tee' && s['Ending Lie'] === 'Fairway');
  
  if (teeShots.length === 0) return null;
  
  const negativeSGCount = teeShots.filter(s => s.calculatedStrokesGained < 0).length;
  const negativeRate = (negativeSGCount / teeShots.length) * 100;
  const sgImpact = teeShots
    .filter(s => s.calculatedStrokesGained < 0)
    .reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  const severity = getSeverity(negativeRate, 30, 50, 70);
  
  return {
    code: 'D2',
    name: 'Distance Deficiency',
    description: 'Percentage of fairway tee shots with negative SG',
    value: negativeRate,
    fairwayTeeShots: teeShots.length,
    negativeSGBucket: negativeSGCount,
    severity,
    sgImpact,
  };
}

/**
 * D3 — Severe Misses (Recovery)
 * Flag when tee shots ending in 'Recovery' exceed 5% of total tee shots
 */
export function calculateDrivingDriverD3(shots: ProcessedShot[]): DrivingDriverD3 | null {
  const teeShots = shots.filter(s => s['Starting Lie'] === 'Tee');
  
  if (teeShots.length === 0) return null;
  
  const recoveryCount = teeShots.filter(s => s['Ending Lie'] === 'Recovery').length;
  const recoveryRate = (recoveryCount / teeShots.length) * 100;
  const sgImpact = teeShots
    .filter(s => s['Ending Lie'] === 'Recovery')
    .reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  const severity = getSeverity(recoveryRate, 5, 10, 20);
  
  return {
    code: 'D3',
    name: 'Severe Misses',
    description: 'Tee shots ending in recovery (severe directional error)',
    value: recoveryRate,
    totalTeeShots: teeShots.length,
    recoveryCount,
    severity,
    sgImpact,
  };
}

/**
 * D4 — Rough Penalty on Long Second Shots
 * Flag when FW hit rate <50% AND avg second shot distance from rough >150y
 */
export function calculateDrivingDriverD4(shots: ProcessedShot[]): DrivingDriverD4 | null {
  const drives = shots.filter(s => s.shotType === 'Drive' && s.holePar >= 4);
  
  if (drives.length === 0) return null;
  
  const totalDrives = drives.length;
  const fairwayDrives = drives.filter(d => d['Ending Lie'] === 'Fairway');
  const fwHitRate = (fairwayDrives.length / totalDrives) * 100;
  
  // Group shots by round and hole to find second shots from rough
  const holeShotsMap = new Map<string, ProcessedShot[]>();
  shots.forEach(shot => {
    const key = `${shot['Round ID']}-${shot.Hole}`;
    if (!holeShotsMap.has(key)) {
      holeShotsMap.set(key, []);
    }
    holeShotsMap.get(key)!.push(shot);
  });
  
  const secondShotsFromRough: ProcessedShot[] = [];
  
  holeShotsMap.forEach((holeShots) => {
    const driveShot = holeShots.find(s => s.shotType === 'Drive');
    if (driveShot && driveShot['Ending Lie'] === 'Rough') {
      const secondShot = holeShots.find(s => s.Shot === 2 && s.shotType === 'Approach');
      if (secondShot) {
        secondShotsFromRough.push(secondShot);
      }
    }
  });
  
  if (secondShotsFromRough.length === 0) return null;
  
  const avgSecondShotDistance = secondShotsFromRough.reduce((sum, s) => sum + s['Starting Distance'], 0) / secondShotsFromRough.length;
  const sgImpact = secondShotsFromRough.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  let severity: DriverSeverity = 'Strong';
  if (fwHitRate < 50 && avgSecondShotDistance > 150) {
    if (avgSecondShotDistance > 175) {
      severity = 'Critical';
    } else if (avgSecondShotDistance > 150) {
      severity = 'Significant';
    }
  } else if (fwHitRate < 50 || avgSecondShotDistance > 150) {
    severity = 'Moderate';
  }
  
  return {
    code: 'D4',
    name: 'Rough Penalty on Long Second Shots',
    description: 'Low FW% + long 2nd shots from rough',
    fwHitRate,
    avgSecondShotDistance,
    severity,
    sgImpact,
  };
}

/**
 * D5 — Driver Value Gap
 * Compare SG on tee shots when hitting driver vs non-driver
 */
export function calculateDrivingDriverD5(shots: ProcessedShot[]): DrivingDriverD5 | null {
  const teeShots = shots.filter(s => s['Starting Lie'] === 'Tee');
  
  if (teeShots.length === 0) return null;
  
  const driverShots = teeShots.filter(s => s['Did not Hit Driver'] !== 'Yes');
  const nonDriverShots = teeShots.filter(s => s['Did not Hit Driver'] === 'Yes');
  
  if (driverShots.length === 0 || nonDriverShots.length === 0) return null;
  
  const driverSG = driverShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0) / driverShots.length;
  const nonDriverSG = nonDriverShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0) / nonDriverShots.length;
  const gap = driverSG - nonDriverSG;
  
  const severity = gap < -0.2 ? 'Critical' : gap < -0.1 ? 'Significant' : gap < 0 ? 'Moderate' : 'Strong';
  const sgImpact = gap * ((driverShots.length + nonDriverShots.length) / 2);
  
  return {
    code: 'D5',
    name: 'Driver Value Gap',
    description: 'SG comparison: driver vs non-driver tee shots',
    driverSG,
    nonDriverSG,
    value: gap,
    severity,
    sgImpact,
  };
}

// ============================================
// APPROACH DRIVERS (A1-A4)
// ============================================

/**
 * Calculate approach distance bands with GIR, proximity, and SG metrics
 */
function calculateApproachDistanceBands(shots: ProcessedShot[]): ApproachDistanceBand[] {
  const approaches = shots.filter(s => s.shotType === 'Approach');
  
  const bandDefinitions = [
    { label: '50-100y', minDistance: 50, maxDistance: 100, proximityTarget: 15 },
    { label: '100-150y', minDistance: 100, maxDistance: 150, proximityTarget: 20 },
    { label: '150-200y', minDistance: 150, maxDistance: 200, proximityTarget: 30 },
    { label: '200y+', minDistance: 200, maxDistance: 9999, proximityTarget: 40 },
  ];
  
  return bandDefinitions.map(band => {
    const bandShots = approaches.filter(s => 
      s['Starting Distance'] >= band.minDistance && 
      s['Starting Distance'] < band.maxDistance
    );
    
    const totalShots = bandShots.length;
    if (totalShots === 0) {
      return {
        label: band.label,
        minDistance: band.minDistance,
        maxDistance: band.maxDistance,
        totalShots: 0,
        greenHits: 0,
        girRate: 0,
        avgProximity: 0,
        proximityTarget: band.proximityTarget,
        proximityRate: 0,
        sgTotal: 0,
      };
    }
    
    const greenHits = bandShots.filter(s => s['Ending Lie'] === 'Green').length;
    const girRate = (greenHits / totalShots) * 100;
    
    const proximitySum = bandShots.reduce((sum, s) => {
      const distInFeet = s['Ending Lie'] === 'Green' 
        ? s['Ending Distance'] 
        : yardsToFeet(s['Ending Distance']);
      return sum + distInFeet;
    }, 0);
    const avgProximity = proximitySum / totalShots;
    
    const withinTarget = bandShots.filter(s => {
      const distInFeet = s['Ending Lie'] === 'Green' 
        ? s['Ending Distance'] 
        : yardsToFeet(s['Ending Distance']);
      return distInFeet <= band.proximityTarget;
    }).length;
    const proximityRate = (withinTarget / totalShots) * 100;
    
    const sgTotal = bandShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    
    return {
      label: band.label,
      minDistance: band.minDistance,
      maxDistance: band.maxDistance,
      totalShots,
      greenHits,
      girRate,
      avgProximity,
      proximityTarget: band.proximityTarget,
      proximityRate,
      sgTotal,
    };
  });
}

/**
 * A1 — GIR Rate by Distance Band
 */
export function calculateApproachDriverA1(shots: ProcessedShot[]): ApproachDriverA1 | null {
  const bands = calculateApproachDistanceBands(shots);
  const bandsWithData = bands.filter(b => b.totalShots > 0);
  
  if (bandsWithData.length === 0) return null;
  
  let worstBand: string | undefined;
  let lowestGIR = 100;
  
  const thresholdMap: Record<string, number> = {
    '50-100y': 90,
    '100-150y': 80,
    '150-200y': 70,
    '200y+': 50,
  };
  
  bandsWithData.forEach(band => {
    const threshold = thresholdMap[band.label] || 50;
    if (band.girRate < threshold && band.girRate < lowestGIR) {
      lowestGIR = band.girRate;
      worstBand = band.label;
    }
  });
  
  const failedBands = bandsWithData.filter(band => {
    const threshold = thresholdMap[band.label] || 50;
    return band.girRate < threshold;
  });
  
  const severity = failedBands.length >= 3 ? 'Critical' : 
                  failedBands.length === 2 ? 'Significant' : 
                  failedBands.length === 1 ? 'Moderate' : 'Strong';
  
  return {
    code: 'A1',
    name: 'GIR Rate by Distance Band',
    description: 'Green in Regulation rate by distance band',
    bands,
    severity,
    worstBand,
  };
}

/**
 * A2 — Proximity Failure in Scoring Zones
 */
export function calculateApproachDriverA2(shots: ProcessedShot[]): ApproachDriverA2 | null {
  const bands = calculateApproachDistanceBands(shots);
  const bandsWithData = bands.filter(b => b.totalShots > 0);
  
  if (bandsWithData.length === 0) return null;
  
  let worstBand: string | undefined;
  let lowestProximityRate = 100;
  
  const thresholdMap: Record<string, number> = {
    '50-100y': 40,
    '100-150y': 30,
    '150-200y': 20,
  };
  
  bandsWithData.forEach(band => {
    if (thresholdMap[band.label]) {
      if (band.proximityRate < thresholdMap[band.label] && band.proximityRate < lowestProximityRate) {
        lowestProximityRate = band.proximityRate;
        worstBand = band.label;
      }
    }
  });
  
  const failedBands = bandsWithData.filter(band => {
    const threshold = thresholdMap[band.label];
    return threshold && band.proximityRate < threshold;
  });
  
  const severity = failedBands.length >= 2 ? 'Critical' : 
                  failedBands.length === 1 ? 'Significant' : 'Strong';
  
  return {
    code: 'A2',
    name: 'Proximity Failure in Scoring Zones',
    description: 'Percentage of shots missing proximity target',
    bands,
    severity,
    worstBand,
  };
}

/**
 * A3 — Lie-Based Performance Gap
 */
export function calculateApproachDriverA3(shots: ProcessedShot[]): ApproachDriverA3 | null {
  const approaches = shots.filter(s => s.shotType === 'Approach');
  
  if (approaches.length === 0) return null;
  
  const bandDefinitions = [
    { label: '50-100y', minDistance: 50, maxDistance: 100, threshold: 0.10 },
    { label: '100-150y', minDistance: 100, maxDistance: 150, threshold: 0.15 },
    { label: '150-200y', minDistance: 150, maxDistance: 200, threshold: 0.20 },
    { label: '200y+', minDistance: 200, maxDistance: 9999, threshold: 0.25 },
  ];
  
  const gapAnalysis = bandDefinitions.map(band => {
    const fairwayShots = approaches.filter(s => 
      s['Starting Lie'] === 'Fairway' &&
      s['Starting Distance'] >= band.minDistance && 
      s['Starting Distance'] < band.maxDistance
    );
    
    const roughShots = approaches.filter(s => 
      s['Starting Lie'] === 'Rough' &&
      s['Starting Distance'] >= band.minDistance && 
      s['Starting Distance'] < band.maxDistance
    );
    
    if (fairwayShots.length === 0 || roughShots.length === 0) {
      return {
        label: band.label,
        fairwaySG: 0,
        roughSG: 0,
        gap: 0,
        threshold: band.threshold,
        flagged: false,
      };
    }
    
    const fairwaySG = fairwayShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0) / fairwayShots.length;
    const roughSG = roughShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0) / roughShots.length;
    const gap = fairwaySG - roughSG;
    
    return {
      label: band.label,
      fairwaySG,
      roughSG,
      gap,
      threshold: band.threshold,
      flagged: gap > band.threshold,
    };
  });
  
  const flaggedBands = gapAnalysis.filter(b => b.flagged);
  
  const severity = flaggedBands.length >= 3 ? 'Critical' :
                  flaggedBands.length === 2 ? 'Significant' :
                  flaggedBands.length === 1 ? 'Moderate' : 'Strong';
  
  return {
    code: 'A3',
    name: 'Lie-Based Performance Gap',
    description: 'SG difference: rough vs fairway by distance band',
    bands: gapAnalysis,
    severity,
  };
}

/**
 * A4 — Distance Band Black Hole
 */
export function calculateApproachDriverA4(shots: ProcessedShot[]): ApproachDriverA4 | null {
  const bands = calculateApproachDistanceBands(shots);
  const bandsWithData = bands.filter(b => b.totalShots > 0 && b.sgTotal < 0);
  
  if (bandsWithData.length === 0) return null;
  
  const totalNegativeSG = bandsWithData.reduce((sum, b) => sum + Math.min(0, b.sgTotal), 0);
  
  let worstBand = '';
  let worstBandSGLoss = 0;
  let percentageOfLosses = 0;
  
  bandsWithData.forEach(band => {
    const bandLoss = Math.min(0, band.sgTotal);
    const bandPercentage = totalNegativeSG !== 0 ? Math.abs(bandLoss / totalNegativeSG) * 100 : 0;
    
    if (bandPercentage > percentageOfLosses) {
      worstBand = band.label;
      worstBandSGLoss = bandLoss;
      percentageOfLosses = bandPercentage;
    }
  });
  
  const severity = percentageOfLosses > 50 ? 'Critical' :
                  percentageOfLosses > 40 ? 'Significant' :
                  percentageOfLosses > 25 ? 'Moderate' : 'Strong';
  
  return {
    code: 'A4',
    name: 'Distance Band Black Hole',
    description: 'Single distance band with >40% of approach SG losses',
    bands,
    worstBand,
    worstBandSGLoss,
    totalSGLoss: totalNegativeSG,
    percentageOfLosses,
    severity,
  };
}

// ============================================
// PUTTING DRIVERS (L1-L3, M1-M2)
// ============================================

/**
 * Calculate lag putting metrics
 */
export function calculateLagPuttingMetrics(shots: ProcessedShot[]): LagPuttingDriver | null {
  const putts = shots.filter(s => s.shotType === 'Putt');
  
  if (putts.length === 0) return null;
  
  // Use all putts from >10 feet as "lag putts"
  const lagPutts = putts.filter(s => s['Starting Distance'] > 10);
  
  if (lagPutts.length === 0) return null;
  
  // L1: Poor lag rate - % finishing >5 feet from hole
  const poorLagPutts = lagPutts.filter(s => s['Ending Distance'] > 5);
  const poorLagRate = (poorLagPutts.length / lagPutts.length) * 100;
  
  // L2: Speed dispersion band
  const longPutts = lagPutts.filter(s => s['Putt Result'] === 'Long');
  const shortPutts = lagPutts.filter(s => s['Putt Result'] === 'Short');
  
  const maxLong = longPutts.length > 0 
    ? Math.max(...longPutts.map(s => s['Ending Distance'])) 
    : 0;
  const maxShort = shortPutts.length > 0 
    ? Math.max(...shortPutts.map(s => s['Ending Distance'])) 
    : 0;
  const speedDispersionBand = maxLong + maxShort;
  
  // L3: Centering rate
  const longPct = (longPutts.length / lagPutts.length) * 100;
  const shortPct = (shortPutts.length / lagPutts.length) * 100;
  
  let centeringRate: string;
  if (longPct >= 45 && longPct <= 55) {
    centeringRate = 'Well centered';
  } else if (longPct >= 60 || shortPct >= 60) {
    centeringRate = longPct >= 75 || shortPct >= 75 ? 'Severe bias' : 'Significant bias';
  } else {
    centeringRate = 'Mild bias';
  }
  
  const sgImpact = lagPutts.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const severity = poorLagRate > 20 ? 'Critical' : poorLagRate > 10 ? 'Significant' : 'Strong';
  
  return {
    poorLagRate,
    totalLagPutts: lagPutts.length,
    speedDispersionBand,
    longPct,
    shortPct,
    centeringRate,
    severity,
    sgImpact,
  };
}

/**
 * M1 — SG by Distance Bucket (makeable putts)
 */
export function calculatePuttingDriverM1(shots: ProcessedShot[]): PuttingDriverM1 | null {
  const putts = shots.filter(s => s.shotType === 'Putt');
  
  if (putts.length === 0) return null;
  
  const bucketDefinitions = [
    { label: '0-4ft', minDistance: 0, maxDistance: 4, threshold: -0.10 },
    { label: '5-8ft', minDistance: 5, maxDistance: 8, threshold: -0.15 },
    { label: '9-12ft', minDistance: 9, maxDistance: 12, threshold: -0.12 },
    { label: '13-20ft', minDistance: 13, maxDistance: 20, threshold: -0.10 },
  ];
  
  const buckets: MakeablePuttBucket[] = bucketDefinitions.map(bucket => {
    const bucketPutts = putts.filter(s => 
      s['Starting Distance'] >= bucket.minDistance && 
      s['Starting Distance'] < bucket.maxDistance
    );
    
    const totalPutts = bucketPutts.length;
    if (totalPutts === 0) {
      return {
        label: bucket.label,
        minDistance: bucket.minDistance,
        maxDistance: bucket.maxDistance,
        totalPutts: 0,
        madePutts: 0,
        makePct: 0,
        sgTotal: 0,
        avgSG: 0,
      };
    }
    
    const madePutts = bucketPutts.filter(s => s['Ending Distance'] === 0).length;
    const makePct = (madePutts / totalPutts) * 100;
    const sgTotal = bucketPutts.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    const avgSG = sgTotal / totalPutts;
    
    return {
      label: bucket.label,
      minDistance: bucket.minDistance,
      maxDistance: bucket.maxDistance,
      totalPutts,
      madePutts,
      makePct,
      sgTotal,
      avgSG,
    };
  });
  
  const minSampleSize = 10;
  const flaggedBuckets = buckets.filter(b => 
    b.totalPutts >= minSampleSize && b.avgSG < (bucketDefinitions.find(bd => bd.label === b.label)?.threshold || 0)
  ).map(b => b.label);
  
  const severity = flaggedBuckets.length >= 3 ? 'Critical' :
                  flaggedBuckets.length === 2 ? 'Significant' :
                  flaggedBuckets.length === 1 ? 'Moderate' : 'Strong';
  
  return {
    code: 'M1',
    name: 'SG by Distance Bucket',
    description: 'SG performance by makeable putt distance bucket',
    buckets,
    minSampleSize,
    flaggedBuckets,
    severity,
  };
}

/**
 * M2 — Primary Loss Bucket
 */
export function calculatePuttingDriverM2(shots: ProcessedShot[]): PuttingDriverM2 | null {
  const putts = shots.filter(s => s.shotType === 'Putt');
  
  if (putts.length === 0) return null;
  
  const bucketDefinitions = [
    { label: '0-4ft', minDistance: 0, maxDistance: 4 },
    { label: '5-8ft', minDistance: 5, maxDistance: 8 },
    { label: '9-12ft', minDistance: 9, maxDistance: 12 },
    { label: '13-20ft', minDistance: 13, maxDistance: 20 },
  ];
  
  const buckets: MakeablePuttBucket[] = bucketDefinitions.map(bucket => {
    const bucketPutts = putts.filter(s => 
      s['Starting Distance'] >= bucket.minDistance && 
      s['Starting Distance'] < bucket.maxDistance
    );
    
    const totalPutts = bucketPutts.length;
    if (totalPutts === 0) {
      return {
        label: bucket.label,
        minDistance: bucket.minDistance,
        maxDistance: bucket.maxDistance,
        totalPutts: 0,
        madePutts: 0,
        makePct: 0,
        sgTotal: 0,
        avgSG: 0,
      };
    }
    
    const madePutts = bucketPutts.filter(s => s['Ending Distance'] === 0).length;
    const makePct = (madePutts / totalPutts) * 100;
    const sgTotal = bucketPutts.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    const avgSG = sgTotal / totalPutts;
    
    return {
      label: bucket.label,
      minDistance: bucket.minDistance,
      maxDistance: bucket.maxDistance,
      totalPutts,
      madePutts,
      makePct,
      sgTotal,
      avgSG,
    };
  });
  
  let primaryLossBucket = '';
  let primaryLossSG = 0;
  
  buckets.forEach(bucket => {
    if (bucket.sgTotal < primaryLossSG) {
      primaryLossSG = bucket.sgTotal;
      primaryLossBucket = bucket.label;
    }
  });
  
  const severity = primaryLossSG < -3 ? 'Critical' :
                  primaryLossSG < -2 ? 'Significant' :
                  primaryLossSG < -1 ? 'Moderate' : 'Strong';
  
  return {
    code: 'M2',
    name: 'Primary Loss Bucket',
    description: 'Distance bucket with largest negative total SG',
    buckets,
    primaryLossBucket,
    primaryLossSG,
    severity,
  };
}

// ============================================
// SHORT GAME DRIVERS (S1-S3)
// ============================================

/**
 * S1 — Proximity Rate Inside 8 Feet by Lie
 */
export function calculateShortGameDriverS1(shots: ProcessedShot[]): ShortGameDriverS1 | null {
  const shortGame = shots.filter(s => s.shotType === 'Short Game');
  
  if (shortGame.length === 0) return null;
  
  const lieTypes = ['Fairway', 'Rough', 'Sand'];
  
  const lieMetrics: ShortGameLieMetric[] = lieTypes.map(lie => {
    const lieShots = shortGame.filter(s => s['Starting Lie'] === lie);
    const totalShots = lieShots.length;
    
    if (totalShots === 0) {
      return { lie, totalShots: 0, inside8Feet: 0, proximityRate: 0 };
    }
    
    const inside8Feet = lieShots.filter(s => {
      const distInFeet = s['Ending Lie'] === 'Green' 
        ? s['Ending Distance'] 
        : yardsToFeet(s['Ending Distance']);
      return distInFeet <= 8;
    }).length;
    
    const proximityRate = (inside8Feet / totalShots) * 100;
    
    return { lie, totalShots, inside8Feet, proximityRate };
  });
  
  let worstLie: string | undefined;
  const thresholdMap: Record<string, number> = {
    'Fairway': 70,
    'Rough': 60,
    'Sand': 50,
  };
  
  lieMetrics.forEach(metric => {
    if (metric.totalShots > 0) {
      const threshold = thresholdMap[metric.lie] || 50;
      if (metric.proximityRate < threshold && (!worstLie || metric.proximityRate < lieMetrics.find(l => l.lie === worstLie)!.proximityRate)) {
        worstLie = metric.lie;
      }
    }
  });
  
  const failedLies = lieMetrics.filter(m => {
    if (m.totalShots === 0) return false;
    const threshold = thresholdMap[m.lie] || 50;
    return m.proximityRate < threshold;
  });
  
  const severity = failedLies.length >= 3 ? 'Critical' :
                  failedLies.length === 2 ? 'Significant' :
                  failedLies.length === 1 ? 'Moderate' : 'Strong';
  
  return {
    code: 'S1',
    name: 'Proximity Rate Inside 8 Feet by Lie',
    description: 'Percentage of short game shots finishing inside 8 feet, by lie type',
    lieMetrics,
    severity,
    worstLie,
  };
}

/**
 * S2 — Proximity Rate Inside 8 Feet by Distance Band
 */
export function calculateShortGameDriverS2(shots: ProcessedShot[]): ShortGameDriverS2 | null {
  const shortGame = shots.filter(s => s.shotType === 'Short Game');
  
  if (shortGame.length === 0) return null;
  
  const bandDefinitions = [
    { label: '0-20y', minDistance: 0, maxDistance: 20, threshold: 70 },
    { label: '20-40y', minDistance: 20, maxDistance: 40, threshold: 60 },
    { label: '40-60y', minDistance: 40, maxDistance: 60, threshold: 50 },
  ];
  
  const distanceMetrics: ShortGameDistanceMetric[] = bandDefinitions.map(band => {
    const bandShots = shortGame.filter(s => 
      s['Starting Distance'] >= band.minDistance && 
      s['Starting Distance'] < band.maxDistance
    );
    
    const totalShots = bandShots.length;
    if (totalShots === 0) {
      return {
        label: band.label,
        minDistance: band.minDistance,
        maxDistance: band.maxDistance,
        totalShots: 0,
        inside8Feet: 0,
        proximityRate: 0,
      };
    }
    
    const inside8Feet = bandShots.filter(s => {
      const distInFeet = s['Ending Lie'] === 'Green' 
        ? s['Ending Distance'] 
        : yardsToFeet(s['Ending Distance']);
      return distInFeet <= 8;
    }).length;
    
    const proximityRate = (inside8Feet / totalShots) * 100;
    
    return {
      label: band.label,
      minDistance: band.minDistance,
      maxDistance: band.maxDistance,
      totalShots,
      inside8Feet,
      proximityRate,
    };
  });
  
  let worstDistance: string | undefined;
  distanceMetrics.forEach(metric => {
    if (metric.totalShots > 0) {
      const threshold = bandDefinitions.find(b => b.label === metric.label)?.threshold || 50;
      if (metric.proximityRate < threshold && (!worstDistance || metric.proximityRate < distanceMetrics.find(d => d.label === worstDistance)!.proximityRate)) {
        worstDistance = metric.label;
      }
    }
  });
  
  const failedDistances = distanceMetrics.filter(m => {
    if (m.totalShots === 0) return false;
    const threshold = bandDefinitions.find(b => b.label === m.label)?.threshold || 50;
    return m.proximityRate < threshold;
  });
  
  const severity = failedDistances.length >= 3 ? 'Critical' :
                  failedDistances.length === 2 ? 'Significant' :
                  failedDistances.length === 1 ? 'Moderate' : 'Strong';
  
  return {
    code: 'S2',
    name: 'Proximity Rate Inside 8 Feet by Distance Band',
    description: 'Percentage finishing inside 8 feet, by distance band',
    distanceMetrics,
    severity,
    worstDistance,
  };
}

/**
 * S3 — Failure Rate (15+ Feet)
 */
export function calculateShortGameDriverS3(shots: ProcessedShot[]): ShortGameDriverS3 | null {
  const shortGame = shots.filter(s => s.shotType === 'Short Game');
  
  if (shortGame.length === 0) return null;
  
  const failures = shortGame.filter(s => {
    const distInFeet = s['Ending Lie'] === 'Green' 
      ? s['Ending Distance'] 
      : yardsToFeet(s['Ending Distance']);
    return distInFeet > 15;
  });
  
  const totalShortGameShots = shortGame.length;
  const failureCount = failures.length;
  const failureRate = (failureCount / totalShortGameShots) * 100;
  const sgImpact = failures.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  const severity = failureRate > 20 ? 'Critical' : failureRate > 10 ? 'Significant' : 'Strong';
  
  return {
    code: 'S3',
    name: 'Failure Rate (15+ Feet)',
    description: 'Percentage of short game shots finishing >15 feet from hole',
    value: failureRate,
    totalShortGameShots,
    failures: failureCount,
    severity,
    sgImpact,
  };
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate all PlayerPath metrics
 */
export function calculatePlayerPathMetrics(shots: ProcessedShot[]): PlayerPathMetrics {
  const roundIds = [...new Set(shots.map(s => s['Round ID']))];
  const totalRounds = roundIds.length;
  
  // Calculate all drivers
  const d1 = calculateDrivingDriverD1(shots);
  const d2 = calculateDrivingDriverD2(shots);
  const d3 = calculateDrivingDriverD3(shots);
  const d4 = calculateDrivingDriverD4(shots);
  const d5 = calculateDrivingDriverD5(shots);
  
  const a1 = calculateApproachDriverA1(shots);
  const a2 = calculateApproachDriverA2(shots);
  const a3 = calculateApproachDriverA3(shots);
  const a4 = calculateApproachDriverA4(shots);
  
  const lag = calculateLagPuttingMetrics(shots);
  const m1 = calculatePuttingDriverM1(shots);
  const m2 = calculatePuttingDriverM2(shots);
  
  const s1 = calculateShortGameDriverS1(shots);
  const s2 = calculateShortGameDriverS2(shots);
  const s3 = calculateShortGameDriverS3(shots);
  
  // Collect severity flags
  const allDrivers = [d1, d2, d3, d4, d5, a1, a2, a3, a4, lag, m1, m2, s1, s2, s3];
  
  const criticalDrivers: string[] = [];
  const significantDrivers: string[] = [];
  const moderateDrivers: string[] = [];
  
  allDrivers.forEach(driver => {
    if (!driver) return;
    
    const severity = 'severity' in driver ? driver.severity : 'Strong';
    const code = 'code' in driver ? driver.code : '';
    
    if (severity === 'Critical') criticalDrivers.push(code);
    else if (severity === 'Significant') significantDrivers.push(code);
    else if (severity === 'Moderate') moderateDrivers.push(code);
  });
  
  return {
    driving: { d1, d2, d3, d4, d5 },
    approach: { a1, a2, a3, a4 },
    putting: { lag, m1, m2 },
    shortGame: { s1, s2, s3 },
    totalRounds,
    calculatedAt: new Date(),
    criticalDrivers,
    significantDrivers,
    moderateDrivers,
  };
}
