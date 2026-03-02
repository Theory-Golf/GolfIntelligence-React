/**
 * Golf Intelligence — Calculations
 * Based on your shot classification rules
 */

import type { RawShot, ProcessedShot, ShotType, ShotCategory, Tiger5Metrics, RoundSummary, Tiger5Fail, HoleScore, RootCauseMetrics, Tiger5FailDetail, Tiger5FailDetails, RootCauseByFailTypeList, RootCauseByFailType, Tiger5TrendDataPoint, SGSeparator, SGShotCategory, SGRoundData, DrivingMetrics, DriveEndingLocationData, DriveDistanceRange, DrivingAnalysis, DriveEndingLocationType, ProblemDriveMetrics, ApproachMetrics, ApproachDistanceBucket, ApproachHeatMapCell, ApproachHeatMapData, PuttingMetrics, PuttingDistanceBucket, LagPuttingMetrics, LagDistanceDistribution, ScoringMetrics, ParScoringMetrics, HoleOutcomeData, HoleOutcome, MentalMetrics, BogeyRateByPar, BirdieOpportunityMetrics, ScoringRootCause, BirdieAndBogeyMetrics, ShortGameMetrics, ShortGameHeatMapCell, ShortGameHeatMapData } from '../types/golf';
import type { BenchmarkType } from '../data/benchmarks';
import { calculateStrokesGained } from '../data/benchmarks';

/**
 * Calculate Hole Par based on starting distance of first shot
 * - 0-225 yards = Par 3
 * - 226-495 yards = Par 4
 * - 495+ yards = Par 5
 */
export function calculateHolePar(startingDistance: number): number {
  if (startingDistance <= 225) return 3;
  if (startingDistance <= 495) return 4;
  return 5;
}

/**
 * Group shots by hole and calculate hole scores
 */
export function getHoleScores(shots: ProcessedShot[]): HoleScore[] {
  const holeMap = new Map<string, ProcessedShot[]>();
  
  shots.forEach(shot => {
    const key = `${shot['Round ID']}-${shot.Hole}`;
    if (!holeMap.has(key)) {
      holeMap.set(key, []);
    }
    holeMap.get(key)!.push(shot);
  });
  
  const holeScores: HoleScore[] = [];
  
  holeMap.forEach((holeShots, _key) => {
    const firstShot = holeShots[0];
    const roundId = firstShot['Round ID'];
    const hole = firstShot.Hole;
    const par = firstShot.holePar;
    // Score is the number of shots taken on this hole (each shot = 1 stroke)
    // The CSV Score column is cumulative for the round, so we count shots instead
    const score = holeShots.length;
    
    holeScores.push({
      roundId,
      hole,
      par,
      score,
      shots: holeShots,
    });
  });
  
  return holeScores;
}

/**
 * Calculate Tiger 5 fails from hole scores and shots
 * 
 * Tiger 5 Fails:
 * 1. 3 Putts: >= 3 putts on a hole
 * 2. Bogey on Par 5: Hole score >= 6 on par 5 holes
 * 3. Double Bogey: Hole score >= par + 2
 * 4. Bogey: Approach < 125 - Approach shot from fairway/rough/sand, starting distance <= 125, 
 *    hole score >= par + 1, shot # is shot 1 on par 3, shot 2 on par 4, shot 2 or 3 on par 5
 * 5. Missed Green (Short Game): Short game shot ending NOT on green
 */
export function calculateTiger5Fails(shots: ProcessedShot[], holeScores: HoleScore[], totalRounds: number): Tiger5Fail {
  let threePutts = 0;
  let threePuttsSG = 0;
  let bogeyOnPar5 = 0;
  let bogeyOnPar5SG = 0;
  let doubleBogey = 0;
  let doubleBogeySG = 0;
  let bogeyApproach = 0;
  let bogeyApproachSG = 0;
  let missedGreen = 0;
  let missedGreenSG = 0;
  let sgOnFailHoles = 0;
  
  // Track holes that had any Tiger 5 fail
  const failHoleKeys = new Set<string>();
  
  // Map to track which fail type each hole had (for SG calculation)
  const failTypeByHole = new Map<string, string[]>();
  
  // Check 3 Putts - count putts on each hole
  shots.forEach(shot => {
    if (shot.shotType === 'Putt') {
      // Count total putts on this hole
      const holeKey = `${shot['Round ID']}-${shot.Hole}`;
      const holeShots = shots.filter(s => s['Round ID'] === shot['Round ID'] && s.Hole === shot.Hole);
      const puttCount = holeShots.filter(s => s.shotType === 'Putt').length;
      
      if (puttCount >= 3 && !failHoleKeys.has(holeKey + '-3putt')) {
        threePutts++;
        // Calculate SG for this hole
        const holeSG = holeShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
        threePuttsSG += holeSG;
        failHoleKeys.add(holeKey + '-3putt');
        failHoleKeys.add(holeKey);
        // Track fail type
        if (!failTypeByHole.has(holeKey)) failTypeByHole.set(holeKey, []);
        failTypeByHole.get(holeKey)!.push('threePutts');
      }
    }
  });
  
  // Check Bogey on Par 5, Double Bogey
  holeScores.forEach(hole => {
    const holeKey = `${hole.roundId}-${hole.hole}`;
    const holeShots = shots.filter(s => s['Round ID'] === hole.roundId && s.Hole === hole.hole);
    const holeSG = holeShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    
    if (hole.par === 5 && hole.score >= 6) {
      bogeyOnPar5++;
      bogeyOnPar5SG += holeSG;
      failHoleKeys.add(`${hole.roundId}-${hole.hole}-bogeyP5`);
      failHoleKeys.add(`${hole.roundId}-${hole.hole}`);
      if (!failTypeByHole.has(holeKey)) failTypeByHole.set(holeKey, []);
      failTypeByHole.get(holeKey)!.push('bogeyOnPar5');
    }
    if (hole.score >= hole.par + 2) {
      doubleBogey++;
      doubleBogeySG += holeSG;
      failHoleKeys.add(`${hole.roundId}-${hole.hole}-dblBogey`);
      failHoleKeys.add(`${hole.roundId}-${hole.hole}`);
      if (!failTypeByHole.has(holeKey)) failTypeByHole.set(holeKey, []);
      failTypeByHole.get(holeKey)!.push('doubleBogey');
    }
  });
  
  // Check Bogey: Approach < 125
  // Approach from fairway, rough, sand with starting distance <= 125
  // Shot 1 on par 3, shot 2 on par 4, shot 2 or 3 on par 5
  shots.forEach(shot => {
    if (shot.shotType === 'Approach') {
      const startDist = shot['Starting Distance'];
      const startLoc = shot['Starting Lie'];
      const shotNum = shot.Shot;
      const holeKey = `${shot['Round ID']}-${shot.Hole}`;
      const hole = holeScores.find(h => h.roundId === shot['Round ID'] && h.hole === shot.Hole);
      
      if (!hole) return;
      
      const isValidLocation = ['Fairway', 'Rough', 'Sand'].includes(startLoc);
      const isValidDistance = startDist <= 125;
      
      let isValidShotNum = false;
      if (hole.par === 3 && shotNum === 1) isValidShotNum = true;
      if (hole.par === 4 && shotNum === 2) isValidShotNum = true;
      if (hole.par === 5 && (shotNum === 2 || shotNum === 3)) isValidShotNum = true;
      
      // Check if hole score >= par + 1
      const isBogeyOrWorse = hole.score >= hole.par + 1;
      
      if (isValidLocation && isValidDistance && isValidShotNum && isBogeyOrWorse) {
        if (!failHoleKeys.has(holeKey + '-bogeyApproach')) {
          bogeyApproach++;
          // Calculate SG for this hole
          const holeShots = shots.filter(s => s['Round ID'] === shot['Round ID'] && s.Hole === shot.Hole);
          const holeSG = holeShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
          bogeyApproachSG += holeSG;
          failHoleKeys.add(holeKey + '-bogeyApproach');
          failHoleKeys.add(holeKey);
          if (!failTypeByHole.has(holeKey)) failTypeByHole.set(holeKey, []);
          failTypeByHole.get(holeKey)!.push('bogeyApproach');
        }
      }
    }
  });
  
  // Check Missed Green (Short Game)
  shots.forEach(shot => {
    if (shot.shotType === 'Short Game') {
      const endLoc = shot['Ending Lie'];
      if (endLoc !== 'Green') {
        const holeKey = `${shot['Round ID']}-${shot.Hole}`;
        if (!failHoleKeys.has(holeKey + '-missedGreen')) {
          missedGreen++;
          // Calculate SG for this hole
          const holeShots = shots.filter(s => s['Round ID'] === shot['Round ID'] && s.Hole === shot.Hole);
          const holeSG = holeShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
          missedGreenSG += holeSG;
          failHoleKeys.add(holeKey + '-missedGreen');
          failHoleKeys.add(holeKey);
          if (!failTypeByHole.has(holeKey)) failTypeByHole.set(holeKey, []);
          failTypeByHole.get(holeKey)!.push('missedGreen');
        }
      }
    }
  });
  
  // Calculate SG on fail holes
  const failRoundHoles = new Set<string>();
  failHoleKeys.forEach(key => {
    // Extract roundId-hole from key (remove fail type suffix)
    const parts = key.split('-');
    if (parts.length >= 3) {
      const roundId = parts[0];
      const hole = parts[1];
      failRoundHoles.add(`${roundId}-${hole}`);
    }
  });
  
  failRoundHoles.forEach(key => {
    const [roundId, holeStr] = key.split('-');
    const hole = parseInt(holeStr);
    const holeShots = shots.filter(s => s['Round ID'] === roundId && s.Hole === hole);
    const holeSG = holeShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    sgOnFailHoles += holeSG;
  });
  
  const totalFails = threePutts + bogeyOnPar5 + doubleBogey + bogeyApproach + missedGreen;
  const failsPerRound = totalRounds > 0 ? totalFails / totalRounds : 0;
  
  return {
    threePutts,
    threePuttsSG,
    bogeyOnPar5,
    bogeyOnPar5SG,
    doubleBogey,
    doubleBogeySG,
    bogeyApproach,
    bogeyApproachSG,
    missedGreen,
    missedGreenSG,
    totalFails,
    failsPerRound,
    sgOnFailHoles,
  };
}

/**
 * Calculate Root Cause for Tiger 5 fails
 * For each hole with a Tiger 5 fail, identify the shot with the lowest SG value
 * and categorize it as the root cause
 * 
 * Root cause categories:
 * - Penalties: Shot resulted in penalty
 * - Makeable Putts: Putts from 0-12 feet
 * - Lag Putts: Putts from 13+ feet
 * - Driving: Shot type is Drive
 * - Approach: Shot type is Approach
 * - Short Game: Shot type is Short Game
 * - Recovery: Shot type is Recovery
 */
export function calculateRootCause(shots: ProcessedShot[], holeScores: HoleScore[], _tiger5Fails: Tiger5Fail): RootCauseMetrics {
  // Default root cause object
  const defaultRootCause: RootCauseMetrics = {
    totalFailHoles: 0,
    penalties: 0,
    penaltiesSG: 0,
    failHolesWithPenalty: 0,
    makeablePutts: 0,
    makeablePuttsSG: 0,
    lagPutts: 0,
    lagPuttsSG: 0,
    driving: 0,
    drivingSG: 0,
    approach: 0,
    approachSG: 0,
    shortGame: 0,
    shortGameSG: 0,
    recovery: 0,
    recoverySG: 0,
  };

  if (shots.length === 0) {
    return defaultRootCause;
  }

  // Get holes with Tiger 5 fails
  const failHoleKeys = new Set<string>();
  
  // We need to identify fail holes from the tiger5Fails counts
  // Check each hole if it had a Tiger 5 fail
  holeScores.forEach(hole => {
    const holeShots = shots.filter(s => s['Round ID'] === hole.roundId && s.Hole === hole.hole);
    if (holeShots.length === 0) return;
    
    const holeKey = `${hole.roundId}-${hole.hole}`;
    
    // Check if this hole had a Tiger 5 fail based on criteria
    const has3Putts = holeShots.filter(s => s.shotType === 'Putt').length >= 3;
    const hasBogeyOnPar5 = hole.par === 5 && hole.score >= 6;
    const hasDoubleBogey = hole.score >= hole.par + 2;
    const hasBogeyApproach = holeShots.some(s => {
      if (s.shotType !== 'Approach') return false;
      const startDist = s['Starting Distance'];
      const startLoc = s['Starting Lie'];
      const shotNum = s.Shot;
      const isValidLocation = ['Fairway', 'Rough', 'Sand'].includes(startLoc);
      const isValidDistance = startDist <= 125;
      let isValidShotNum = false;
      if (hole.par === 3 && shotNum === 1) isValidShotNum = true;
      if (hole.par === 4 && shotNum === 2) isValidShotNum = true;
      if (hole.par === 5 && (shotNum === 2 || shotNum === 3)) isValidShotNum = true;
      return isValidLocation && isValidDistance && isValidShotNum && hole.score >= hole.par + 1;
    });
    const hasMissedGreen = holeShots.some(s => {
      if (s.shotType !== 'Short Game') return false;
      return s['Ending Lie'] !== 'Green';
    });
    
    const isFailHole = has3Putts || hasBogeyOnPar5 || hasDoubleBogey || hasBogeyApproach || hasMissedGreen;
    
    if (isFailHole) {
      failHoleKeys.add(holeKey);
    }
  });

  // Now for each fail hole, find the shot with lowest SG (the root cause)
  const rootCause: RootCauseMetrics = {
    totalFailHoles: failHoleKeys.size,
    penalties: 0,
    penaltiesSG: 0,
    failHolesWithPenalty: 0,
    makeablePutts: 0,
    makeablePuttsSG: 0,
    lagPutts: 0,
    lagPuttsSG: 0,
    driving: 0,
    drivingSG: 0,
    approach: 0,
    approachSG: 0,
    shortGame: 0,
    shortGameSG: 0,
    recovery: 0,
    recoverySG: 0,
  };

  // Track holes with penalties
  const failHolesWithPenalties = new Set<string>();

  failHoleKeys.forEach(holeKey => {
    const [roundId, holeStr] = holeKey.split('-');
    const hole = parseInt(holeStr);
    const holeShots = shots.filter(s => s['Round ID'] === roundId && s.Hole === hole);
    
    // Check if hole has penalty
    const hasPenalty = holeShots.some(s => s.Penalty === 'Yes');
    if (hasPenalty) {
      failHolesWithPenalties.add(holeKey);
    }
    
    // Find shot with lowest SG (most negative = worst)
    let worstShot: ProcessedShot | null = null;
    let lowestSG = Infinity;
    
    for (const shot of holeShots) {
      if (shot.calculatedStrokesGained < lowestSG) {
        lowestSG = shot.calculatedStrokesGained;
        worstShot = shot;
      }
    }
    
    if (worstShot) {
      // Categorize the root cause
      const startDist = worstShot['Starting Distance'];
      const shotType: ShotType = worstShot.shotType;
      const isPenalty: boolean = worstShot.Penalty === 'Yes';
      const shotSG = worstShot.calculatedStrokesGained;
      
      if (isPenalty) {
        rootCause.penalties++;
        rootCause.penaltiesSG += shotSG;
      } else if (shotType === 'Putt') {
        // Check putt distance
        if (startDist <= 12) {
          rootCause.makeablePutts++;
          rootCause.makeablePuttsSG += shotSG;
        } else {
          rootCause.lagPutts++;
          rootCause.lagPuttsSG += shotSG;
        }
      } else if (shotType === 'Drive') {
        rootCause.driving++;
        rootCause.drivingSG += shotSG;
      } else if (shotType === 'Approach') {
        rootCause.approach++;
        rootCause.approachSG += shotSG;
      } else if (shotType === 'Short Game') {
        rootCause.shortGame++;
        rootCause.shortGameSG += shotSG;
      } else if (shotType === 'Recovery') {
        rootCause.recovery++;
        rootCause.recoverySG += shotSG;
      }
    }
  });

  rootCause.failHolesWithPenalty = failHolesWithPenalties.size;

  return rootCause;
}

