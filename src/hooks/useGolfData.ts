/**
 * Golf Intelligence — Data Loading Hook
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import type { RawShot, ProcessedShot, Tiger5Metrics, RoundSummary, FilterState, FilterOptions, DrivingMetrics, DrivingAnalysis, ProblemDriveMetrics, ApproachMetrics, ApproachDistanceBucket, ApproachHeatMapData, PuttingMetrics, PuttingDistanceBucket, LagPuttingMetrics, ScoringMetrics, MentalMetrics, BirdieAndBogeyMetrics, ShortGameMetrics, ShortGameHeatMapData, PerformanceDriversResult, PlayerPathMetrics } from '../types/golf';
import type { BenchmarkType } from '../data/benchmarks';
import { processShots, calculateTiger5Metrics, getRoundSummaries, calculateDrivingMetrics, calculateDrivingAnalysis, calculateProblemDriveMetrics, calculateApproachMetrics, calculateApproachByDistance, calculateApproachFromRough, calculateApproachHeatMapData, calculatePuttingMetrics, calculatePuttingByDistance, calculateLagPuttingMetrics, calculateScoringMetrics, calculateMentalMetrics, calculateBirdieAndBogeyMetrics, calculateShortGameMetrics, calculateShortGameHeatMapData } from '../utils/calculations';
import { calculatePerformanceDrivers } from '../utils/performanceDrivers';
import { calculatePlayerPathMetrics } from '../utils/playerPathCalculations';

// Google Sheet CSV URL - published to web
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6xTTDWTSzaRvoiACi2PT-l7uqvwcZwdlIZsCGunz-8t-227TBihATnDfUoi5VzDqhOIGcAbJViw9O/pub?output=csv';

interface UseGolfDataResult {
  rawShots: RawShot[];
  processedShots: ProcessedShot[];
  filteredShots: ProcessedShot[];
  tiger5Metrics: Tiger5Metrics;
  scoringMetrics: ScoringMetrics;
  birdieAndBogeyMetrics: BirdieAndBogeyMetrics;
  drivingMetrics: DrivingMetrics;
  drivingAnalysis: DrivingAnalysis;
  problemDriveMetrics: ProblemDriveMetrics;
  approachMetrics: ApproachMetrics;
  approachByDistance: ApproachDistanceBucket[];
  approachFromRough: ApproachDistanceBucket[];
  approachHeatMapData: ApproachHeatMapData;
  puttingMetrics: PuttingMetrics;
  puttingByDistance: PuttingDistanceBucket[];
  lagPuttingMetrics: LagPuttingMetrics;
  mentalMetrics: MentalMetrics;
  shortGameMetrics: ShortGameMetrics;
  shortGameHeatMapData: ShortGameHeatMapData;
  performanceDrivers: PerformanceDriversResult;
  playerPathMetrics: PlayerPathMetrics;
  roundSummaries: RoundSummary[];
  filterOptions: FilterOptions;
  cascadingFilterOptions: FilterOptions;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  benchmark: BenchmarkType;
  setBenchmark: (benchmark: BenchmarkType) => void;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const initialFilters: FilterState = {
  players: [],
  courses: [],
  tournaments: [],
  dates: [],
};

export function useGolfData(): UseGolfDataResult {
  const [rawShots, setRawShots] = useState<RawShot[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [benchmark, setBenchmark] = useState<BenchmarkType>('eliteCollege');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse<RawShot>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            // Clean up the data - trim strings and convert numbers
            const cleanedData = results.data.map(shot => {
              const cleaned: Partial<RawShot> = {};
              (Object.keys(shot) as Array<keyof RawShot>).forEach(key => {
                const value = shot[key];
                if (typeof value === 'string') {
                  const trimmed = value.trim();
                  // Convert numeric fields
                  if (['Shot', 'Hole', 'Score', 'Starting Distance', 'Ending Distance'].includes(key)) {
                    cleaned[key] = parseFloat(trimmed) as never;
                  } else {
                    cleaned[key] = trimmed as never;
                  }
                } else {
                  cleaned[key] = value as never;
                }
              });
              return cleaned as RawShot;
            });
            
            setRawShots(cleanedData);
            setLastUpdated(new Date());
          },
          error: (parseError: Error) => {
            throw new Error(`CSV parsing failed: ${parseError}`);
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error loading data';
        setError(message);
        console.error('Failed to load golf data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Process shots when raw data or benchmark changes
  const processedShots = useMemo(() => {
    if (rawShots.length === 0) return [];
    return processShots(rawShots, benchmark);
  }, [rawShots, benchmark]);

  // Compute filter options from raw data
  const filterOptions = useMemo<FilterOptions>(() => {
    if (rawShots.length === 0) {
      return {
        players: [],
        courses: [],
        tournaments: [],
        dates: [],
      };
    }

    const players = [...new Set(rawShots.map(s => s.Player))].sort();
    const courses = [...new Set(rawShots.map(s => s.Course))].sort();
    const tournaments = [...new Set(rawShots.map(s => s.Tournament))].sort();
    const dates = [...new Set(rawShots.map(s => s.Date))].sort();

    return { players, courses, tournaments, dates };
  }, [rawShots]);

  // Compute cascading filter options based on current selections
  // Bidirectional cascading: selecting items in one category filters options in all other categories
  // OR within each category: selecting multiple players shows rounds for ANY of those players
  // AND across categories: dates AND courses must both match
  const cascadingFilterOptions = useMemo<FilterOptions>(() => {
    if (processedShots.length === 0) {
      return {
        players: [],
        courses: [],
        tournaments: [],
        dates: [],
      };
    }

    // If no filters selected, show all options
    const hasAnyFilters = filters.players.length > 0 || filters.courses.length > 0 || filters.tournaments.length > 0 || filters.dates.length > 0;
    if (!hasAnyFilters) {
      return {
        players: [...new Set(processedShots.map(s => s.Player))].sort(),
        courses: [...new Set(processedShots.map(s => s.Course))].sort(),
        tournaments: [...new Set(processedShots.map(s => s.Tournament))].sort(),
        dates: [...new Set(processedShots.map(s => s.Date))].sort(),
      };
    }

    // For each category, calculate valid options by applying ALL other filters (NOT the current category)
    // This allows selecting multiple within each category while cascading to others
    
    // Valid players: filter by courses, tournaments, dates (NOT by selected players)
    let playerFiltered = processedShots;
    if (filters.courses.length > 0) {
      playerFiltered = playerFiltered.filter(s => filters.courses.includes(s.Course));
    }
    if (filters.tournaments.length > 0) {
      playerFiltered = playerFiltered.filter(s => filters.tournaments.includes(s.Tournament));
    }
    if (filters.dates.length > 0) {
      playerFiltered = playerFiltered.filter(s => filters.dates.includes(s.Date));
    }
    const validPlayers = [...new Set(playerFiltered.map(s => s.Player))].sort();

    // Valid courses: filter by players, tournaments, dates (NOT by selected courses)
    let courseFiltered = processedShots;
    if (filters.players.length > 0) {
      courseFiltered = courseFiltered.filter(s => filters.players.includes(s.Player));
    }
    if (filters.tournaments.length > 0) {
      courseFiltered = courseFiltered.filter(s => filters.tournaments.includes(s.Tournament));
    }
    if (filters.dates.length > 0) {
      courseFiltered = courseFiltered.filter(s => filters.dates.includes(s.Date));
    }
    const validCourses = [...new Set(courseFiltered.map(s => s.Course))].sort();

    // Valid tournaments: filter by players, courses, dates (NOT by selected tournaments)
    let tournamentFiltered = processedShots;
    if (filters.players.length > 0) {
      tournamentFiltered = tournamentFiltered.filter(s => filters.players.includes(s.Player));
    }
    if (filters.courses.length > 0) {
      tournamentFiltered = tournamentFiltered.filter(s => filters.courses.includes(s.Course));
    }
    if (filters.dates.length > 0) {
      tournamentFiltered = tournamentFiltered.filter(s => filters.dates.includes(s.Date));
    }
    const validTournaments = [...new Set(tournamentFiltered.map(s => s.Tournament))].sort();

    // Valid dates: filter by players, courses, tournaments (NOT by selected dates)
    let dateFiltered = processedShots;
    if (filters.players.length > 0) {
      dateFiltered = dateFiltered.filter(s => filters.players.includes(s.Player));
    }
    if (filters.courses.length > 0) {
      dateFiltered = dateFiltered.filter(s => filters.courses.includes(s.Course));
    }
    if (filters.tournaments.length > 0) {
      dateFiltered = dateFiltered.filter(s => filters.tournaments.includes(s.Tournament));
    }
    const validDates = [...new Set(dateFiltered.map(s => s.Date))].sort();

    return { 
      players: validPlayers, 
      courses: validCourses, 
      tournaments: validTournaments, 
      dates: validDates 
    };
  }, [processedShots, filters]);

  // Filter shots based on selected filters
  const filteredShots = useMemo(() => {
    if (processedShots.length === 0) return [];
    
    return processedShots.filter(shot => {
      // If filter is empty, include all
      const playerMatch = filters.players.length === 0 || filters.players.includes(shot.Player);
      const courseMatch = filters.courses.length === 0 || filters.courses.includes(shot.Course);
      const tournamentMatch = filters.tournaments.length === 0 || filters.tournaments.includes(shot.Tournament);
      const dateMatch = filters.dates.length === 0 || filters.dates.includes(shot.Date);
      
      return playerMatch && courseMatch && tournamentMatch && dateMatch;
    });
  }, [processedShots, filters]);

  // Calculate metrics from filtered shots
  const tiger5Metrics = useMemo(() => {
    return calculateTiger5Metrics(filteredShots);
  }, [filteredShots, benchmark]);

  // Calculate scoring metrics from filtered shots
  const scoringMetrics = useMemo(() => {
    return calculateScoringMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate birdie and bogey metrics from filtered shots
  const birdieAndBogeyMetrics = useMemo(() => {
    return calculateBirdieAndBogeyMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate driving metrics from filtered shots
  const drivingMetrics = useMemo(() => {
    return calculateDrivingMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate driving analysis from filtered shots
  const drivingAnalysis = useMemo(() => {
    return calculateDrivingAnalysis(filteredShots);
  }, [filteredShots]);

  // Calculate problem drive metrics
  const problemDriveMetrics = useMemo(() => {
    return calculateProblemDriveMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate approach metrics from filtered shots
  const approachMetrics = useMemo(() => {
    return calculateApproachMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate approach by distance from filtered shots
  const approachByDistance = useMemo(() => {
    return calculateApproachByDistance(filteredShots);
  }, [filteredShots]);

  // Calculate approach from rough from filtered shots
  const approachFromRough = useMemo(() => {
    return calculateApproachFromRough(filteredShots);
  }, [filteredShots]);

  // Get unique rounds count for SG per Round calculation
  const uniqueRounds = useMemo(() => {
    return [...new Set(filteredShots.map(s => s['Round ID']))].length;
  }, [filteredShots]);

  // Calculate approach heat map data
  const approachHeatMapData = useMemo(() => {
    return calculateApproachHeatMapData(filteredShots, uniqueRounds);
  }, [filteredShots, uniqueRounds]);

  // Calculate putting metrics from filtered shots
  const puttingMetrics = useMemo(() => {
    return calculatePuttingMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate putting by distance
  const puttingByDistance = useMemo(() => {
    return calculatePuttingByDistance(filteredShots);
  }, [filteredShots]);

  // Calculate lag putting metrics from filtered shots
  const lagPuttingMetrics = useMemo(() => {
    return calculateLagPuttingMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate mental metrics from filtered shots
  const mentalMetrics = useMemo(() => {
    return calculateMentalMetrics(filteredShots, benchmark);
  }, [filteredShots, benchmark]);

  // Calculate short game metrics from filtered shots
  const shortGameMetrics = useMemo(() => {
    return calculateShortGameMetrics(filteredShots);
  }, [filteredShots]);

  // Calculate short game heat map data
  const shortGameHeatMapData = useMemo(() => {
    return calculateShortGameHeatMapData(filteredShots, uniqueRounds);
  }, [filteredShots, uniqueRounds]);

  // Calculate performance drivers
  const performanceDrivers = useMemo(() => {
    return calculatePerformanceDrivers(
      filteredShots,
      tiger5Metrics,
      mentalMetrics,
      birdieAndBogeyMetrics,
      drivingMetrics,
      problemDriveMetrics,
      approachMetrics,
      approachByDistance,
      shortGameMetrics,
      puttingMetrics,
      puttingByDistance
    );
  }, [filteredShots, tiger5Metrics, mentalMetrics, birdieAndBogeyMetrics, drivingMetrics, problemDriveMetrics, approachMetrics, approachByDistance, shortGameMetrics, puttingMetrics, puttingByDistance]);

  // Calculate PlayerPath metrics
  const playerPathMetrics = useMemo(() => {
    return calculatePlayerPathMetrics(filteredShots);
  }, [filteredShots]);

  // Get round summaries from filtered shots
  const roundSummaries = useMemo(() => {
    return getRoundSummaries(filteredShots);
  }, [filteredShots]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  return {
    rawShots,
    processedShots,
    filteredShots,
    tiger5Metrics,
    scoringMetrics,
    birdieAndBogeyMetrics,
    drivingMetrics,
    drivingAnalysis,
    problemDriveMetrics,
    approachMetrics,
    approachByDistance,
    approachFromRough,
    approachHeatMapData,
    puttingMetrics,
    puttingByDistance,
    lagPuttingMetrics,
    mentalMetrics,
    shortGameMetrics,
    shortGameHeatMapData,
    performanceDrivers,
    playerPathMetrics,
    roundSummaries,
    filterOptions,
    cascadingFilterOptions,
    filters,
    setFilters,
    clearFilters,
    benchmark,
    setBenchmark,
    isLoading,
    error,
    lastUpdated,
  };
}
