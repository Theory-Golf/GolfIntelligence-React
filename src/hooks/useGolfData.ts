/**
 * Golf Intelligence — Data Loading Hook
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import type { RawShot, ProcessedShot, Tiger5Metrics, RoundSummary, FilterState, FilterOptions } from '../types/golf';
import type { BenchmarkType } from '../data/benchmarks';
import { processShots, calculateTiger5Metrics, getRoundSummaries } from '../utils/calculations';

// Google Sheet CSV URL - published to web
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6xTTDWTSzaRvoiACi2PT-l7uqvwcZwdlIZsCGunz-8t-227TBihATnDfUoi5VzDqhOIGcAbJViw9O/pub?output=csv';

interface UseGolfDataResult {
  rawShots: RawShot[];
  processedShots: ProcessedShot[];
  filteredShots: ProcessedShot[];
  tiger5Metrics: Tiger5Metrics;
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
  const [benchmark, setBenchmark] = useState<BenchmarkType>('pgaTour');
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
  const cascadingFilterOptions = useMemo<FilterOptions>(() => {
    if (processedShots.length === 0) {
      return {
        players: [],
        courses: [],
        tournaments: [],
        dates: [],
      };
    }

    // Start with all shots and apply each filter to determine available options for others
    let availableShots = processedShots;

    // If players are selected, filter to those players first
    if (filters.players.length > 0) {
      availableShots = availableShots.filter(s => filters.players.includes(s.Player));
    }
    // If courses are selected, filter to those courses
    if (filters.courses.length > 0) {
      availableShots = availableShots.filter(s => filters.courses.includes(s.Course));
    }
    // If tournaments are selected, filter to those tournaments
    if (filters.tournaments.length > 0) {
      availableShots = availableShots.filter(s => filters.tournaments.includes(s.Tournament));
    }
    // If dates are selected, filter to those dates
    if (filters.dates.length > 0) {
      availableShots = availableShots.filter(s => filters.dates.includes(s.Date));
    }

    // Get unique values from filtered shots
    const players = [...new Set(availableShots.map(s => s.Player))].sort();
    const courses = [...new Set(availableShots.map(s => s.Course))].sort();
    const tournaments = [...new Set(availableShots.map(s => s.Tournament))].sort();
    const dates = [...new Set(availableShots.map(s => s.Date))].sort();

    return { players, courses, tournaments, dates };
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