/**
 * Filter shots based on Tiger 5 fail type
 * - 3 Putts: only putts
 * - Short Game misses: only short game shots
 * - Bogey <125: only approach and putts
 * - Other fails: all shots
 */
function filterShotsForFailType(failType: string, holeShots: ProcessedShot[]): ProcessedShot[] {
  switch (failType) {
    case '3 Putts':
      // Only putts
      return holeShots.filter(s => s.shotType === 'Putt');
    case 'Missed Green':
      // Only short game shots
      return holeShots.filter(s => s.shotType === 'Short Game');
    case 'Bogey: Approach <125':
      // Only approach and putts
      return holeShots.filter(s => s.shotType === 'Approach' || s.shotType === 'Putt');
    default:
      // All shots
      return holeShots;
  }
}

/**
 * Calculate Tiger 5 fail details - grouped by fail type, sorted by date ascending
 */
export function calculateTiger5FailDetails(shots: ProcessedShot[], holeScores: HoleScore[]): Tiger5FailDetails {
  const details: Tiger5FailDetails = {
    threePutts: [],
    bogeyOnPar5: [],
    doubleBogey: [],
    bogeyApproach: [],
    missedGreen: [],
  };

  holeScores.forEach(hole => {
    const holeShots = shots.filter(s => s['Round ID'] === hole.roundId && s.Hole === hole.hole);
    if (holeShots.length === 0) return;
    
    const firstShot = holeShots[0];
    const date = firstShot.Date;
    const course = firstShot.Course;
    
    // Check each fail type
    const puttCount = holeShots.filter(s => s.shotType === 'Putt').length;
    if (puttCount >= 3) {
      details.threePutts.push({
        date,
        course,
        hole: hole.hole,
        par: hole.par,
        score: hole.score,
        failType: '3 Putts',
        shots: filterShotsForFailType('3 Putts', holeShots),
      });
    }
    
    if (hole.par === 5 && hole.score >= 6) {
      details.bogeyOnPar5.push({
        date,
        course,
        hole: hole.hole,
        par: hole.par,
        score: hole.score,
        failType: 'Bogey on Par 5',
        shots: filterShotsForFailType('Bogey on Par 5', holeShots),
      });
    }
    
    if (hole.score >= hole.par + 2) {
      details.doubleBogey.push({
        date,
        course,
        hole: hole.hole,
        par: hole.par,
        score: hole.score,
        failType: 'Double Bogey',
        shots: filterShotsForFailType('Double Bogey', holeShots),
      });
    }
    
    // Check Bogey: Approach <125
    const hasBogeyApproach = holeShots.some(s => {
      if (s.shotType !== 'Approach') return false;
      const startDist = s['Starting Distance'];
      const startLoc = s['Starting Lie'];
      const shotNum = s.Shot;
      const isValidLocation = ['Fairway', 'Rough', 'Sand'].includes(startLoc);
      const isValidDistance = startDist <= 125;
      let isValidShotNum = false;
      if (hole.par === 3 && shotNum === 1) isValidShotNum = true;
      if (hole.par === 4 && shotNum === 2) isValidShotNum = true;
      if (hole.par === 5 && (shotNum === 2 || shotNum === 3)) isValidShotNum = true;
      return isValidLocation && isValidDistance && isValidShotNum && hole.score >= hole.par + 1;
    });
    
    if (hasBogeyApproach) {
      details.bogeyApproach.push({
        date,
        course,
        hole: hole.hole,
        par: hole.par,
        score: hole.score,
        failType: 'Bogey: Approach <125',
        shots: filterShotsForFailType('Bogey: Approach <125', holeShots),
      });
    }
    
    // Check Missed Green
    const hasMissedGreen = holeShots.some(s => {
      if (s.shotType !== 'Short Game') return false;
      return s['Ending Lie'] !== 'Green';
    });
    
    if (hasMissedGreen) {
      details.missedGreen.push({
        date,
        course,
        hole: hole.hole,
        par: hole.par,
        score: hole.score,
        failType: 'Missed Green',
        shots: filterShotsForFailType('Missed Green', holeShots),
      });
    }
  });
  
  // Sort each category by date ascending (oldest first)
  const sortByDate = (a: Tiger5FailDetail, b: Tiger5FailDetail) => 
    new Date(a.date).getTime() - new Date(b.date).getTime();
  
  details.threePutts.sort(sortByDate);
  details.bogeyOnPar5.sort(sortByDate);
  details.doubleBogey.sort(sortByDate);
  details.bogeyApproach.sort(sortByDate);
  details.missedGreen.sort(sortByDate);
  
  return details;
}

/**
 * Calculate Tiger 5 trend data - grouped by round
 * Returns data for each round with fail counts and total score
 */
export function calculateTiger5Trend(shots: ProcessedShot[], holeScores: HoleScore[]): Tiger5TrendDataPoint[] {
  // Get unique rounds
  const roundIds = [...new Set(shots.map(s => s['Round ID']))];
  const trendData: Tiger5TrendDataPoint[] = [];

  roundIds.forEach(roundId => {
    const roundShots = shots.filter(s => s['Round ID'] === roundId);
    const roundHoleScores = holeScores.filter(h => h.roundId === roundId);
    
    if (roundShots.length === 0 || roundHoleScores.length === 0) return;
    
    const firstShot = roundShots[0];
    const date = firstShot.Date;
    const course = firstShot.Course;
    
    // Calculate total score for the round
    const totalScore = roundHoleScores.reduce((sum, h) => sum + h.score, 0);
    
    // Count fails by type for this round
    let threePutts = 0;
    let bogeyOnPar5 = 0;
    let doubleBogey = 0;
    let bogeyApproach = 0;
    let missedGreen = 0;
    
    roundHoleScores.forEach(hole => {
      const holeShots = roundShots.filter(s => s.Hole === hole.hole);
      const puttCount = holeShots.filter(s => s.shotType === 'Putt').length;
      
      if (puttCount >= 3) threePutts++;
      if (hole.par === 5 && hole.score >= 6) bogeyOnPar5++;
      if (hole.score >= hole.par + 2) doubleBogey++;
      
      // Check bogey approach
      const hasBogeyApproach = holeShots.some(s => {
        if (s.shotType !== 'Approach') return false;
        const startDist = s['Starting Distance'];
        const startLoc = s['Starting Lie'];
        const shotNum = s.Shot;
        const isValidLocation = ['Fairway', 'Rough', 'Sand'].includes(startLoc);
        const isValidDistance = startDist <= 125;
        let isValidShotNum = false;
        if (hole.par === 3 && shotNum === 1) isValidShotNum = true;
        if (hole.par === 4 && shotNum === 2) isValidShotNum = true;
        if (hole.par === 5 && (shotNum === 2 || shotNum === 3)) isValidShotNum = true;
        return isValidLocation && isValidDistance && isValidShotNum && hole.score >= hole.par + 1;
      });
      if (hasBogeyApproach) bogeyApproach++;
      
      // Check missed green
      const hasMissedGreen = holeShots.some(s => {
        if (s.shotType !== 'Short Game') return false;
        return s['Ending Lie'] !== 'Green';
      });
      if (hasMissedGreen) missedGreen++;
    });
    
    trendData.push({
      roundId,
      date,
      course,
      threePutts,
      bogeyOnPar5,
      doubleBogey,
      bogeyApproach,
      missedGreen,
      totalScore,
    });
  });

  // Sort by date ascending
  trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return trendData;
}

/**
 * Calculate root cause breakdown by fail type
 * For each fail type, identify the root cause (lowest SG shot) and categorize it
 */
export function calculateRootCauseByFailType(shots: ProcessedShot[], holeScores: HoleScore[], totalFails: number): RootCauseByFailTypeList {
  const defaultRootCause: RootCauseByFailType = {
    failType: '',
    totalCount: 0,
    makeablePutts: 0,
    makeablePuttsSG: 0,
    lagPutts: 0,
    lagPuttsSG: 0,
    driving: 0,
    drivingSG: 0,
    approach: 0,
    approachSG: 0,
    shortGame: 0,
    shortGameSG: 0,
    recovery: 0,
    recoverySG: 0,
    penalties: 0,
    penaltiesSG: 0,
  };

  const result: RootCauseByFailTypeList = {
    threePutts: { ...defaultRootCause, failType: '3 Putts' },
    bogeyOnPar5: { ...defaultRootCause, failType: 'Bogey on Par 5' },
    doubleBogey: { ...defaultRootCause, failType: 'Double Bogey' },
    bogeyApproach: { ...defaultRootCause, failType: 'Bogey: Approach <125' },
    missedGreen: { ...defaultRootCause, failType: 'Missed Green' },
  };

  // Track starting lie for missed green
  const missedGreenByLie: Map<string, { count: number; sgTotal: number }> = new Map();

  holeScores.forEach(hole => {
    const holeShots = shots.filter(s => s['Round ID'] === hole.roundId && s.Hole === hole.hole);
    if (holeShots.length === 0) return;
    
    // Find the worst shot (lowest SG) - this is the root cause
    let worstShot: ProcessedShot | null = null;
    let lowestSG = Infinity;
    
    for (const shot of holeShots) {
      if (shot.calculatedStrokesGained < lowestSG) {
        lowestSG = shot.calculatedStrokesGained;
        worstShot = shot;
      }
    }
    
    if (!worstShot) return;
    
    const startDist = worstShot['Starting Distance'];
    const shotType = worstShot.shotType;
    const startLie = worstShot['Starting Lie'];
    const isPenalty = worstShot.Penalty === 'Yes';
    const shotSG = worstShot.calculatedStrokesGained;
    
    // Determine which fail type this hole is
    const puttCount = holeShots.filter(s => s.shotType === 'Putt').length;
    const is3Putts = puttCount >= 3;
    const isBogeyOnPar5 = hole.par === 5 && hole.score >= 6;
    const isDoubleBogey = hole.score >= hole.par + 2;
    const hasBogeyApproach = holeShots.some(s => {
      if (s.shotType !== 'Approach') return false;
      const sDist = s['Starting Distance'];
      const sLoc = s['Starting Lie'];
      const sNum = s.Shot;
      const isValidLocation = ['Fairway', 'Rough', 'Sand'].includes(sLoc);
      const isValidDistance = sDist <= 125;
      let isValidShotNum = false;
      if (hole.par === 3 && sNum === 1) isValidShotNum = true;
      if (hole.par === 4 && sNum === 2) isValidShotNum = true;
      if (hole.par === 5 && (sNum === 2 || sNum === 3)) isValidShotNum = true;
      return isValidLocation && isValidDistance && isValidShotNum && hole.score >= hole.par + 1;
    });
    const hasMissedGreen = holeShots.some(s => {
      if (s.shotType !== 'Short Game') return false;
      return s['Ending Lie'] !== 'Green';
    });
    
    // Categorize root cause
    const categorizeRootCause = (target: RootCauseByFailType) => {
      if (isPenalty) {
        target.penalties++;
        target.penaltiesSG += shotSG;
      } else if (shotType === 'Putt') {
        if (startDist <= 12) {
          target.makeablePutts++;
          target.makeablePuttsSG += shotSG;
        } else {
          target.lagPutts++;
          target.lagPuttsSG += shotSG;
        }
      } else if (shotType === 'Drive') {
        target.driving++;
        target.drivingSG += shotSG;
      } else if (shotType === 'Approach') {
        target.approach++;
        target.approachSG += shotSG;
      } else if (shotType === 'Short Game') {
        target.shortGame++;
        target.shortGameSG += shotSG;
        // Track by starting lie for missed green
        if (target.failType === 'Missed Green') {
          const current = missedGreenByLie.get(startLie) || { count: 0, sgTotal: 0 };
          missedGreenByLie.set(startLie, { count: current.count + 1, sgTotal: current.sgTotal + shotSG });
        }
      } else if (shotType === 'Recovery') {
        target.recovery++;
        target.recoverySG += shotSG;
      }
    };
    
    if (is3Putts) {
      categorizeRootCause(result.threePutts);
      result.threePutts.totalCount++;
    }
    if (isBogeyOnPar5) {
      categorizeRootCause(result.bogeyOnPar5);
      result.bogeyOnPar5.totalCount++;
    }
    if (isDoubleBogey) {
      categorizeRootCause(result.doubleBogey);
      result.doubleBogey.totalCount++;
    }
    if (hasBogeyApproach) {
      categorizeRootCause(result.bogeyApproach);
      result.bogeyApproach.totalCount++;
    }
    if (hasMissedGreen) {
      categorizeRootCause(result.missedGreen);
      result.missedGreen.totalCount++;
    }
  });
  
  // Add starting lie breakdown for missed green
  if (result.missedGreen.totalCount > 0) {
    const byStartingLie: { lie: string; count: number; percentageOfFailType: number; percentageOfTotal: number; sgTotal: number }[] = [];
    missedGreenByLie.forEach((value, lie) => {
      byStartingLie.push({
        lie,
        count: value.count,
        percentageOfFailType: (value.count / result.missedGreen.totalCount) * 100,
        percentageOfTotal: totalFails > 0 ? (value.count / totalFails) * 100 : 0,
        sgTotal: value.sgTotal,
      });
    });
    // Sort by count descending
    byStartingLie.sort((a, b) => b.count - a.count);
    result.missedGreen.byStartingLie = byStartingLie;
  }
  
  return result;
}

/**
 * Classify shot type based on your rules:
 * - Drive: Starting Location = Tee AND Hole Par = 4 or 5
 * - Approach: Starting Location = Fairway, Sand, Rough OR tee with distance <=225 but >=50
 * - Recovery: Starting location = Recovery
 * - Short Game: Starting distance <= 50 yards, starting location is not recovery
 * - Putt: Starting location = Green
 */
export function classifyShotType(shot: RawShot, holePar: number): ShotType {
  const { 'Starting Lie': startLoc, 'Starting Distance': startDist } = shot;
  
  // Putt: Starting location = Green
  if (startLoc === 'Green') {
    return 'Putt';
  }
  
  // Recovery: Starting location = Recovery
  if (startLoc === 'Recovery') {
    return 'Recovery';
  }
  
  // Short Game: Starting distance <= 50 yards, starting location is not recovery
  if (startDist <= 50 && startLoc !== 'Recovery') {
    return 'Short Game';
  }
  
  // Drive: Starting Location = Tee AND Hole Par = 4 or 5
  if (startLoc === 'Tee' && (holePar === 4 || holePar === 5)) {
    return 'Drive';
  }
  
  // Approach: 
  // - Starting Location = Fairway, Sand, Rough
  // - OR tee with distance <=225 but >=50
  const isApproachLocation = ['Fairway', 'Sand', 'Rough'].includes(startLoc);
  const isTeeApproach = startLoc === 'Tee' && startDist <= 225 && startDist >= 50;
  
  if (isApproachLocation || isTeeApproach) {
    return 'Approach';
  }
  
  // Default fallback - treat as Approach
  return 'Approach';
}

/**
 * Process raw shots into enhanced shots with computed fields
 */
export function processShots(rawShots: RawShot[], benchmark: BenchmarkType = 'pgaTour'): ProcessedShot[] {
  // Group shots by round and hole to find first shots
  const firstShotsByHole = new Map<string, RawShot>();
  
  rawShots.forEach(shot => {
    const key = `${shot['Round ID']}-${shot.Hole}`;
    if (!firstShotsByHole.has(key)) {
      firstShotsByHole.set(key, shot);
    }
  });
  
  // Calculate hole pars from first shots
  const holePars = new Map<string, number>();
  firstShotsByHole.forEach((shot, key) => {
    holePars.set(key, calculateHolePar(shot['Starting Distance']));
  });
  
  // Process each shot
  return rawShots.map(shot => {
    const roundHoleKey = `${shot['Round ID']}-${shot.Hole}`;
    const holePar = holePars.get(roundHoleKey) || 4;
    
    // Calculate SG using benchmark
    // Pass penalty flag: shot.Penalty === 'Yes' means this shot resulted in a penalty
    const isPenalty = shot.Penalty === 'Yes';
    const calculatedSG = calculateStrokesGained(
      benchmark,
      shot['Starting Distance'],
      shot['Starting Lie'],
      shot['Ending Distance'],
      shot['Ending Lie'],
      isPenalty
    );
    
    return {
      ...shot,
      holePar,
      shotType: classifyShotType(shot, holePar),
      scoreToPar: 0, // Will be calculated at round level
      calculatedStrokesGained: calculatedSG,
    };
  });
}

/**
 * Calculate Tiger 5 metrics from processed shots
 */
export function calculateTiger5Metrics(shots: ProcessedShot[]): Tiger5Metrics {
  // Default fail object
  const defaultTiger5Fails: Tiger5Fail = {
    threePutts: 0,
    threePuttsSG: 0,
    bogeyOnPar5: 0,
    bogeyOnPar5SG: 0,
    doubleBogey: 0,
    doubleBogeySG: 0,
    bogeyApproach: 0,
    bogeyApproachSG: 0,
    missedGreen: 0,
    missedGreenSG: 0,
    totalFails: 0,
    failsPerRound: 0,
    sgOnFailHoles: 0,
  };
  
  if (shots.length === 0) {
    const defaultRootCause: RootCauseMetrics = {
      totalFailHoles: 0,
      penalties: 0,
      penaltiesSG: 0,
      failHolesWithPenalty: 0,
      makeablePutts: 0,
      makeablePuttsSG: 0,
      lagPutts: 0,
      lagPuttsSG: 0,
      driving: 0,
      drivingSG: 0,
      approach: 0,
      approachSG: 0,
      shortGame: 0,
      shortGameSG: 0,
      recovery: 0,
      recoverySG: 0,
    };
    const defaultFailDetails: Tiger5FailDetails = {
      threePutts: [],
      bogeyOnPar5: [],
      doubleBogey: [],
      bogeyApproach: [],
      missedGreen: [],
    };
    const defaultRootCauseByFailType: RootCauseByFailTypeList = {
      threePutts: { failType: '3 Putts', totalCount: 0, makeablePutts: 0, makeablePuttsSG: 0, lagPutts: 0, lagPuttsSG: 0, driving: 0, drivingSG: 0, approach: 0, approachSG: 0, shortGame: 0, shortGameSG: 0, recovery: 0, recoverySG: 0, penalties: 0, penaltiesSG: 0 },
      bogeyOnPar5: { failType: 'Bogey on Par 5', totalCount: 0, makeablePutts: 0, makeablePuttsSG: 0, lagPutts: 0, lagPuttsSG: 0, driving: 0, drivingSG: 0, approach: 0, approachSG: 0, shortGame: 0, shortGameSG: 0, recovery: 0, recoverySG: 0, penalties: 0, penaltiesSG: 0 },
      doubleBogey: { failType: 'Double Bogey', totalCount: 0, makeablePutts: 0, makeablePuttsSG: 0, lagPutts: 0, lagPuttsSG: 0, driving: 0, drivingSG: 0, approach: 0, approachSG: 0, shortGame: 0, shortGameSG: 0, recovery: 0, recoverySG: 0, penalties: 0, penaltiesSG: 0 },
      bogeyApproach: { failType: 'Bogey: Approach <125', totalCount: 0, makeablePutts: 0, makeablePuttsSG: 0, lagPutts: 0, lagPuttsSG: 0, driving: 0, drivingSG: 0, approach: 0, approachSG: 0, shortGame: 0, shortGameSG: 0, recovery: 0, recoverySG: 0, penalties: 0, penaltiesSG: 0 },
      missedGreen: { failType: 'Missed Green', totalCount: 0, makeablePutts: 0, makeablePuttsSG: 0, lagPutts: 0, lagPuttsSG: 0, driving: 0, drivingSG: 0, approach: 0, approachSG: 0, shortGame: 0, shortGameSG: 0, recovery: 0, recoverySG: 0, penalties: 0, penaltiesSG: 0 },
    };
    const defaultSGSeparators: SGSeparator[] = [];
    return {
      totalStrokesGained: 0,
      avgStrokesGained: 0,
      totalRounds: 0,
      totalShots: 0,
      scoringAvg: 0,
      fairwayPct: 0,
      girPct: 0,
      byCategory: [],
      tiger5Fails: defaultTiger5Fails,
      rootCause: defaultRootCause,
      failDetails: defaultFailDetails,
      rootCauseByFailType: defaultRootCauseByFailType,
      tiger5Trend: [],
      lowestRound: 0,
      highestRound: 0,
      avgScore: 0,
      sgSeparators: defaultSGSeparators,
    };
  }
  
  // Use calculated SG from benchmark (not raw data SG)
  const totalStrokesGained = shots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const totalShots = shots.length;
  const avgStrokesGained = totalStrokesGained / totalShots;
  
  // Get unique rounds
  const roundIds = [...new Set(shots.map(s => s['Round ID']))];
  const totalRounds = roundIds.length;
  
  // Calculate fairways (only for par 4 and 5 holes - drives that ended in fairway)
  let fairwaysHit = 0;
  let fairwaysTotal = 0;
  
  // Calculate GIR (Green in Regulation - approach from fairway/rough that ended on green)
  let gir = 0;
  let girTotal = 0;
  
  shots.forEach(shot => {
    // Fairway tracking: Drive (shot 1 on par 4/5) that ended in Fairway
    if (shot.shotType === 'Drive' && shot.holePar >= 4) {
      fairwaysTotal++;
      if (shot['Ending Lie'] === 'Fairway') {
        fairwaysHit++;
      }
    }
    
    // GIR tracking: Approach shot that ended on green
    if (shot.shotType === 'Approach') {
      girTotal++;
      if (shot['Ending Lie'] === 'Green') {
        gir++;
      }
    }
  });
  
  const fairwayPct = fairwaysTotal > 0 ? (fairwaysHit / fairwaysTotal) * 100 : 0;
  const girPct = girTotal > 0 ? (gir / girTotal) * 100 : 0;
  
  // Calculate by category
  const categories = ['Drive', 'Approach', 'Short Game', 'Putt', 'Recovery'] as ShotType[];
  const byCategory: ShotCategory[] = categories.map(type => {
    const categoryShots = shots.filter(s => s.shotType === type);
    const catTotal = categoryShots.length;
    // Use calculated SG from benchmark
    const catSG = categoryShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    
    return {
      type,
      totalShots: catTotal,
      strokesGained: catSG,
      avgStrokesGained: catTotal > 0 ? catSG / catTotal : 0,
    };
  });
  
  // Calculate hole scores for Tiger 5 fails
  const holeScores = getHoleScores(shots);
  const tiger5Fails = calculateTiger5Fails(shots, holeScores, totalRounds);
  const rootCause = calculateRootCause(shots, holeScores, tiger5Fails);
  const failDetails = calculateTiger5FailDetails(shots, holeScores);
  const rootCauseByFailType = calculateRootCauseByFailType(shots, holeScores, tiger5Fails.totalFails);
  const tiger5Trend = calculateTiger5Trend(shots, holeScores);
  
  // Calculate SG Separators
  const sgSeparators = calculateSGSeparators(shots);
  
  // Calculate round scores (total strokes per round)
  const roundScores = new Map<string, number>();
  const roundSG = new Map<string, number>();
  
  shots.forEach(shot => {
    const roundId = shot['Round ID'];
    if (!roundScores.has(roundId)) {
      roundScores.set(roundId, 0);
      roundSG.set(roundId, 0);
    }
    // Get the last shot's score for this round to get total score
  });
  
  // Get score per round (using the last shot's Score value for each hole, then summing)
  roundIds.forEach(roundId => {
    const roundShots = shots.filter(s => s['Round ID'] === roundId);
    // Find max score (total score for the round)
    let maxScore = 0;
    roundShots.forEach(s => {
      if (s.Score > maxScore) maxScore = s.Score;
    });
    roundScores.set(roundId, maxScore);
    
    // Calculate SG per round
    const sg = roundShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    roundSG.set(roundId, sg);
  });
  
  const scores = Array.from(roundScores.values());
  
  const lowestRound = scores.length > 0 ? Math.min(...scores) : 0;
  const highestRound = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  // Note: avgSGPerRound is calculated in the component from metrics.totalStrokesGained / totalRounds
  
  return {
    totalStrokesGained,
    avgStrokesGained,
    totalRounds,
    totalShots,
    scoringAvg: avgScore,
    fairwayPct,
    girPct,
    byCategory,
    tiger5Fails,
    rootCause,
    failDetails,
    rootCauseByFailType,
    tiger5Trend,
    lowestRound,
    highestRound,
    avgScore,
    sgSeparators,
  };
}

/**
 * Get round summaries
 */
export function getRoundSummaries(shots: ProcessedShot[]): RoundSummary[] {
  const roundMap = new Map<string, ProcessedShot[]>();
  
  shots.forEach(shot => {
    const roundId = shot['Round ID'];
    if (!roundMap.has(roundId)) {
      roundMap.set(roundId, []);
    }
    roundMap.get(roundId)!.push(shot);
  });
  
  const summaries: RoundSummary[] = [];
  
  roundMap.forEach((roundShots, roundId) => {
    const firstShot = roundShots[0];
    // Use calculated SG from benchmark
    const totalSG = roundShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    
    // Count fairways
    const drives = roundShots.filter(s => s.shotType === 'Drive' && s.holePar >= 4);
    const fairwaysHit = drives.filter(s => s['Ending Lie'] === 'Fairway').length;
    
    // Count GIR
    const approaches = roundShots.filter(s => s.shotType === 'Approach');
    const gir = approaches.filter(s => s['Ending Lie'] === 'Green').length;
    
    // Count penalties
    const penalties = roundShots.filter(s => s.Penalty === 'Yes').length;
    
    summaries.push({
      roundId,
      date: firstShot.Date,
      course: firstShot.Course,
      totalShots: roundShots.length,
      strokesGained: totalSG,
      avgStrokesGained: totalSG / roundShots.length,
      fairwaysHit,
      fairwaysTotal: drives.length,
      gir,
      girTotal: approaches.length,
      penalties,
    });
  });
  
  // Sort by date
  summaries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return summaries;
}

/**
 * Calculate Strokes Gained Separators by distance buckets
 * 
 * SG Driving - All Drive shots
 * SG Short shots 0-35 yards - Starting distance 0-35 yards
 * SG Short Approach 100-150 - Starting distance 100-150 yards  
 * SG Distance Wedges 50-100 - Starting distance 50-100 yards
 * SG Putting 5-12 feet - Putts from 5-12 feet (60-144 inches)
 */
export function calculateSGSeparators(shots: ProcessedShot[]): SGSeparator[] {
  // SG Driving - All Drive shots
  const drivingShots = shots.filter(s => s.shotType === 'Drive');
  const drivingSG = drivingShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  // SG Short shots 0-35 yards - Shot type Short Game + Starting distance 0-35 yards
  const shortShots0to35 = shots.filter(s => {
    if (s.shotType !== 'Short Game') return false;
    const startDist = s['Starting Distance'];
    return startDist >= 0 && startDist <= 35;
  });
  const shortShots0to35SG = shortShots0to35.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  // SG Short Approach 100-150 - Shot type Approach + Starting distance 100-150 yards
  const shortApproach100to150 = shots.filter(s => {
    if (s.shotType !== 'Approach') return false;
    const startDist = s['Starting Distance'];
    return startDist >= 100 && startDist <= 150;
  });
  const shortApproach100to150SG = shortApproach100to150.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  // SG Distance Wedges 50-100 - Shot type Approach + Starting distance 50-100 yards
  const distanceWedges50to100 = shots.filter(s => {
    if (s.shotType !== 'Approach') return false;
    const startDist = s['Starting Distance'];
    return startDist >= 50 && startDist <= 100;
  });
  const distanceWedges50to100SG = distanceWedges50to100.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  // SG Putting 5-12 feet - Putts from 5-12 feet
  const putting5to12 = shots.filter(s => {
    if (s.shotType !== 'Putt') return false;
    const startDist = s['Starting Distance'];
    return startDist >= 5 && startDist <= 12;
  });
  const putting5to12SG = putting5to12.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  
  const separators: SGSeparator[] = [
    {
      label: 'Driving',
      description: 'All drives',
      totalShots: drivingShots.length,
      strokesGained: drivingSG,
      avgStrokesGained: drivingShots.length > 0 ? drivingSG / drivingShots.length : 0,
    },
    {
      label: 'Short Shots',
      description: '0-35 yards',
      totalShots: shortShots0to35.length,
      strokesGained: shortShots0to35SG,
      avgStrokesGained: shortShots0to35.length > 0 ? shortShots0to35SG / shortShots0to35.length : 0,
    },
    {
      label: 'Short Approach',
      description: '100-150 yards',
      totalShots: shortApproach100to150.length,
      strokesGained: shortApproach100to150SG,
      avgStrokesGained: shortApproach100to150.length > 0 ? shortApproach100to150SG / shortApproach100to150.length : 0,
    },
    {
      label: 'Distance Wedges',
      description: '50-100 yards',
      totalShots: distanceWedges50to100.length,
      strokesGained: distanceWedges50to100SG,
      avgStrokesGained: distanceWedges50to100.length > 0 ? distanceWedges50to100SG / distanceWedges50to100.length : 0,
    },
    {
      label: 'Putting',
      description: '5-12 feet',
      totalShots: putting5to12.length,
      strokesGained: putting5to12SG,
      avgStrokesGained: putting5to12.length > 0 ? putting5to12SG / putting5to12.length : 0,
    },
  ];
  
  return separators;
}

/**
 * Calculate moving average for a series of values
 * @param values - Array of numeric values
 * @param window - Window size for moving average
 * @returns Array with moving average values (null for first window-1 elements)
 */
export function calculateMovingAverage(values: number[], window: number): (number | null)[] {
  if (values.length === 0 || window <= 0) {
    return [];
  }
  
  const result: (number | null)[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      // Not enough data points for a full window
      result.push(null);
    } else {
      // Calculate average of last 'window' values
      let sum = 0;
      for (let j = 0; j < window; j++) {
        sum += values[i - j];
      }
      result.push(sum / window);
    }
  }
  
  return result;
}

/**
 * Map shot category string to internal shot types
 */
function getShotTypesForCategory(category: SGShotCategory): ShotType[] {
  switch (category) {
    case 'Driving':
      return ['Drive'];
    case 'Approach':
      return ['Approach'];
    case 'Short Game':
      return ['Short Game'];
    case 'Putting':
      return ['Putt'];
    default:
      return [];
  }
}

/**
 * Check if a shot is Out of Bounds (OB)
 * OB: Ending lie and distance is the same as starting lie and distance AND shot has a penalty
 */
export function isOutOfBounds(shot: ProcessedShot): boolean {
  if (shot.Penalty !== 'Yes') {
    return false;
  }
  return shot['Starting Lie'] === shot['Ending Lie'] && 
         shot['Starting Distance'] === shot['Ending Distance'];
}

/**
 * Calculate 75th percentile of an array of numbers
 */
function calculate75thPercentile(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate driving metrics from processed shots
 * - Penalty Rate: Total penalties / Total drives (as percentage)
 * - OB penalties count as 2 strokes for the rate display, but count as 1 for the ratio
 */
export function calculateDrivingMetrics(shots: ProcessedShot[]): DrivingMetrics {
  // Filter to only drives
  const drives = shots.filter(s => s.shotType === 'Drive');
  
  if (drives.length === 0) {
    return {
      totalDrives: 0,
      fairwaysHit: 0,
      fairwayPct: 0,
      drivingSG: 0,
      avgDrivingSG: 0,
      drivingDistance75th: 0,
      totalPenalties: 0,
      obPenalties: 0,
      otherPenalties: 0,
      penaltyRate: 0,
      sgPenalties: 0,
      fairwayPctDriver: 0,
      fairwayPctNonDriver: 0,
      positiveSGPct: 0,
    };
  }
  
  // Calculate fairways (drives that ended in Fairway)
  const fairwaysHit = drives.filter(d => d['Ending Lie'] === 'Fairway').length;
  const fairwayPct = (fairwaysHit / drives.length) * 100;
  
  // Calculate fairway % by driver type
  // Driver: Did not hit driver = No (or empty/undefined)
  // Non-Driver: Did not hit driver = Yes
  const driverDrives = drives.filter(d => d['Did not Hit Driver'] !== 'Yes');
  const nonDriverDrives = drives.filter(d => d['Did not Hit Driver'] === 'Yes');
  
  const driverFairways = driverDrives.filter(d => d['Ending Lie'] === 'Fairway').length;
  const nonDriverFairways = nonDriverDrives.filter(d => d['Ending Lie'] === 'Fairway').length;
  
  const fairwayPctDriver = driverDrives.length > 0 ? (driverFairways / driverDrives.length) * 100 : 0;
  const fairwayPctNonDriver = nonDriverDrives.length > 0 ? (nonDriverFairways / nonDriverDrives.length) * 100 : 0;
  
  // Calculate driving SG
  const drivingSG = drives.reduce((sum, d) => sum + d.calculatedStrokesGained, 0);
  const avgDrivingSG = drivingSG / drives.length;
  
  // Calculate 75th percentile of driving distances
  // For each drive, calculate the absolute difference between starting and ending distance
  const drivingDistances = drives
    .map(d => Math.abs(d['Starting Distance'] - d['Ending Distance']))
    .filter(d => d > 0); // Filter out drives where distance didn't change (likely penalties)
  const drivingDistance75th = calculate75thPercentile(drivingDistances);
  
  // Calculate penalties
  let totalPenalties = 0;
  let obPenalties = 0;
  let otherPenalties = 0;
  let sgPenalties = 0; // Total SG for drives with a penalty shot
  
  drives.forEach(drive => {
    if (drive.Penalty === 'Yes') {
      totalPenalties++;
      sgPenalties += drive.calculatedStrokesGained;
      if (isOutOfBounds(drive)) {
        obPenalties++;
      } else {
        otherPenalties++;
      }
    }
  });
  
  // Penalty rate: (OB penalties × 2 + Other penalties × 1) / Total drives (as percentage)
  const weightedPenalties = (obPenalties * 2) + (otherPenalties * 1);
  const penaltyRate = (weightedPenalties / drives.length) * 100;
  
  // Calculate % of drives with SG > 0
  const positiveDrives = drives.filter(d => d.calculatedStrokesGained > 0).length;
  const positiveSGPct = (positiveDrives / drives.length) * 100;

  return {
    totalDrives: drives.length,
    fairwaysHit,
    fairwayPct,
    drivingSG,
    avgDrivingSG,
    drivingDistance75th,
    totalPenalties,
    obPenalties,
    otherPenalties,
    penaltyRate,
    sgPenalties,
    fairwayPctDriver,
    fairwayPctNonDriver,
    positiveSGPct,
  };
}

/**
 * Get strokes gained data by round for a specific shot category
 * @param shots - Processed shots
 * @param category - Shot category (Driving, Approach, Short Game, Putting)
 * @returns Array of round-level SG data sorted by date
 */
export function getRoundSGByShotType(shots: ProcessedShot[], category: SGShotCategory): SGRoundData[] {
  const shotTypes = getShotTypesForCategory(category);
  
  // Filter shots by category
  const filteredShots = shots.filter(s => shotTypes.includes(s.shotType));
  
  // Group by round
  const roundMap = new Map<string, ProcessedShot[]>();
  
  filteredShots.forEach(shot => {
    const roundId = shot['Round ID'];
    if (!roundMap.has(roundId)) {
      roundMap.set(roundId, []);
    }
    roundMap.get(roundId)!.push(shot);
  });
  
  // Convert to array and sort by date
  const roundData: SGRoundData[] = [];
  
  roundMap.forEach((roundShots, roundId) => {
    if (roundShots.length === 0) return;
    
    const firstShot = roundShots[0];
    const totalSG = roundShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    
    roundData.push({
      roundId,
      roundNumber: 0, // Will be assigned after sorting
      date: firstShot.Date,
      course: firstShot.Course,
      strokesGained: totalSG,
      shotCount: roundShots.length,
      avgStrokesGained: totalSG / roundShots.length,
    });
  });
  
  // Sort by date ascending
  roundData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Assign round numbers
  roundData.forEach((data, index) => {
    data.roundNumber = index + 1;
  });
  
  return roundData;
}

/**
 * Normalize ending lie to standard categories
 * Maps various possible ending lie values to our defined categories
 */
function normalizeEndingLie(endingLie: string): DriveEndingLocationType {
  const lie = endingLie?.trim() || '';
  
  if (lie === 'Fairway') return 'Fairway';
  if (lie === 'Rough') return 'Rough';
  if (lie === 'Sand') return 'Sand';
  if (lie === 'Green') return 'Green';
  if (lie === 'Tee') return 'Other';
  if (lie === 'Recovery') return 'Other';
  
  // Check for OB (Out of Bounds)
  if (lie.toLowerCase().includes('out') || lie.toLowerCase().includes('ob')) {
    return 'Out of Bounds';
  }
  
  // Check for water/hazard
  if (lie.toLowerCase().includes('water') || lie.toLowerCase().includes('hazard') || lie.toLowerCase().includes('penalty')) {
    return 'Water';
  }
  
  return 'Other';
}

/**
 * Calculate drive ending location breakdown
 * Returns data for donut chart showing percentage of drives by ending location
 */
export function calculateDriveEndingLocations(shots: ProcessedShot[]): DriveEndingLocationData[] {
  const drives = shots.filter(s => s.shotType === 'Drive');
  
  if (drives.length === 0) {
    return [];
  }
  
  // Count drives by ending location
  const locationCounts = new Map<DriveEndingLocationType, { count: number; sgTotal: number }>();
  
  drives.forEach(drive => {
    const normalizedLocation = normalizeEndingLie(drive['Ending Lie']);
    const current = locationCounts.get(normalizedLocation) || { count: 0, sgTotal: 0 };
    locationCounts.set(normalizedLocation, {
      count: current.count + 1,
      sgTotal: current.sgTotal + drive.calculatedStrokesGained
    });
  });
  
  // Convert to array with percentages
  const result: DriveEndingLocationData[] = [];
  
  locationCounts.forEach((data, location) => {
    result.push({
      location,
      count: data.count,
      percentage: (data.count / drives.length) * 100,
      strokesGained: data.sgTotal,
      avgStrokesGained: data.count > 0 ? data.sgTotal / data.count : 0,
    });
  });
  
  // Sort by count descending
  result.sort((a, b) => b.count - a.count);
  
  return result;
}

/**
 * Calculate drive distance analysis by distance ranges
 * Returns data for bar/line chart showing SG and score differential by distance
 */
export function calculateDriveDistanceAnalysis(shots: ProcessedShot[]): DriveDistanceRange[] {
  const drives = shots.filter(s => s.shotType === 'Drive');
  
  if (drives.length === 0) {
    return [];
  }
  
  // Define distance ranges (in yards)
  const distanceRanges = [
    { label: '< 200', minDistance: 0, maxDistance: 200 },
    { label: '200-225', minDistance: 200, maxDistance: 225 },
    { label: '225-250', minDistance: 225, maxDistance: 250 },
    { label: '250-275', minDistance: 250, maxDistance: 275 },
    { label: '275-300', minDistance: 275, maxDistance: 300 },
    { label: '300+', minDistance: 300, maxDistance: 9999 },
  ];
  
  // Calculate drive distance for each drive
  const drivesWithDistance = drives.map(drive => {
    const distance = Math.abs(drive['Starting Distance'] - drive['Ending Distance']);
    return {
      ...drive,
      driveDistance: distance
    };
  });
  
  // Calculate metrics for each distance range
  const result: DriveDistanceRange[] = distanceRanges.map(range => {
    const rangeDrives = drivesWithDistance.filter(
      d => d.driveDistance > range.minDistance && d.driveDistance <= range.maxDistance
    );
    
    const count = rangeDrives.length;
    const sgTotal = count > 0 ? rangeDrives.reduce((sum, d) => sum + d.calculatedStrokesGained, 0) : 0;
    
    // Calculate score differential for this range
    // Score differential = average score on holes with drives in this range vs par
    // For simplicity, we'll use SG as a proxy (negative SG = worse than benchmark)
    // Higher positive SG = better performance
    const avgSG = count > 0 ? sgTotal / count : 0;
    
    return {
      label: range.label,
      minDistance: range.minDistance,
      maxDistance: range.maxDistance,
      count,
      percentage: (count / drives.length) * 100,
      strokesGained: sgTotal,
      avgStrokesGained: avgSG,
      // Score differential is approximated from SG (positive SG = better than average = lower score)
      // Using negative of SG since lower scores are better
      scoreDifferential: -avgSG,
    };
  });
  
  // Filter out ranges with no data
  return result.filter(r => r.count > 0);
}

/**
 * Calculate complete driving analysis
 */
export function calculateDrivingAnalysis(shots: ProcessedShot[]): DrivingAnalysis {
  return {
    endingLocations: calculateDriveEndingLocations(shots),
    distanceRanges: calculateDriveDistanceAnalysis(shots),
  };
}

/**
 * Calculate Problem Drive metrics - penalties and obstruction breakdown
 * - Penalties: Total, OB, Standard (non-OB)
 * - Obstruction: drives ending in Sand or Recovery
 */
export function calculateProblemDriveMetrics(shots: ProcessedShot[]): ProblemDriveMetrics {
  // Default return if no shots
  const defaultMetrics: ProblemDriveMetrics = {
    totalDrives: 0,
    totalPenalties: 0,
    obPenalties: 0,
    standardPenalties: 0,
    penaltyPct: 0,
    penaltySG: 0,
    obPenaltyPct: 0,
    obPenaltySG: 0,
    standardPenaltyPct: 0,
    standardPenaltySG: 0,
    obstructionCount: 0,
    obstructionPct: 0,
    obstructionSG: 0,
    sandCount: 0,
    sandPct: 0,
    sandSG: 0,
    recoveryCount: 0,
    recoveryPct: 0,
    recoverySG: 0,
  };

  // Get all drives
  const drives = shots.filter(s => s.shotType === 'Drive');

  if (drives.length === 0) {
    return defaultMetrics;
  }

  // Initialize counters
  let totalPenalties = 0;
  let obPenalties = 0;
  let standardPenalties = 0;
  let penaltySG = 0;
  let obPenaltySG = 0;
  let standardPenaltySG = 0;

  let sandCount = 0;
  let sandSG = 0;
  let recoveryCount = 0;
  let recoverySG = 0;

  // Process each drive
  drives.forEach(drive => {
    // Check for penalties
    if (drive.Penalty === 'Yes') {
      totalPenalties++;
      penaltySG += drive.calculatedStrokesGained;

      // Check if OB
      if (isOutOfBounds(drive)) {
        obPenalties++;
        obPenaltySG += drive.calculatedStrokesGained;
      } else {
        standardPenalties++;
        standardPenaltySG += drive.calculatedStrokesGained;
      }
    }

    // Check for Sand
    if (drive['Ending Lie'] === 'Sand') {
      sandCount++;
      sandSG += drive.calculatedStrokesGained;
    }

    // Check for Recovery (drive ending in recovery lie)
    if (drive['Ending Lie'] === 'Recovery') {
      recoveryCount++;
      recoverySG += drive.calculatedStrokesGained;
    }
  });

  // Calculate obstruction (sand + recovery)
  const obstructionCount = sandCount + recoveryCount;
  const obstructionSG = sandSG + recoverySG;

  // Calculate percentages
  const penaltyPct = (totalPenalties / drives.length) * 100;
  const obPenaltyPct = (obPenalties / drives.length) * 100;
  const standardPenaltyPct = (standardPenalties / drives.length) * 100;
  const obstructionPct = (obstructionCount / drives.length) * 100;
  const sandPct = (sandCount / drives.length) * 100;
  const recoveryPct = (recoveryCount / drives.length) * 100;

  return {
    totalDrives: drives.length,
    totalPenalties,
    obPenalties,
    standardPenalties,
    penaltyPct,
    penaltySG,
    obPenaltyPct,
    obPenaltySG,
    standardPenaltyPct,
    standardPenaltySG,
    obstructionCount,
    obstructionPct,
    obstructionSG,
    sandCount,
    sandPct,
    sandSG,
    recoveryCount,
    recoveryPct,
    recoverySG,
  };
}

/**
 * Calculate Approach metrics
 * - Total SG Approach
 * - Green Hit % = % of Approach shots with ending lie = Green
 * - Proximity < 150 = average proximity of approach shots <= 150 yards
 */
export function calculateApproachMetrics(shots: ProcessedShot[]): ApproachMetrics {
  // Filter to only approach shots
  const approaches = shots.filter(s => s.shotType === 'Approach');
  
  if (approaches.length === 0) {
    return {
      totalApproaches: 0,
      approachSG: 0,
      avgApproachSG: 0,
      positiveSGPct: 0,
      positiveSGCount: 0,
      greenHitPct: 0,
      greenHits: 0,
      greenHitPctFairway: 0,
      greenHitsFairway: 0,
      totalApproachesFairway: 0,
      greenHitPctRough: 0,
      greenHitsRough: 0,
      totalApproachesRough: 0,
      proximityUnder150: 0,
      proximityUnder150Count: 0,
      proximityUnder150OnGreen: 0,
      proximityUnder150OnGreenCount: 0,
      within20FeetPct: 0,
      within20FeetCount: 0,
      approachesOver150: 0,
      approachesUnder150: 0,
      greenHitPctOver150: 0,
      greenHitPctUnder150: 0,
    };
  }
  
  // Total SG - Approach
  const approachSG = approaches.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const avgApproachSG = approachSG / approaches.length;
  
  // % of approaches with SG > 0
  const positiveSGCount = approaches.filter(s => s.calculatedStrokesGained > 0).length;
  const positiveSGPct = (positiveSGCount / approaches.length) * 100;
  
  // Green Hit % - approaches ending on Green
  const greenHits = approaches.filter(s => s['Ending Lie'] === 'Green').length;
  const greenHitPct = (greenHits / approaches.length) * 100;
  
  // Green Hit % by starting lie (Fairway, Rough)
  const approachesFairway = approaches.filter(s => s['Starting Lie'] === 'Fairway');
  const approachesRough = approaches.filter(s => s['Starting Lie'] === 'Rough');
  
  const greenHitsFairway = approachesFairway.filter(s => s['Ending Lie'] === 'Green').length;
  const greenHitsRough = approachesRough.filter(s => s['Ending Lie'] === 'Green').length;
  
  const totalApproachesFairway = approachesFairway.length;
  const totalApproachesRough = approachesRough.length;
  
  const greenHitPctFairway = totalApproachesFairway > 0 
    ? (greenHitsFairway / totalApproachesFairway) * 100 
    : 0;
  
  const greenHitPctRough = totalApproachesRough > 0 
    ? (greenHitsRough / totalApproachesRough) * 100 
    : 0;
  
  // Proximity < 150 - average proximity for approaches <= 150 yards
  // Proximity = ending distance from hole (Ending Distance)
  // Note: For shots NOT on green, ending distance is in YARDS and needs to be converted to FEET (x3)
  // For shots on green, ending distance is already in FEET
  const approachesUnder150 = approaches.filter(s => s['Starting Distance'] <= 150);
  const approachesOver150 = approaches.filter(s => s['Starting Distance'] > 150);
  
  const proximityUnder150Count = approachesUnder150.length;
  // Convert yards to feet for shots not on green
  const proximityUnder150 = proximityUnder150Count > 0 
    ? approachesUnder150.reduce((sum, s) => {
        const endingDist = s['Ending Distance'];
        // If not on green, distance is in yards - convert to feet
        const distInFeet = s['Ending Lie'] === 'Green' ? endingDist : endingDist * 3;
        return sum + distInFeet;
      }, 0) / proximityUnder150Count 
    : 0;
  
  // Proximity < 150 on Green - average proximity for approaches <= 150 yards that ended on green
  const approachesUnder150OnGreen = approachesUnder150.filter(s => s['Ending Lie'] === 'Green');
  const proximityUnder150OnGreenCount = approachesUnder150OnGreen.length;
  // For green shots, ending distance is already in feet
  const proximityUnder150OnGreen = proximityUnder150OnGreenCount > 0 
    ? approachesUnder150OnGreen.reduce((sum, s) => sum + s['Ending Distance'], 0) / proximityUnder150OnGreenCount 
    : 0;
  
  // Within 20 feet - % of approaches ending on the green within 20 feet of the hole
  // Only include shots that end on the green (already in feet)
  const within20FeetOnGreen = approaches.filter(s => s['Ending Lie'] === 'Green' && s['Ending Distance'] <= 20);
  const within20FeetCount = within20FeetOnGreen.length;
  const within20FeetPct = (within20FeetCount / approaches.length) * 100;
  
  // Green hit % by distance
  const greenHitsUnder150 = approachesUnder150.filter(s => s['Ending Lie'] === 'Green').length;
  const greenHitsOver150 = approachesOver150.filter(s => s['Ending Lie'] === 'Green').length;
  
  const greenHitPctUnder150 = approachesUnder150.length > 0 
    ? (greenHitsUnder150 / approachesUnder150.length) * 100 
    : 0;
  
  const greenHitPctOver150 = approachesOver150.length > 0 
    ? (greenHitsOver150 / approachesOver150.length) * 100 
    : 0;
  
  return {
    totalApproaches: approaches.length,
    approachSG,
    avgApproachSG,
    positiveSGPct,
    positiveSGCount,
    greenHitPct,
    greenHits,
    greenHitPctFairway,
    greenHitsFairway,
    totalApproachesFairway,
    greenHitPctRough,
    greenHitsRough,
    totalApproachesRough,
    proximityUnder150,
    proximityUnder150Count,
    proximityUnder150OnGreen,
    proximityUnder150OnGreenCount,
    within20FeetPct,
    within20FeetCount,
    approachesOver150: approachesOver150.length,
    approachesUnder150: approachesUnder150.length,
    greenHitPctOver150,
    greenHitPctUnder150,
  };
}

/**
 * Calculate Approach by Distance metrics
 * - Filter to approach shots from Tee and Fairway only
 * - Group by distance buckets
 * - Calculate SG, Green %, and Proximity for each bucket
 * 
 * Distance buckets:
 * - 51-100 yards: Distance Wedges
 * - 101-150 yards: Short Approach
 * - 151-200 yards: Medium Approach
 * - 201-225 yards: Long Approach
 */
export function calculateApproachByDistance(shots: ProcessedShot[]): ApproachDistanceBucket[] {
  // Filter to approach shots from Tee and Fairway only
  const approachShots = shots.filter(s => 
    s.shotType === 'Approach' && 
    (s['Starting Lie'] === 'Tee' || s['Starting Lie'] === 'Fairway')
  );
  
  // Define distance buckets
  const buckets = [
    { label: 'Distance Wedges', description: '51-100 yards', minDistance: 51, maxDistance: 100 },
    { label: 'Short Approach', description: '101-150 yards', minDistance: 101, maxDistance: 150 },
    { label: 'Medium Approach', description: '151-200 yards', minDistance: 151, maxDistance: 200 },
    { label: 'Long Approach', description: '201-225 yards', minDistance: 201, maxDistance: 225 },
  ];
  
  // Calculate metrics for each bucket
  const results: ApproachDistanceBucket[] = buckets.map(bucket => {
    const bucketShots = approachShots.filter(s => 
      s['Starting Distance'] >= bucket.minDistance && 
      s['Starting Distance'] <= bucket.maxDistance
    );
    
    const totalShots = bucketShots.length;
    
    // Calculate SG
    const strokesGained = totalShots > 0 
      ? bucketShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0)
      : 0;
    const avgStrokesGained = totalShots > 0 ? strokesGained / totalShots : 0;
    
    // Calculate Green Hit %
    const greenHits = bucketShots.filter(s => s['Ending Lie'] === 'Green').length;
    const greenHitPct = totalShots > 0 ? (greenHits / totalShots) * 100 : 0;
    
    // Calculate Proximity
    // Shots on green: ending distance is already in feet
    // Shots not on green: ending distance is in yards, convert to feet (×3)
    const proximity = totalShots > 0 
      ? bucketShots.reduce((sum, s) => {
          const endingDist = s['Ending Distance'];
          // If not on green, distance is in yards - convert to feet
          const distInFeet = s['Ending Lie'] === 'Green' ? endingDist : endingDist * 3;
          return sum + distInFeet;
        }, 0) / totalShots
      : 0;
    
    // Proximity on green only
    const greenShots = bucketShots.filter(s => s['Ending Lie'] === 'Green');
    const proximityOnGreen = greenShots.length > 0 
      ? greenShots.reduce((sum, s) => sum + s['Ending Distance'], 0) / greenShots.length
      : 0;
    
    return {
      label: bucket.label,
      description: bucket.description,
      minDistance: bucket.minDistance,
      maxDistance: bucket.maxDistance,
      totalShots,
      strokesGained,
      avgStrokesGained,
      greenHits,
      greenHitPct,
      proximity,
      proximityOnGreen,
    };
  });
  
  // Filter out buckets with no shots
  return results.filter(b => b.totalShots > 0);
}

/**
 * Calculate Approach from Rough metrics
 * - Filter to approach shots from Rough only
 * - Four buckets: 51-100, 101-150, 151-200, 201-225 yards
 * - Calculate SG, Green %, and Proximity for each bucket
 */
export function calculateApproachFromRough(shots: ProcessedShot[]): ApproachDistanceBucket[] {
  // Filter to approach shots from Rough only
  const roughShots = shots.filter(s => 
    s.shotType === 'Approach' && 
    s['Starting Lie'] === 'Rough'
  );
  
  // Define four buckets (same as approach by distance)
  const buckets = [
    { label: 'Distance Wedges', description: '51-100 yards', minDistance: 51, maxDistance: 100 },
    { label: 'Short Approach', description: '101-150 yards', minDistance: 101, maxDistance: 150 },
    { label: 'Medium Approach', description: '151-200 yards', minDistance: 151, maxDistance: 200 },
    { label: 'Long Approach', description: '201-225 yards', minDistance: 201, maxDistance: 225 },
  ];
  
  // Calculate metrics for each bucket
  const results: ApproachDistanceBucket[] = buckets.map(bucket => {
    const bucketShots = roughShots.filter(s => 
      s['Starting Distance'] >= bucket.minDistance && 
      s['Starting Distance'] <= bucket.maxDistance
    );
    
    const totalShots = bucketShots.length;
    
    // Calculate SG
    const strokesGained = totalShots > 0 
      ? bucketShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0)
      : 0;
    const avgStrokesGained = totalShots > 0 ? strokesGained / totalShots : 0;
    
    // Calculate Green Hit %
    const greenHits = bucketShots.filter(s => s['Ending Lie'] === 'Green').length;
    const greenHitPct = totalShots > 0 ? (greenHits / totalShots) * 100 : 0;
    
    // Calculate Proximity (same logic as before)
    const proximity = totalShots > 0 
      ? bucketShots.reduce((sum, s) => {
          const endingDist = s['Ending Distance'];
          const distInFeet = s['Ending Lie'] === 'Green' ? endingDist : endingDist * 3;
          return sum + distInFeet;
        }, 0) / totalShots
      : 0;
    
    // Proximity on green only
    const greenShots = bucketShots.filter(s => s['Ending Lie'] === 'Green');
    const proximityOnGreen = greenShots.length > 0 
      ? greenShots.reduce((sum, s) => sum + s['Ending Distance'], 0) / greenShots.length
      : 0;
    
    return {
      label: bucket.label,
      description: bucket.description,
      minDistance: bucket.minDistance,
      maxDistance: bucket.maxDistance,
      totalShots,
      strokesGained,
      avgStrokesGained,
      greenHits,
      greenHitPct,
      proximity,
      proximityOnGreen,
    };
  });
  
  // Filter out buckets with no shots
  return results.filter(b => b.totalShots > 0);
}

/**
 * Calculate Approach Heat Map data
 * - X-axis: Distance buckets (51-100, 101-150, 151-200, 201-225 yards)
 * - Y-axis: Starting Lie (Tee, Fairway, Rough, Sand, Recovery)
 * - Cell values: Total shots and SG metrics
 * 
 * @param shots - Processed shots
 * @param totalRounds - Total number of rounds in the filter (for SG per Round calculation)
 */
export function calculateApproachHeatMapData(shots: ProcessedShot[], totalRounds: number): ApproachHeatMapData {
  // Define the 5 starting lies for Y-axis
  const lies = ['Tee', 'Fairway', 'Rough', 'Sand', 'Recovery'];
  
  // Define distance buckets for X-axis
  const distanceBuckets = [
    { label: 'Distance Wedges', minDistance: 51, maxDistance: 100 },
    { label: 'Short Approach', minDistance: 101, maxDistance: 150 },
    { label: 'Medium Approach', minDistance: 151, maxDistance: 200 },
    { label: 'Long Approach', minDistance: 201, maxDistance: 225 },
  ];
  
  // Filter to approach shots only
  const approachShots = shots.filter(s => s.shotType === 'Approach');
  
  // Build cells for each lie × distance bucket combination
  const cells: ApproachHeatMapCell[] = [];
  
  lies.forEach(lie => {
    distanceBuckets.forEach(bucket => {
      // Filter shots for this lie and distance bucket
      const cellShots = approachShots.filter(s => 
        s['Starting Lie'] === lie &&
        s['Starting Distance'] >= bucket.minDistance &&
        s['Starting Distance'] <= bucket.maxDistance
      );
      
      const totalShots = cellShots.length;
      const strokesGained = totalShots > 0 
        ? cellShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0)
        : 0;
      const sgPerRound = totalRounds > 0 ? strokesGained / totalRounds : 0;
      
      cells.push({
        lie,
        distanceBucket: bucket.label,
        minDistance: bucket.minDistance,
        maxDistance: bucket.maxDistance,
        totalShots,
        strokesGained,
        sgPerRound,
      });
    });
  });
  
  return {
    cells,
    distanceBuckets: distanceBuckets.map(b => b.label),
    lies,
    totalRounds,
  };
}

/**
 * Calculate Putting metrics from processed shots
 * - Total SG Putting: Total SG for all putts
 * - Make % 0-4 ft: % of putts made from 0-4 feet (made = ending distance is 0)
 * - Total SG 5-12 feet: Total SG for putts from 5-12 feet
 * - Poor Lag: # of first putts >20 feet with ending distance >=5 feet
 * - Speed Rating: % of first putts >=20ft with Putt Result = Long
 */
export function calculatePuttingMetrics(shots: ProcessedShot[]): PuttingMetrics {
  // Filter to only putts
  const putts = shots.filter(s => s.shotType === 'Putt');
  
  if (putts.length === 0) {
    return {
      totalSGPutting: 0,
      avgSGPutting: 0,
      totalPutts: 0,
      makePct0to4Ft: 0,
      made0to4Ft: 0,
      total0to4Ft: 0,
      totalSG5to12Ft: 0,
      avgSG5to12Ft: 0,
      total5to12Ft: 0,
      poorLagCount: 0,
      totalLagPutts: 0,
      speedRating: 0,
      longPutts: 0,
      totalLongPutts: 0,
      puttingByDistance: [],
    };
  }
  
  // Total SG for all putts
  const totalSGPutting = putts.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const avgSGPutting = totalSGPutting / putts.length;
  
  // Make % 0-4 ft - made = ending distance is 0
  const putts0to4Ft = putts.filter(s => s['Starting Distance'] <= 4);
  const total0to4Ft = putts0to4Ft.length;
  const made0to4Ft = putts0to4Ft.filter(s => s['Ending Distance'] === 0).length;
  const makePct0to4Ft = total0to4Ft > 0 ? (made0to4Ft / total0to4Ft) * 100 : 0;
  
  // Total SG 5-12 ft
  const putts5to12Ft = putts.filter(s => s['Starting Distance'] >= 5 && s['Starting Distance'] <= 12);
  const total5to12Ft = putts5to12Ft.length;
  const totalSG5to12Ft = putts5to12Ft.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const avgSG5to12Ft = total5to12Ft > 0 ? totalSG5to12Ft / total5to12Ft : 0;
  
  // For Poor Lag and Speed Rating, we need to identify first putts on each hole
  // First putt = Shot === 1 and shotType === 'Putt'
  // Group putts by hole to find first putts
  const holePuttsMap = new Map<string, ProcessedShot[]>();
  
  putts.forEach(putt => {
    const key = `${putt['Round ID']}-${putt.Hole}`;
    if (!holePuttsMap.has(key)) {
      holePuttsMap.set(key, []);
    }
    holePuttsMap.get(key)!.push(putt);
  });
  
  // Find first putts (lowest Shot number for each hole)
  const firstPutts: ProcessedShot[] = [];
  holePuttsMap.forEach((holePutts) => {
    // Sort by Shot number ascending
    const sorted = [...holePutts].sort((a, b) => a.Shot - b.Shot);
    if (sorted.length > 0) {
      firstPutts.push(sorted[0]);
    }
  });
  
  // Poor Lag: # of first putts >20 feet with ending distance >=5 feet
  const lagPutts = firstPutts.filter(s => s['Starting Distance'] > 20 && s['Ending Distance'] >= 5);
  const poorLagCount = lagPutts.length;
  const totalLagPutts = firstPutts.filter(s => s['Starting Distance'] > 20).length;
  
  // Speed Rating: % of first putts >=20ft with Putt Result = Long
  const longPutts20ft = firstPutts.filter(s => s['Starting Distance'] >= 20 && s['Putt Result'] === 'Long');
  const totalLongPutts = firstPutts.filter(s => s['Starting Distance'] >= 20).length;
  const longPutts = longPutts20ft.length;
  const speedRating = totalLongPutts > 0 ? (longPutts / totalLongPutts) * 100 : 0;
  
  // Calculate putting by distance
  const puttingByDistance = calculatePuttingByDistance(shots);

  return {
    totalSGPutting,
    avgSGPutting,
    totalPutts: putts.length,
    makePct0to4Ft,
    made0to4Ft,
    total0to4Ft,
    totalSG5to12Ft,
    avgSG5to12Ft,
    total5to12Ft,
    poorLagCount,
    totalLagPutts,
    speedRating,
    longPutts,
    totalLongPutts,
    puttingByDistance,
  };
}

/**
 * Calculate Putting by Distance metrics
 * Groups putts by starting distance buckets and calculates metrics for each
 * 
 * Distance buckets (in feet):
 * - 0-4, 5-8, 9-12, 13-20, 20-40, 40-60
 */
export function calculatePuttingByDistance(shots: ProcessedShot[]): PuttingDistanceBucket[] {
  // Filter to only putts
  const putts = shots.filter(s => s.shotType === 'Putt');
  
  // Define distance buckets
  const buckets = [
    { label: '0-4', minDistance: 0, maxDistance: 4 },
    { label: '5-8', minDistance: 5, maxDistance: 8 },
    { label: '9-12', minDistance: 9, maxDistance: 12 },
    { label: '13-20', minDistance: 13, maxDistance: 20 },
    { label: '20-40', minDistance: 20, maxDistance: 40 },
    { label: '40-60', minDistance: 40, maxDistance: 60 },
  ];
  
  // Group putts by hole to find first putts and count for 3-putts
  const holePuttsMap = new Map<string, ProcessedShot[]>();
  putts.forEach(putt => {
    const key = `${putt['Round ID']}-${putt.Hole}`;
    if (!holePuttsMap.has(key)) {
      holePuttsMap.set(key, []);
    }
    holePuttsMap.get(key)!.push(putt);
  });
  
  // Track first putts and 3-putt holes
  const firstPutts: ProcessedShot[] = [];
  const threePuttsByBucket = new Map<string, number>();
  
  holePuttsMap.forEach((holePutts) => {
    // Sort by Shot number ascending
    const sorted = [...holePutts].sort((a, b) => a.Shot - b.Shot);
    if (sorted.length > 0) {
      firstPutts.push(sorted[0]);
      
      // Check for 3-putt hole (3 or more putts)
      if (sorted.length >= 3) {
        const firstPutt = sorted[0];
        const startDist = firstPutt['Starting Distance'];
        
        // Find which bucket the first putt belongs to
        const bucket = buckets.find(b => startDist >= b.minDistance && startDist <= b.maxDistance);
        if (bucket) {
          const current = threePuttsByBucket.get(bucket.label) || 0;
          threePuttsByBucket.set(bucket.label, current + 1);
        }
      }
    }
  });
  
  // Calculate metrics for each bucket
  const results: PuttingDistanceBucket[] = buckets.map(bucket => {
    const bucketPutts = putts.filter(s => 
      s['Starting Distance'] >= bucket.minDistance && 
      s['Starting Distance'] <= bucket.maxDistance
    );
    
    const totalPutts = bucketPutts.length;
    
    // Core metrics
    const totalStrokesGained = totalPutts > 0 
      ? bucketPutts.reduce((sum, s) => sum + s.calculatedStrokesGained, 0)
      : 0;
    
    // Make % - made = ending distance is 0
    const madePutts = bucketPutts.filter(s => s['Ending Distance'] === 0).length;
    const makePct = totalPutts > 0 ? (madePutts / totalPutts) * 100 : 0;
    
    // 3 putts
    const threePutts = threePuttsByBucket.get(bucket.label) || 0;
    
    // Speed Ratio - % of putts with Putt Result = "Long"
    const longPutts = bucketPutts.filter(s => s['Putt Result'] === 'Long').length;
    const speedRatio = totalPutts > 0 ? (longPutts / totalPutts) * 100 : 0;
    
    // For buckets 13-60 ft: Proximity, Good Lag %, Poor Lag %
    const isLagBucket = bucket.minDistance >= 13;
    let proximityMissed = 0;
    let goodLagPct = 0;
    let poorLagPct = 0;
    
    if (isLagBucket && totalPutts > 0) {
      // Proximity of Missed Putts - average ending distance for missed putts
      const missedPutts = bucketPutts.filter(s => s['Ending Distance'] > 0);
      if (missedPutts.length > 0) {
        proximityMissed = missedPutts.reduce((sum, s) => sum + s['Ending Distance'], 0) / missedPutts.length;
      }
      
      // Good Lag % - % of putts <= 3 feet from hole
      const goodLagPutts = bucketPutts.filter(s => s['Ending Distance'] <= 3);
      goodLagPct = (goodLagPutts.length / totalPutts) * 100;
      
      // Poor Lag % - % of putts >= 5 feet from hole
      const poorLagPutts = bucketPutts.filter(s => s['Ending Distance'] >= 5);
      poorLagPct = (poorLagPutts.length / totalPutts) * 100;
    }
    
    return {
      label: bucket.label,
      minDistance: bucket.minDistance,
      maxDistance: bucket.maxDistance,
      totalPutts,
      totalStrokesGained,
      madePutts,
      makePct,
      threePutts,
      longPutts,
      speedRatio,
      proximityMissed,
      goodLagPct,
      poorLagPct,
    };
  });
  
  // Filter to only include buckets with data
  return results.filter(b => b.totalPutts > 0);
}

/**
 * Calculate Lag Putting metrics for the Lag Putting section
 * 
 * - Card: Avg. Leave Distance - avg ending distance for first putts >20 ft
 * - Chart 1: 3 Putts by First Putt Starting Distance - distribution of 3-putt holes
 * - Chart 2: Leave Distance Distribution - distribution of ending distances for lag putts
 */
export function calculateLagPuttingMetrics(shots: ProcessedShot[]): LagPuttingMetrics {
  // Filter to only putts
  const putts = shots.filter(s => s.shotType === 'Putt');
  
  if (putts.length === 0) {
    return {
      avgLeaveDistance: 0,
      totalLagPutts: 0,
      threePuttsByStartDistance: [],
      leaveDistanceDistribution: [],
    };
  }
  
  // Group putts by hole to find first putts
  const holePuttsMap = new Map<string, ProcessedShot[]>();
  
  putts.forEach(putt => {
    const key = `${putt['Round ID']}-${putt.Hole}`;
    if (!holePuttsMap.has(key)) {
      holePuttsMap.set(key, []);
    }
    holePuttsMap.get(key)!.push(putt);
  });
  
  // Find first putts (lowest Shot number for each hole)
  const firstPutts: ProcessedShot[] = [];
  const threePuttHoles: ProcessedShot[] = [];
  
  holePuttsMap.forEach((holePutts) => {
    // Sort by Shot number ascending
    const sorted = [...holePutts].sort((a, b) => a.Shot - b.Shot);
    if (sorted.length > 0) {
      firstPutts.push(sorted[0]);
      
      // Check for 3-putt hole (3 or more putts)
      if (sorted.length >= 3) {
        threePuttHoles.push(sorted[0]); // First putt of 3-putt hole
      }
    }
  });
  
  // Filter to lag putts (first putts >20 ft)
  const lagPutts = firstPutts.filter(s => s['Starting Distance'] > 20);
  const totalLagPutts = lagPutts.length;
  
  // Calculate avg leave distance
  const avgLeaveDistance = totalLagPutts > 0
    ? lagPutts.reduce((sum, s) => sum + s['Ending Distance'], 0) / totalLagPutts
    : 0;
  
  // Chart 1: 3 Putts by First Putt Starting Distance
  // Buckets: 0-4, 5-8, 9-12, 13-20, 20-40, 40-60
  const threePuttStartBuckets = [
    { label: '0-4', minDistance: 0, maxDistance: 4 },
    { label: '5-8', minDistance: 5, maxDistance: 8 },
    { label: '9-12', minDistance: 9, maxDistance: 12 },
    { label: '13-20', minDistance: 13, maxDistance: 20 },
    { label: '20-40', minDistance: 20, maxDistance: 40 },
    { label: '40-60', minDistance: 40, maxDistance: 60 },
  ];
  
  const threePuttsByStartDistance: LagDistanceDistribution[] = threePuttStartBuckets.map(bucket => {
    const count = threePuttHoles.filter(s => 
      s['Starting Distance'] >= bucket.minDistance && 
      s['Starting Distance'] <= bucket.maxDistance
    ).length;
    const percentage = threePuttHoles.length > 0 
      ? (count / threePuttHoles.length) * 100 
      : 0;
    return { label: bucket.label, count, percentage };
  }).filter(b => b.count > 0);
  
  // Chart 2: Leave Distance Distribution for Lag Putts
  // Buckets: 0-4, 5-8, 9-12, 13+ (13+ means 13 and beyond)
  const leaveDistanceBuckets = [
    { label: '0-4', minDistance: 0, maxDistance: 4 },
    { label: '5-8', minDistance: 5, maxDistance: 8 },
    { label: '9-12', minDistance: 9, maxDistance: 12 },
    { label: '13+', minDistance: 13, maxDistance: Infinity },
  ];
  
  const leaveDistanceDistribution: LagDistanceDistribution[] = leaveDistanceBuckets.map(bucket => {
    const count = lagPutts.filter(s => 
      s['Ending Distance'] >= bucket.minDistance && 
      (bucket.maxDistance === Infinity || s['Ending Distance'] <= bucket.maxDistance)
    ).length;
    const percentage = totalLagPutts > 0 
      ? (count / totalLagPutts) * 100 
      : 0;
    return { label: bucket.label, count, percentage };
  }).filter(b => b.count > 0);
  
  return {
    avgLeaveDistance,
    totalLagPutts,
    threePuttsByStartDistance,
    leaveDistanceDistribution,
  };
}

/**
 * Determine hole outcome based on score vs par
 * - Eagle: score = par - 2
 * - Birdie: score = par - 1
 * - Par: score = par
 * - Bogey: score = par + 1
 * - Double Bogey+: score = par + >= 2
 */
function getHoleOutcome(score: number, par: number): HoleOutcome {
  const scoreToPar = score - par;
  
  if (scoreToPar <= -2) return 'Eagle';
  if (scoreToPar === -1) return 'Birdie';
  if (scoreToPar === 0) return 'Par';
  if (scoreToPar === 1) return 'Bogey';
  return 'Double Bogey+';
}

/**
 * Calculate Par-specific scoring metrics
 */
function calculateParMetrics(shots: ProcessedShot[], par: number): ParScoringMetrics {
  // Filter shots for this par
  const parShots = shots.filter(s => s.holePar === par);
  
  // Get unique holes for this par
  const holeKeys = new Set<string>();
  parShots.forEach(shot => {
    holeKeys.add(`${shot['Round ID']}-${shot.Hole}`);
  });
  
  // Calculate metrics
  const totalHoles = holeKeys.size;
  let totalScore = 0;
  let totalSG = 0;
  
  holeKeys.forEach(key => {
    const [roundId, holeStr] = key.split('-');
    const hole = parseInt(holeStr);
    const holeShots = parShots.filter(s => s['Round ID'] === roundId && s.Hole === hole);
    
    // Score is number of shots on this hole
    const score = holeShots.length;
    totalScore += score;
    
    // Total SG for this hole
    const sg = holeShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
    totalSG += sg;
  });
  
  const avgScore = totalHoles > 0 ? totalScore / totalHoles : 0;
  const avgScoreVsPar = totalHoles > 0 ? (totalScore / totalHoles) - par : 0;
  
  return {
    par,
    totalHoles,
    totalScore,
    avgScore,
    avgScoreVsPar,
    totalStrokesGained: totalSG,
  };
}

/**
 * Calculate Scoring metrics for the Scoring tab
 * - Donut chart: hole outcome distribution (Eagle, Birdie, Par, Bogey, Double Bogey+)
 * - Three cards: Par 3, Par 4, Par 5 metrics
 */
export function calculateScoringMetrics(shots: ProcessedShot[]): ScoringMetrics {
  // Get hole scores
  const holeScores = getHoleScores(shots);
  
  // Default metrics
  const defaultParMetrics: ParScoringMetrics = {
    par: 0,
    totalHoles: 0,
    totalScore: 0,
    avgScore: 0,
    avgScoreVsPar: 0,
    totalStrokesGained: 0,
  };
  
  if (holeScores.length === 0) {
    return {
      holeOutcomes: [],
      totalHoles: 0,
      par3: { ...defaultParMetrics, par: 3 },
      par4: { ...defaultParMetrics, par: 4 },
      par5: { ...defaultParMetrics, par: 5 },
    };
  }
  
  // Count hole outcomes
  const outcomeCounts: Record<HoleOutcome, number> = {
    'Eagle': 0,
    'Birdie': 0,
    'Par': 0,
    'Bogey': 0,
    'Double Bogey+': 0,
  };
  
  holeScores.forEach(hole => {
    const outcome = getHoleOutcome(hole.score, hole.par);
    outcomeCounts[outcome]++;
  });
  
  const totalHoles = holeScores.length;
  
  // Build hole outcomes data for donut chart
  const holeOutcomes: HoleOutcomeData[] = [
    { outcome: 'Eagle' as HoleOutcome, count: outcomeCounts['Eagle'], percentage: (outcomeCounts['Eagle'] / totalHoles) * 100, scoreToPar: -2 },
    { outcome: 'Birdie' as HoleOutcome, count: outcomeCounts['Birdie'], percentage: (outcomeCounts['Birdie'] / totalHoles) * 100, scoreToPar: -1 },
    { outcome: 'Par' as HoleOutcome, count: outcomeCounts['Par'], percentage: (outcomeCounts['Par'] / totalHoles) * 100, scoreToPar: 0 },
    { outcome: 'Bogey' as HoleOutcome, count: outcomeCounts['Bogey'], percentage: (outcomeCounts['Bogey'] / totalHoles) * 100, scoreToPar: 1 },
    { outcome: 'Double Bogey+' as HoleOutcome, count: outcomeCounts['Double Bogey+'], percentage: (outcomeCounts['Double Bogey+'] / totalHoles) * 100, scoreToPar: 2 },
  ].filter(o => o.count > 0);
  
  // Calculate par-specific metrics
  const par3 = calculateParMetrics(shots, 3);
  const par4 = calculateParMetrics(shots, 4);
  const par5 = calculateParMetrics(shots, 5);
  
  return {
    holeOutcomes,
    totalHoles,
    par3,
    par4,
    par5,
  };
}

/**
 * Calculate Mental resilience metrics
 * All calculations are round-independent: each round is treated separately
 * Previous hole outcomes from Round N do NOT carry over to Round N+1
 */
export function calculateMentalMetrics(shots: ProcessedShot[], _benchmark: BenchmarkType): MentalMetrics {
  // Get hole scores
  const holeScores = getHoleScores(shots);
  
  // Default metrics
  const defaultMetrics: MentalMetrics = {
    bounceBackCount: 0,
    bounceBackTotal: 0,
    bounceBackPct: 0,
    dropOffCount: 0,
    dropOffTotal: 0,
    dropOffPct: 0,
    gasPedalCount: 0,
    gasPedalTotal: 0,
    gasPedalPct: 0,
    bogeyTrainCount: 0,
    bogeyTrainTotal: 0,
    bogeyTrainPct: 0,
    driveAfterT5FailCount: 0,
    driveAfterT5FailSG: 0,
    avgDriveSGBenchmark: 0,
    driveAfterT5FailVsBenchmark: 0,
  };
  
  if (holeScores.length === 0) {
    return defaultMetrics;
  }
  
  // Group hole scores by round
  const holesByRound = new Map<string, HoleScore[]>();
  holeScores.forEach(hole => {
    const roundId = hole.roundId;
    if (!holesByRound.has(roundId)) {
      holesByRound.set(roundId, []);
    }
    holesByRound.get(roundId)!.push(hole);
  });
  
  // Calculate metrics per round, then aggregate
  let totalBounceBackCount = 0;
  let totalBounceBackTotal = 0;  // Bogey+ opportunities
  let totalDropOffCount = 0;
  let totalDropOffTotal = 0;  // Birdie opportunities
  let totalGasPedalCount = 0;
  let totalGasPedalTotal = 0;  // Birdie+ opportunities
  let totalBogeyTrainCount = 0;
  let totalBogeyTrainTotal = 0;  // Bogey+ opportunities
  
  // Track Tiger 5 fail holes per round
  const t5FailHolesPerRound = new Map<string, Set<number>>();
  
  // First, identify Tiger 5 fail holes
  shots.forEach(shot => {
    const hole = holeScores.find(h => h.roundId === shot['Round ID'] && h.hole === shot.Hole);
    if (!hole) return;
    
    const isTiger5Fail = isTiger5FailHole(hole, shots);
    if (isTiger5Fail) {
      if (!t5FailHolesPerRound.has(shot['Round ID'])) {
        t5FailHolesPerRound.set(shot['Round ID'], new Set());
      }
      t5FailHolesPerRound.get(shot['Round ID'])!.add(shot.Hole);
    }
  });
  
  // Process each round independently
  holesByRound.forEach((roundHoles, roundId) => {
    // Sort holes by hole number
    roundHoles.sort((a, b) => a.hole - b.hole);
    
    // Get Tiger 5 fail holes for this round
    const t5Fails = t5FailHolesPerRound.get(roundId) || new Set<number>();
    
    // Process each hole in the round
    for (let i = 1; i < roundHoles.length; i++) {
      const prevHole = roundHoles[i - 1];
      const currHole = roundHoles[i];
      
      const prevOutcome = getHoleOutcome(prevHole.score, prevHole.par);
      const currOutcome = getHoleOutcome(currHole.score, currHole.par);
      
      const prevIsBogeyOrWorse = prevOutcome === 'Bogey' || prevOutcome === 'Double Bogey+';
      const prevIsBirdie = prevOutcome === 'Birdie';
      const prevIsBirdieOrBetter = prevOutcome === 'Birdie' || prevOutcome === 'Eagle';
      const currIsParOrBetter = currOutcome === 'Par' || currOutcome === 'Birdie' || currOutcome === 'Eagle';
      const currIsBogeyOrWorse = currOutcome === 'Bogey' || currOutcome === 'Double Bogey+';
      const currIsBirdieOrBetter = currOutcome === 'Birdie' || currOutcome === 'Eagle';
      
      // Bounce Back: Par or better after Bogey+
      if (prevIsBogeyOrWorse) {
        totalBounceBackTotal++;
        if (currIsParOrBetter) {
          totalBounceBackCount++;
        }
      }
      
      // Drop Off: Bogey+ after Birdie
      if (prevIsBirdie) {
        totalDropOffTotal++;
        if (currIsBogeyOrWorse) {
          totalDropOffCount++;
        }
      }
      
      // Gas Pedal: Birdie+ after Birdie+
      if (prevIsBirdieOrBetter) {
        totalGasPedalTotal++;
        if (currIsBirdieOrBetter) {
          totalGasPedalCount++;
        }
      }
      
      // Bogey Train: Bogey+ after Bogey+
      if (prevIsBogeyOrWorse) {
        totalBogeyTrainTotal++;
        if (currIsBogeyOrWorse) {
          totalBogeyTrainCount++;
        }
      }
    }
    
    // Drive after Tiger 5 Fail: For each T5 fail hole, get the drive SG on the NEXT hole
    t5Fails.forEach(failHoleNum => {
      // Find the next hole in this round
      const nextHole = roundHoles.find(h => h.hole === failHoleNum + 1);
      if (nextHole) {
        // Get the drive shot on the next hole
        const driveShot = shots.find(s => s['Round ID'] === roundId && s.Hole === nextHole.hole && s.shotType === 'Drive');
        if (driveShot) {
          // This is a drive after T5 fail
          // We count it in the aggregate below
        }
      }
    });
  });
  
  // Calculate Drive after Tiger 5 Fail metrics
  let driveAfterT5FailCount = 0;
  let driveAfterT5FailSG = 0;
  
  holesByRound.forEach((roundHoles, roundId) => {
    roundHoles.sort((a, b) => a.hole - b.hole);
    const t5Fails = t5FailHolesPerRound.get(roundId) || new Set<number>();
    
    t5Fails.forEach(failHoleNum => {
      // Find the next hole in this round (not the next hole number, but the hole with number + 1)
      const nextHole = roundHoles.find(h => h.hole === failHoleNum + 1);
      if (nextHole) {
        // Get the drive shot on the next hole
        const driveShot = shots.find(s => s['Round ID'] === roundId && s.Hole === nextHole.hole && s.shotType === 'Drive');
        if (driveShot) {
          driveAfterT5FailCount++;
          driveAfterT5FailSG += driveShot.calculatedStrokesGained;
        }
      }
    });
  });
  
  // Calculate average SG per drive for benchmark comparison
  const allDrives = shots.filter(s => s.shotType === 'Drive');
  const totalDriveSG = allDrives.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const avgDriveSG = allDrives.length > 0 ? totalDriveSG / allDrives.length : 0;
  
  const driveAfterT5FailVsBenchmark = driveAfterT5FailCount > 0 
    ? (driveAfterT5FailSG / driveAfterT5FailCount) - avgDriveSG 
    : 0;
  
  return {
    bounceBackCount: totalBounceBackCount,
    bounceBackTotal: totalBounceBackTotal,
    bounceBackPct: totalBounceBackTotal > 0 ? (totalBounceBackCount / totalBounceBackTotal) * 100 : 0,
    dropOffCount: totalDropOffCount,
    dropOffTotal: totalDropOffTotal,
    dropOffPct: totalDropOffTotal > 0 ? (totalDropOffCount / totalDropOffTotal) * 100 : 0,
    gasPedalCount: totalGasPedalCount,
    gasPedalTotal: totalGasPedalTotal,
    gasPedalPct: totalGasPedalTotal > 0 ? (totalGasPedalCount / totalGasPedalTotal) * 100 : 0,
    bogeyTrainCount: totalBogeyTrainCount,
    bogeyTrainTotal: totalBogeyTrainTotal,
    bogeyTrainPct: totalBogeyTrainTotal > 0 ? (totalBogeyTrainCount / totalBogeyTrainTotal) * 100 : 0,
    driveAfterT5FailCount,
    driveAfterT5FailSG,
    avgDriveSGBenchmark: avgDriveSG,
    driveAfterT5FailVsBenchmark,
  };
}

/**
 * Check if a hole is a Tiger 5 fail
 */
function isTiger5FailHole(hole: HoleScore, shots: ProcessedShot[]): boolean {
  const holeShots = shots.filter(s => s['Round ID'] === hole.roundId && s.Hole === hole.hole);
  
  // Check for 3 putts
  const puttCount = holeShots.filter(s => s.shotType === 'Putt').length;
  if (puttCount >= 3) return true;
  
  // Check for Bogey on Par 5
  if (hole.par === 5 && hole.score >= 6) return true;
  
  // Check for Double Bogey+
  if (hole.score >= hole.par + 2) return true;
  
  // Check for Bogey: Approach < 125
  const approachShots = holeShots.filter(s => s.shotType === 'Approach');
  for (const approach of approachShots) {
    const startDist = approach['Starting Distance'];
    const startLoc = approach['Starting Lie'];
    const shotNum = approach.Shot;
    
    const isValidLocation = ['Fairway', 'Rough', 'Sand'].includes(startLoc);
    const isValidDistance = startDist <= 125;
    
    let isValidShotNum = false;
    if (hole.par === 3 && shotNum === 1) isValidShotNum = true;
    if (hole.par === 4 && shotNum === 2) isValidShotNum = true;
    if (hole.par === 5 && (shotNum === 2 || shotNum === 3)) isValidShotNum = true;
    
    if (isValidLocation && isValidDistance && isValidShotNum && hole.score >= hole.par + 1) {
      return true;
    }
  }
  
  // Check for Missed Green (Short Game)
  const shortGameShots = holeShots.filter(s => s.shotType === 'Short Game');
  for (const sg of shortGameShots) {
    if (sg['Ending Lie'] !== 'Green') {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate bogey rate (holes where score = par + 1) overall and by par
 */
export function calculateBogeyRates(_shots: ProcessedShot[], holeScores: HoleScore[]): BogeyRateByPar[] {
  const bogeyRates: BogeyRateByPar[] = [
    { par: 0, label: 'Overall', totalHoles: 0, bogeyCount: 0, bogeyRate: 0 },
    { par: 3, label: 'Par 3', totalHoles: 0, bogeyCount: 0, bogeyRate: 0 },
    { par: 4, label: 'Par 4', totalHoles: 0, bogeyCount: 0, bogeyRate: 0 },
    { par: 5, label: 'Par 5', totalHoles: 0, bogeyCount: 0, bogeyRate: 0 },
  ];
  
  holeScores.forEach(hole => {
    const isBogey = hole.score === hole.par + 1;
    
    // Update overall
    bogeyRates[0].totalHoles++;
    if (isBogey) bogeyRates[0].bogeyCount++;
    
    // Update by par
    const parIndex = hole.par === 3 ? 1 : hole.par === 4 ? 2 : 3;
    bogeyRates[parIndex].totalHoles++;
    if (isBogey) bogeyRates[parIndex].bogeyCount++;
  });
  
  // Calculate percentages
  bogeyRates.forEach(rate => {
    if (rate.totalHoles > 0) {
      rate.bogeyRate = (rate.bogeyCount / rate.totalHoles) * 100;
    }
  });
  
  return bogeyRates;
}

/**
 * Calculate Birdie Opportunities and Conversion Rate
 * Birdie Opportunity: GIR with resulting putt <= 20 feet
 * Conversion: Birdies made / Opportunities
 */
export function calculateBirdieOpportunities(shots: ProcessedShot[], _holeScores: HoleScore[]): BirdieOpportunityMetrics {
  const result: BirdieOpportunityMetrics = {
    opportunities: 0,
    conversions: 0,
    conversionPct: 0,
  };
  
  // Group shots by hole
  const holeMap = new Map<string, ProcessedShot[]>();
  shots.forEach(shot => {
    const key = `${shot['Round ID']}-${shot.Hole}`;
    if (!holeMap.has(key)) {
      holeMap.set(key, []);
    }
    holeMap.get(key)!.push(shot);
  });
  
  holeMap.forEach((holeShots, _key) => {
    // Find GIR: shot with starting lie "Green" that would give score = par - 1
    const firstShot = holeShots[0];
    const par = firstShot.holePar;
    const score = holeShots.length;
    
    // Check if this is a GIR (Green in Regulation)
    // GIR means: on a par 3, you hit the green in 1; par 4 in 2; par 5 in 3
    
    // Find the shot that landed on green
    const girShot = holeShots.find(s => s['Starting Lie'] === 'Green');
    
    if (girShot) {
      // This is a GIR - now check if putt was <= 20 feet
      const puttShots = holeShots.filter(s => s.shotType === 'Putt');
      
      // Find the first putt after GIR (the birdie putt)
      const girShotIndex = holeShots.indexOf(girShot);
      const birdiePutts = puttShots.filter(p => holeShots.indexOf(p) > girShotIndex);
      
      if (birdiePutts.length > 0) {
        const firstBirdiePutt = birdiePutts[0];
        const puttDistance = firstBirdiePutt['Starting Distance'];
        
        // Birdie Opportunity: putt <= 20 feet (240 inches)
        if (puttDistance <= 240) {
          result.opportunities++;
          
          // Check if birdie was made
          if (score === par - 1) {
            result.conversions++;
          }
        }
      }
    }
  });
  
  if (result.opportunities > 0) {
    result.conversionPct = (result.conversions / result.opportunities) * 100;
  }
  
  return result;
}

/**
 * Determine the root cause category for a failed hole
 */
function categorizeRootCause(holeShots: ProcessedShot[], holePar: number): { category: string; strokesGained: number } {
  // Find the shot with worst strokes gained (most negative)
  let worstShot: ProcessedShot | null = null;
  let worstSG = 0;
  
  // Calculate SG for each shot and find the worst
  for (const shot of holeShots) {
    if (shot.calculatedStrokesGained !== undefined && shot.calculatedStrokesGained < worstSG) {
      worstSG = shot.calculatedStrokesGained;
      worstShot = shot;
    }
  }
  
  if (!worstShot) {
    return { category: 'recovery', strokesGained: 0 };
  }
  
  // Categorize based on shot type and distance
  const shotType = worstShot.shotType;
  const startDist = worstShot['Starting Distance'];
  
  // Check for penalties first (Penalty column in raw data)
  if (worstShot.Penalty === 'Yes' || worstShot.Penalty === 'y') {
    return { category: 'penalties', strokesGained: worstShot.calculatedStrokesGained };
  }
  
  // Driving (typically first shot on par 4/5)
  if (worstShot.Shot === 1 && holePar >= 4) {
    return { category: 'driving', strokesGained: worstShot.calculatedStrokesGained };
  }
  
  // Approach shots (2 on par 4, 2-3 on par 5)
  if (shotType === 'Approach') {
    return { category: 'approach', strokesGained: worstShot.calculatedStrokesGained };
  }
  
  // Putting
  if (shotType === 'Putt') {
    // Lag putts: 20+ feet (240+ inches)
    if (startDist >= 240) {
      return { category: 'lagPutts', strokesGained: worstShot.calculatedStrokesGained };
    }
    // Makeable putts: 0-20 feet
    return { category: 'makeablePutts', strokesGained: worstShot.calculatedStrokesGained };
  }
  
  // Short Game (around the green, not on green)
  if (shotType === 'Short Game') {
    return { category: 'shortGame', strokesGained: worstShot.calculatedStrokesGained };
  }
  
  // Recovery shots (tee shots on par 3, etc.)
  return { category: 'recovery', strokesGained: worstShot.calculatedStrokesGained };
}

/**
 * Calculate root cause breakdown for bogeys (score = par + 1)
 */
export function calculateBogeyRootCause(shots: ProcessedShot[], holeScores: HoleScore[]): ScoringRootCause {
  const rootCause: ScoringRootCause = {
    penalties: 0,
    penaltiesSG: 0,
    driving: 0,
    drivingSG: 0,
    approach: 0,
    approachSG: 0,
    lagPutts: 0,
    lagPuttsSG: 0,
    makeablePutts: 0,
    makeablePuttsSG: 0,
    shortGame: 0,
    shortGameSG: 0,
    recovery: 0,
    recoverySG: 0,
  };
  
  // Filter to bogey holes
  const bogeyHoles = holeScores.filter(h => h.score === h.par + 1);
  
  if (bogeyHoles.length === 0) {
    return rootCause;
  }
  
  // Group shots by hole
  const holeMap = new Map<string, ProcessedShot[]>();
  shots.forEach(shot => {
    const key = `${shot['Round ID']}-${shot.Hole}`;
    if (!holeMap.has(key)) {
      holeMap.set(key, []);
    }
    holeMap.get(key)!.push(shot);
  });
  
  bogeyHoles.forEach(hole => {
    const holeKey = `${hole.roundId}-${hole.hole}`;
    const holeShots = holeMap.get(holeKey);
    
    if (holeShots && holeShots.length > 0) {
      const { category, strokesGained } = categorizeRootCause(holeShots, hole.par);
      
      switch (category) {
        case 'penalties':
          rootCause.penalties++;
          rootCause.penaltiesSG += strokesGained;
          break;
        case 'driving':
          rootCause.driving++;
          rootCause.drivingSG += strokesGained;
          break;
        case 'approach':
          rootCause.approach++;
          rootCause.approachSG += strokesGained;
          break;
        case 'lagPutts':
          rootCause.lagPutts++;
          rootCause.lagPuttsSG += strokesGained;
          break;
        case 'makeablePutts':
          rootCause.makeablePutts++;
          rootCause.makeablePuttsSG += strokesGained;
          break;
        case 'shortGame':
          rootCause.shortGame++;
          rootCause.shortGameSG += strokesGained;
          break;
        case 'recovery':
          rootCause.recovery++;
          rootCause.recoverySG += strokesGained;
          break;
      }
    }
  });
  
  return rootCause;
}

/**
 * Calculate root cause breakdown for double bogeys+ (score >= par + 2)
 */
export function calculateDoubleBogeyPlusRootCause(shots: ProcessedShot[], holeScores: HoleScore[]): ScoringRootCause {
  const rootCause: ScoringRootCause = {
    penalties: 0,
    penaltiesSG: 0,
    driving: 0,
    drivingSG: 0,
    approach: 0,
    approachSG: 0,
    lagPutts: 0,
    lagPuttsSG: 0,
    makeablePutts: 0,
    makeablePuttsSG: 0,
    shortGame: 0,
    shortGameSG: 0,
    recovery: 0,
    recoverySG: 0,
  };
  
  // Filter to double bogey+ holes
  const doubleBogeyPlusHoles = holeScores.filter(h => h.score >= h.par + 2);
  
  if (doubleBogeyPlusHoles.length === 0) {
    return rootCause;
  }
  
  // Group shots by hole
  const holeMap = new Map<string, ProcessedShot[]>();
  shots.forEach(shot => {
    const key = `${shot['Round ID']}-${shot.Hole}`;
    if (!holeMap.has(key)) {
      holeMap.set(key, []);
    }
    holeMap.get(key)!.push(shot);
  });
  
  doubleBogeyPlusHoles.forEach(hole => {
    const holeKey = `${hole.roundId}-${hole.hole}`;
    const holeShots = holeMap.get(holeKey);
    
    if (holeShots && holeShots.length > 0) {
      const { category, strokesGained } = categorizeRootCause(holeShots, hole.par);
      
      switch (category) {
        case 'penalties':
          rootCause.penalties++;
          rootCause.penaltiesSG += strokesGained;
          break;
        case 'driving':
          rootCause.driving++;
          rootCause.drivingSG += strokesGained;
          break;
        case 'approach':
          rootCause.approach++;
          rootCause.approachSG += strokesGained;
          break;
        case 'lagPutts':
          rootCause.lagPutts++;
          rootCause.lagPuttsSG += strokesGained;
          break;
        case 'makeablePutts':
          rootCause.makeablePutts++;
          rootCause.makeablePuttsSG += strokesGained;
          break;
        case 'shortGame':
          rootCause.shortGame++;
          rootCause.shortGameSG += strokesGained;
          break;
        case 'recovery':
          rootCause.recovery++;
          rootCause.recoverySG += strokesGained;
          break;
      }
    }
  });
  
  return rootCause;
}

/**
 * Calculate complete Birdie and Bogey metrics
 */
export function calculateBirdieAndBogeyMetrics(shots: ProcessedShot[]): BirdieAndBogeyMetrics {
  const holeScores = getHoleScores(shots);
  
  const bogeyRates = calculateBogeyRates(shots, holeScores);
  const birdieOpportunities = calculateBirdieOpportunities(shots, holeScores);
  const bogeyRootCause = calculateBogeyRootCause(shots, holeScores);
  const doubleBogeyPlusRootCause = calculateDoubleBogeyPlusRootCause(shots, holeScores);
  
  // Count total bogeys and double bogeys+
  let totalBogeys = 0;
  let totalDoubleBogeyPlus = 0;
  
  holeScores.forEach(hole => {
    if (hole.score === hole.par + 1) {
      totalBogeys++;
    } else if (hole.score >= hole.par + 2) {
      totalDoubleBogeyPlus++;
    }
  });
  
  return {
    bogeyRates,
    birdieOpportunities,
    bogeyRootCause,
    doubleBogeyPlusRootCause,
    totalBogeys,
    totalDoubleBogeyPlus,
  };
}

/**
 * Calculate Short Game metrics
 * - Total SG Short Game
 * - <= 8ft from Fairway - % of short game shots from Fairway that end on green within 8 feet
 * - <= 8ft from Rough - % of short game shots from Rough that end on green within 8 feet
 * - <= 8ft from Sand - % of short game shots from Sand that end on green within 8 feet
 */
export function calculateShortGameMetrics(shots: ProcessedShot[]): ShortGameMetrics {
  // Filter to only short game shots
  const shortGameShots = shots.filter(s => s.shotType === 'Short Game');
  
  if (shortGameShots.length === 0) {
    return {
      totalShortGameShots: 0,
      shortGameSG: 0,
      avgShortGameSG: 0,
      positiveSGPct: 0,
      positiveSGCount: 0,
      within8FeetFairwayPct: 0,
      within8FeetFairwayCount: 0,
      totalShortGameFairway: 0,
      within8FeetRoughPct: 0,
      within8FeetRoughCount: 0,
      totalShortGameRough: 0,
      within8FeetSandPct: 0,
      within8FeetSandCount: 0,
      totalShortGameSand: 0,
    };
  }
  
  // Total SG - Short Game
  const shortGameSG = shortGameShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);
  const avgShortGameSG = shortGameSG / shortGameShots.length;
  
  // % of short game shots with SG > 0
  const positiveSGCount = shortGameShots.filter(s => s.calculatedStrokesGained > 0).length;
  const positiveSGPct = (positiveSGCount / shortGameShots.length) * 100;
  
  // <= 8ft from Fairway - short game shots from Fairway that end on green within 8 feet
  const shortGameFairway = shortGameShots.filter(s => s['Starting Lie'] === 'Fairway');
  const totalShortGameFairway = shortGameFairway.length;
  const within8FeetFairwayCount = shortGameFairway.filter(s => 
    s['Ending Lie'] === 'Green' && s['Ending Distance'] <= 8
  ).length;
  const within8FeetFairwayPct = totalShortGameFairway > 0 
    ? (within8FeetFairwayCount / totalShortGameFairway) * 100 
    : 0;
  
  // <= 8ft from Rough - short game shots from Rough that end on green within 8 feet
  const shortGameRough = shortGameShots.filter(s => s['Starting Lie'] === 'Rough');
  const totalShortGameRough = shortGameRough.length;
  const within8FeetRoughCount = shortGameRough.filter(s => 
    s['Ending Lie'] === 'Green' && s['Ending Distance'] <= 8
  ).length;
  const within8FeetRoughPct = totalShortGameRough > 0 
    ? (within8FeetRoughCount / totalShortGameRough) * 100 
    : 0;
  
  // <= 8ft from Sand - short game shots from Sand that end on green within 8 feet
  const shortGameSand = shortGameShots.filter(s => s['Starting Lie'] === 'Sand');
  const totalShortGameSand = shortGameSand.length;
  const within8FeetSandCount = shortGameSand.filter(s => 
    s['Ending Lie'] === 'Green' && s['Ending Distance'] <= 8
  ).length;
  const within8FeetSandPct = totalShortGameSand > 0 
    ? (within8FeetSandCount / totalShortGameSand) * 100 
    : 0;
  
  return {
    totalShortGameShots: shortGameShots.length,
    shortGameSG,
    avgShortGameSG,
    positiveSGPct,
    positiveSGCount,
    within8FeetFairwayPct,
    within8FeetFairwayCount,
    totalShortGameFairway,
    within8FeetRoughPct,
    within8FeetRoughCount,
    totalShortGameRough,
    within8FeetSandPct,
    within8FeetSandCount,
    totalShortGameSand,
  };
}

/**
 * Calculate Short Game Heat Map Data
 * - Y-axis: Starting Lie (Fairway, Rough, Sand, Recovery)
 * - X-axis: Distance buckets (0-15: Around the Green, 16-35: Short Shots, 36-50: Finesse Wedges)
 * - Cell values: Total shots and SG metrics
 */
export function calculateShortGameHeatMapData(shots: ProcessedShot[], totalRounds: number): ShortGameHeatMapData {
  const lies = ['Fairway', 'Rough', 'Sand', 'Recovery'];
  
  const distanceBuckets = [
    { label: 'Around the Green', minDistance: 0, maxDistance: 15 },
    { label: 'Short Shots', minDistance: 16, maxDistance: 35 },
    { label: 'Finesse Wedges', minDistance: 36, maxDistance: 50 },
  ];
  
  const shortGameShots = shots.filter(s => s.shotType === 'Short Game');
  
  const cells: ShortGameHeatMapCell[] = [];
  
  lies.forEach(lie => {
    distanceBuckets.forEach(bucket => {
      const cellShots = shortGameShots.filter(s => 
        s['Starting Lie'] === lie &&
        s['Starting Distance'] >= bucket.minDistance &&
        s['Starting Distance'] <= bucket.maxDistance
      );
      
      const totalShots = cellShots.length;
      const strokesGained = totalShots > 0 
        ? cellShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0)
        : 0;
      const sgPerRound = totalRounds > 0 ? strokesGained / totalRounds : 0;
      
      cells.push({
        lie,
        distanceBucket: bucket.label,
        minDistance: bucket.minDistance,
        maxDistance: bucket.maxDistance,
        totalShots,
        strokesGained,
        sgPerRound,
      });
    });
  });
  
  return {
    cells,
    distanceBuckets: distanceBuckets.map(b => b.label),
    lies,
    totalRounds,
  };
}
