import { useState, useMemo } from 'react'
import './styles/globals.css'
import { useGolfData } from './hooks/useGolfData'
import { TABS, Tiger5Metrics, Tiger5Fail, RootCauseMetrics, Tiger5FailDetails, RootCauseByFailTypeList, Tiger5TrendDataPoint, ProcessedShot, DrivingMetrics, DrivingAnalysis, ProblemDriveMetrics, ApproachMetrics, ApproachDistanceBucket, ApproachHeatMapData, PuttingMetrics, LagPuttingMetrics, ScoringMetrics, HoleOutcome, MentalMetrics, BirdieAndBogeyMetrics, ShortGameMetrics, ShortGameHeatMapData, PerformanceDriversResult, PlayerPathMetrics } from './types/golf'
import { getStrokeGainedColor, getShotSGColor, formatStrokesGained, chartColors } from './styles/tokens'
import { calculateProblemDriveMetrics } from './utils/calculations'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart } from 'recharts'
import { FilterBar } from './components/FilterBar'
import { StrokesGainedTrendChart } from './components/StrokesGainedTrendChart'
import { getBenchmarkOptions } from './data/benchmarks'
import type { BenchmarkType } from './data/benchmarks'

function App() {
  const [activeTab, setActiveTab] = useState('tiger5')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { 
    filteredShots, 
    tiger5Metrics, 
    scoringMetrics,
    birdieAndBogeyMetrics,
    drivingMetrics,
    drivingAnalysis,
    approachMetrics,
    approachByDistance,
    approachFromRough,
    approachHeatMapData,
    puttingMetrics,
    lagPuttingMetrics,
    mentalMetrics,
    shortGameMetrics,
    shortGameHeatMapData,
    performanceDrivers,
    playerPathMetrics,
    isLoading, 
    error, 
    lastUpdated,
    filterOptions,
    cascadingFilterOptions,
    filters,
    setFilters,
    clearFilters,
    benchmark,
    setBenchmark,
  } = useGolfData()

  const benchmarkOptions = getBenchmarkOptions()

  const handleBenchmarkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBenchmark(e.target.value as BenchmarkType)
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>Golf <em>Intelligence</em></h1>
          <p className="subtitle">By: Theory Golf</p>
        </div>
        {/* Benchmark Selector */}
        <div className="benchmark-selector">
          <label htmlFor="benchmark-select">Benchmark:</label>
          <select 
            id="benchmark-select"
            value={benchmark} 
            onChange={handleBenchmarkChange}
            className="benchmark-dropdown"
          >
            {benchmarkOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Filter Bar */}
      {!isLoading && !error && (
        <FilterBar 
          filters={filters}
          options={filterOptions}
          validOptions={cascadingFilterOptions}
          onFilterChange={setFilters}
          onClear={clearFilters}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Main Content */}
      <main className={`main ${!isLoading && !error ? 'main-with-sidebar' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {isLoading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '16px' }}>Loading golf data...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>{error}</p>
            <p style={{ marginTop: '8px', fontSize: '12px' }}>
              Make sure your Google Sheet is published to the web (File → Share → Publish to web)
            </p>
          </div>
        )}

        {!isLoading && !error && activeTab === 'tiger5' && (
          <Tiger5View metrics={tiger5Metrics} lastUpdated={lastUpdated} />
        )}

        {!isLoading && !error && activeTab === 'sg' && (
          <StrokesGainedView metrics={tiger5Metrics} filteredShots={filteredShots} />
        )}

        {!isLoading && !error && activeTab === 'driving' && (
          <DrivingView metrics={drivingMetrics} analysis={drivingAnalysis} filteredShots={filteredShots} />
        )}

        {!isLoading && !error && activeTab === 'approach' && (
          <ApproachView metrics={approachMetrics} approachByDistance={approachByDistance} approachFromRough={approachFromRough} approachHeatMapData={approachHeatMapData} filteredShots={filteredShots} />
        )}

        {!isLoading && !error && activeTab === 'putting' && (
          <PuttingView metrics={puttingMetrics} lagMetrics={lagPuttingMetrics} filteredShots={filteredShots} />
        )}

        {!isLoading && !error && activeTab === 'scoring' && (
          <ScoringView metrics={scoringMetrics} birdieAndBogeyMetrics={birdieAndBogeyMetrics} mentalMetrics={mentalMetrics} />
        )}

        {!isLoading && !error && activeTab === 'path' && (
          <PlayerPathView drivers={performanceDrivers} playerPathMetrics={playerPathMetrics} />
        )}



        {!isLoading && !error && activeTab === 'shortgame' && (
          <ShortGameView metrics={shortGameMetrics} shortGameHeatMapData={shortGameHeatMapData} filteredShots={filteredShots} />
        )}
        
        {!isLoading && !error && activeTab !== 'tiger5' && activeTab !== 'sg' && activeTab !== 'driving' && activeTab !== 'approach' && activeTab !== 'putting' && activeTab !== 'scoring' && activeTab !== 'path' && activeTab !== 'shortgame' && (
          <div className="content">
            <div className="card">
              <h3>{TABS.find(t => t.id === activeTab)?.label}</h3>
              <p>Coming soon... ({filteredShots.length} shots loaded)</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Tiger 5 - Summary Metrics View
 */
function Tiger5View({ metrics }: { metrics: Tiger5Metrics; lastUpdated: Date | null }) {
  const { tiger5Fails, rootCause, failDetails, rootCauseByFailType, tiger5Trend, lowestRound, highestRound, avgScore, totalRounds } = metrics;
  
  // Calculate SG per round (average)
  const avgSGPerRound = totalRounds > 0 ? metrics.totalStrokesGained / totalRounds : 0;
  
  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Tiger 5 Performance</h4>
      
      {/* Hero Cards - Section 1: Tiger 5 Fails, Average Score, Rounds */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Card 1: Total Tiger 5 Fails */}
        <HeroCardWithSubValues
          label="Tiger 5 Fails"
          value={tiger5Fails.totalFails.toString()}
          bottomLeftLabel="Per Round"
          bottomLeftValue={tiger5Fails.failsPerRound.toFixed(1)}
          bottomRightLabel="SG on Fail Holes"
          bottomRightValue={formatStrokesGained(tiger5Fails.sgOnFailHoles)}
          isFlagship
        />
        
        {/* Card 2: Average Score */}
        <HeroCardWithSubValues
          label="Avg Score"
          value={avgScore.toFixed(1)}
          middleLabel="SG / Round"
          middleValue={formatStrokesGained(avgSGPerRound)}
        />
        
        {/* Card 3: Rounds */}
        <HeroCardWithSubValues
          label="Rounds"
          value={totalRounds.toString()}
          bottomLeftLabel="Lowest"
          bottomLeftValue={lowestRound.toString()}
          bottomRightLabel="Highest"
          bottomRightValue={highestRound.toString()}
        />
      </div>

      {/* Stat Cards - Tiger 5 Fail Breakdown */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '24px' }}>
        {getSortedTiger5Cards(tiger5Fails, totalRounds).map((card) => (
          <StatCardWithSG 
            key={card.label}
            label={card.label}
            value={card.value.toString()}
            valueColor={card.valueColor}
            percentage={card.percentage}
            sgValue={card.sg}
            color={card.color}
          />
        ))}
      </div>

      {/* Root Cause Section */}
      <RootCauseSection rootCause={rootCause} totalFailHoles={tiger5Fails.totalFails} />

      {/* Tiger 5 Fail Details Section */}
      <Tiger5FailDetailsSection failDetails={failDetails} />

      {/* Root Cause By Fail Type Section */}
      <RootCauseByFailTypeSection rootCauseByFailType={rootCauseByFailType} totalFails={tiger5Fails.totalFails} />

      {/* Tiger 5 Trend Chart */}
      <Tiger5TrendSection trendData={tiger5Trend} />

      {/* Potential Score Section - What if Tiger 5 fails reduced by 50% */}
      <PotentialScoreSection trendData={tiger5Trend} tiger5Fails={tiger5Fails} totalRounds={totalRounds} />
    </div>
  )
}

/**
 * Hero Card with sub-values (for Tiger 5 Fails and Average Score)
 */
function HeroCardWithSubValues({
  label,
  value,
  middleLabel,
  middleValue,
  bottomLeftLabel,
  bottomLeftValue,
  bottomRightLabel,
  bottomRightValue,
  isFlagship = false,
}: {
  label: string;
  value: string;
  middleLabel?: string;
  middleValue?: string;
  bottomLeftLabel?: string;
  bottomLeftValue?: string;
  bottomRightLabel?: string;
  bottomRightValue?: string;
  isFlagship?: boolean;
}) {
  return (
    <div className={`card-hero ${isFlagship ? 'is-flagship' : ''}`}>
      <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
        <div className="label" style={{ color: isFlagship ? 'var(--scarlet)' : 'var(--ash)' }}>
          {label}
        </div>
        {isFlagship && (
          <div style={{ width: '6px', height: '6px', background: 'var(--scarlet)', borderRadius: '50%' }}></div>
        )}
      </div>
      <div className="value-hero" style={{ color: 'var(--chalk)' }}>
        {value}
      </div>
      
      {/* Middle row (optional) */}
      {middleLabel && middleValue && (
        <div style={{ marginTop: '12px', padding: '8px 0', borderTop: '1px solid var(--charcoal)', borderBottom: '1px solid var(--charcoal)' }}>
          <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>{middleLabel}</div>
          <div className="value-stat" style={{ color: getStrokeGainedColor(parseFloat(middleValue)) }}>
            {middleValue}
          </div>
        </div>
      )}
      
      {/* Bottom row (optional) */}
      {(bottomLeftLabel || bottomRightLabel) && (
        <div className="flex justify-between" style={{ marginTop: '16px' }}>
          <div>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>{bottomLeftLabel}</div>
            <div className="value-stat">{bottomLeftValue}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>{bottomRightLabel}</div>
            <div className="value-stat">{bottomRightValue}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Tiger 5 Card data structure
 */
interface Tiger5CardData {
  label: string;
  value: number;
  failsPerRound: number;
  percentage: number;
  sg: number;
  color: string;
  valueColor: string;
}

/**
 * Get color based on fails per round
 * Green: <=0.25 per round
 * Yellow: 0.25 to 1 per round
 * Red: >1 per round
 */
function getFailsPerRoundColor(failsPerRound: number): string {
  if (failsPerRound <= 0.25) return 'var(--under)';      // Green
  if (failsPerRound <= 1) return 'var(--bogey)';          // Yellow/Amber
  return 'var(--double)';                                  // Red
}

/**
 * Get color based on penalty rate (lower is better)
 * <5%: Green (good)
 * 5-10%: Yellow (average)
 * >10%: Red (poor)
 */
function getPenaltyRateColor(penaltyRate: number): string {
  if (penaltyRate < 5) return 'var(--under)';    // Green
  if (penaltyRate <= 10) return 'var(--bogey)';   // Yellow
  return 'var(--double)';                         // Red
}

/**
 * Get color based on fairway percentage (higher is better)
 * >60%: Green (good)
 * 40-60%: Yellow (average)
 * <40%: Red (poor)
 */
function getFairwayPctColor(fairwayPct: number): string {
  if (fairwayPct > 60) return 'var(--under)';     // Green
  if (fairwayPct >= 40) return 'var(--bogey)';    // Yellow
  return 'var(--double)';                         // Red
}

/**
 * Sort Tiger 5 fails by count (most fails to least fails) and return card data
 */
function getSortedTiger5Cards(fails: Tiger5Fail, totalRounds: number): Tiger5CardData[] {
  const totalFails = fails.totalFails;
  
  // Chart colors for variety - one unique color per card
  const chartColors = [
    '#3D8EF0',  // Royal Blue
    '#A855F7',  // Court Purple
    '#06C8E0',  // Aqua
    '#D4F000',  // Volt
    '#F03DAA',  // Magenta
  ];
  
  const cards: Tiger5CardData[] = [
    { 
      label: '3 Putts', 
      value: fails.threePutts, 
      failsPerRound: totalRounds > 0 ? fails.threePutts / totalRounds : 0,
      percentage: totalFails > 0 ? (fails.threePutts / totalFails) * 100 : 0,
      sg: fails.threePuttsSG,
      color: chartColors[0],
      valueColor: ''
    },
    { 
      label: 'Bogey on Par 5', 
      value: fails.bogeyOnPar5, 
      failsPerRound: totalRounds > 0 ? fails.bogeyOnPar5 / totalRounds : 0,
      percentage: totalFails > 0 ? (fails.bogeyOnPar5 / totalFails) * 100 : 0,
      sg: fails.bogeyOnPar5SG,
      color: chartColors[1],
      valueColor: ''
    },
    { 
      label: 'Double Bogey', 
      value: fails.doubleBogey, 
      failsPerRound: totalRounds > 0 ? fails.doubleBogey / totalRounds : 0,
      percentage: totalFails > 0 ? (fails.doubleBogey / totalFails) * 100 : 0,
      sg: fails.doubleBogeySG,
      color: chartColors[2],
      valueColor: ''
    },
    { 
      label: 'Bogey: Approach <125', 
      value: fails.bogeyApproach, 
      failsPerRound: totalRounds > 0 ? fails.bogeyApproach / totalRounds : 0,
      percentage: totalFails > 0 ? (fails.bogeyApproach / totalFails) * 100 : 0,
      sg: fails.bogeyApproachSG,
      color: chartColors[3],
      valueColor: ''
    },
    { 
      label: 'Missed Green (Short Game)', 
      value: fails.missedGreen, 
      failsPerRound: totalRounds > 0 ? fails.missedGreen / totalRounds : 0,
      percentage: totalFails > 0 ? (fails.missedGreen / totalFails) * 100 : 0,
      sg: fails.missedGreenSG,
      color: chartColors[4],
      valueColor: ''
    },
  ];
  
  // Calculate valueColor for each card based on fails per round
  cards.forEach(card => {
    card.valueColor = getFailsPerRoundColor(card.failsPerRound);
  });
  
  // Sort by value (count) descending - most fails to least fails
  return cards.sort((a, b) => b.value - a.value);
}

/**
 * Stat Card with SG - Enhanced metric display for Tiger 5
 */
function StatCardWithSG({ 
  label, 
  value, 
  valueColor,
  percentage,
  sgValue,
  color 
}: { 
  label: string; 
  value: string;
  valueColor: string;
  percentage: number;
  sgValue: number;
  color: string;
}) {
  return (
    <div className="card-stat" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="label" style={{ color: 'var(--ash)', marginBottom: '12px' }}>
        {label}
      </div>
      <div className="value-stat" style={{ color: valueColor }}>{value}</div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Fails</div>
          <div className="value-stat" style={{ fontSize: '12px' }}>{percentage.toFixed(1)}%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
          <div className="value-stat" style={{ color: getStrokeGainedColor(sgValue), fontSize: '12px' }}>
            {formatStrokesGained(sgValue)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Root Cause By Fail Type Section - Shows root cause breakdown for each fail type
 */
function RootCauseByFailTypeSection({ rootCauseByFailType, totalFails }: { rootCauseByFailType: RootCauseByFailTypeList; totalFails: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const failTypes = [
    { key: 'threePutts', label: '3 Putts', data: rootCauseByFailType.threePutts },
    { key: 'bogeyOnPar5', label: 'Bogey on Par 5', data: rootCauseByFailType.bogeyOnPar5 },
    { key: 'doubleBogey', label: 'Double Bogey', data: rootCauseByFailType.doubleBogey },
    { key: 'bogeyApproach', label: 'Bogey: Approach <125', data: rootCauseByFailType.bogeyApproach },
    { key: 'missedGreen', label: 'Missed Green', data: rootCauseByFailType.missedGreen },
  ];

  const totalFailsInTypes = failTypes.reduce((sum, ft) => sum + ft.data.totalCount, 0);
  
  if (totalFailsInTypes === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'var(--charcoal)',
          border: '1px solid var(--ash)',
          borderRadius: '4px',
          color: 'var(--chalk)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 600 }}>Root Cause by Fail Type</span>
        <span style={{ fontSize: '12px', color: 'var(--ash)' }}>
          {totalFailsInTypes} fails • {isExpanded ? '▲' : '▼'}
        </span>
      </button>
      
      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {failTypes.map((failType) => {
            if (failType.data.totalCount === 0) return null;
            const data = failType.data;
            
            // Build root cause items based on fail type
            let rootCauseItems: { label: string; count: number; percentageOfFailType: number; percentageOfTotal: number; sgTotal: number }[] = [];
            
            if (failType.key === 'threePutts') {
              // For 3 Putts: Makeable Putts and Lag Putts
              if (data.makeablePutts > 0) {
                rootCauseItems.push({
                  label: 'Makeable Putts (0-12)',
                  count: data.makeablePutts,
                  percentageOfFailType: (data.makeablePutts / data.totalCount) * 100,
                  percentageOfTotal: totalFails > 0 ? (data.makeablePutts / totalFails) * 100 : 0,
                  sgTotal: data.makeablePuttsSG,
                });
              }
              if (data.lagPutts > 0) {
                rootCauseItems.push({
                  label: 'Lag Putts (13+)',
                  count: data.lagPutts,
                  percentageOfFailType: (data.lagPutts / data.totalCount) * 100,
                  percentageOfTotal: totalFails > 0 ? (data.lagPutts / totalFails) * 100 : 0,
                  sgTotal: data.lagPuttsSG,
                });
              }
            } else if (failType.key === 'missedGreen') {
              // For Missed Green: Show by starting lie
              if (data.byStartingLie && data.byStartingLie.length > 0) {
                data.byStartingLie.forEach((lie) => {
                  rootCauseItems.push({
                    label: `Starting Lie: ${lie.lie}`,
                    count: lie.count,
                    percentageOfFailType: lie.percentageOfFailType,
                    percentageOfTotal: lie.percentageOfTotal,
                    sgTotal: lie.sgTotal,
                  });
                });
              }
            } else {
              // Other fail types: standard root causes
              if (data.penalties > 0) rootCauseItems.push({ label: 'Penalties', count: data.penalties, percentageOfFailType: (data.penalties / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.penalties / totalFails) * 100 : 0, sgTotal: data.penaltiesSG });
              if (data.driving > 0) rootCauseItems.push({ label: 'Driving', count: data.driving, percentageOfFailType: (data.driving / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.driving / totalFails) * 100 : 0, sgTotal: data.drivingSG });
              if (data.approach > 0) rootCauseItems.push({ label: 'Approach', count: data.approach, percentageOfFailType: (data.approach / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.approach / totalFails) * 100 : 0, sgTotal: data.approachSG });
              if (data.lagPutts > 0) rootCauseItems.push({ label: 'Lag Putts (13+)', count: data.lagPutts, percentageOfFailType: (data.lagPutts / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.lagPutts / totalFails) * 100 : 0, sgTotal: data.lagPuttsSG });
              if (data.makeablePutts > 0) rootCauseItems.push({ label: 'Makeable Putts (0-12)', count: data.makeablePutts, percentageOfFailType: (data.makeablePutts / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.makeablePutts / totalFails) * 100 : 0, sgTotal: data.makeablePuttsSG });
              if (data.shortGame > 0) rootCauseItems.push({ label: 'Short Game', count: data.shortGame, percentageOfFailType: (data.shortGame / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.shortGame / totalFails) * 100 : 0, sgTotal: data.shortGameSG });
              if (data.recovery > 0) rootCauseItems.push({ label: 'Recovery', count: data.recovery, percentageOfFailType: (data.recovery / data.totalCount) * 100, percentageOfTotal: totalFails > 0 ? (data.recovery / totalFails) * 100 : 0, sgTotal: data.recoverySG });
            }
            
            return (
              <div key={failType.key} style={{ marginBottom: '20px', padding: '12px', background: 'var(--charcoal)', borderRadius: '4px' }}>
                <h5 style={{ marginBottom: '12px', color: 'var(--chalk)', fontSize: '13px', fontWeight: 600 }}>
                  {failType.label} ({data.totalCount})
                </h5>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                      <th style={{ textAlign: 'left', padding: '6px', color: 'var(--ash)', width: '35%' }}>Root Cause</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: 'var(--ash)', width: '15%' }}>Count</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: 'var(--ash)', width: '20%' }}>% of Fail Type</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: 'var(--ash)', width: '15%' }}>% of Total</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: 'var(--ash)', width: '15%' }}>Total SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rootCauseItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                        <td style={{ padding: '6px', color: 'var(--chalk)' }}>{item.label}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: 'var(--chalk)' }}>{item.count}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: 'var(--ash)' }}>{item.percentageOfFailType.toFixed(1)}%</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: 'var(--ash)' }}>{item.percentageOfTotal.toFixed(1)}%</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: getStrokeGainedColor(item.sgTotal || 0) }}>{formatStrokesGained(item.sgTotal || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Tiger 5 Fail Details Section - Collapsible section showing detailed fail information
 */
function Tiger5FailDetailsSection({ failDetails }: { failDetails: Tiger5FailDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Group fail types with their details
  const failTypes = [
    { key: 'threePutts', label: '3 Putts', details: failDetails.threePutts },
    { key: 'bogeyOnPar5', label: 'Bogey on Par 5', details: failDetails.bogeyOnPar5 },
    { key: 'doubleBogey', label: 'Double Bogey', details: failDetails.doubleBogey },
    { key: 'bogeyApproach', label: 'Bogey: Approach <125', details: failDetails.bogeyApproach },
    { key: 'missedGreen', label: 'Missed Green', details: failDetails.missedGreen },
  ];

  const totalFails = failTypes.reduce((sum, ft) => sum + ft.details.length, 0);
  
  if (totalFails === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'var(--charcoal)',
          border: '1px solid var(--ash)',
          borderRadius: '4px',
          color: 'var(--chalk)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 600 }}>Tiger 5 Fail Details</span>
        <span style={{ fontSize: '12px', color: 'var(--ash)' }}>
          {totalFails} fails • {isExpanded ? '▲' : '▼'}
        </span>
      </button>
      
      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {failTypes.map((failType) => {
            if (failType.details.length === 0) return null;
            return (
              <div key={failType.key} style={{ marginBottom: '24px' }}>
                <h5 style={{ marginBottom: '12px', color: 'var(--chalk)', fontSize: '13px', fontWeight: 600 }}>
                  {failType.label} ({failType.details.length})
                </h5>
                {failType.details.map((detail, idx) => (
                  <div key={idx} style={{ marginBottom: '16px', padding: '12px', background: 'var(--charcoal)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '12px', color: 'var(--chalk)' }}>
                      <span><strong>Date:</strong> {detail.date}</span>
                      <span><strong>Course:</strong> {detail.course}</span>
                      <span><strong>Hole:</strong> {detail.hole} (Par {detail.par})</span>
                      <span><strong>Score:</strong> {detail.score}</span>
                    </div>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Shot #</th>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Start Lie</th>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Start Dist</th>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>End Lie</th>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>End Dist</th>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Penalty</th>
                          <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.shots.map((shot, shotIdx) => (
                          <tr key={shotIdx} style={{ borderBottom: '1px solid var(--charcoal)' }}>
                            <td style={{ padding: '4px' }}>{shot.Shot}</td>
                            <td style={{ padding: '4px' }}>{shot['Starting Lie']}</td>
                            <td style={{ padding: '4px' }}>{shot['Starting Distance']}</td>
                            <td style={{ padding: '4px' }}>{shot['Ending Lie']}</td>
                            <td style={{ padding: '4px' }}>{shot['Ending Distance']}</td>
                            <td style={{ padding: '4px' }}>{shot.Penalty}</td>
                            <td style={{ padding: '4px', textAlign: 'right', color: getShotSGColor(shot.calculatedStrokesGained) }}>
                              {formatStrokesGained(shot.calculatedStrokesGained)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Tiger 5 Trend Section - Dual axis chart with stacked bars and line
 */
function Tiger5TrendSection({ trendData }: { trendData: Tiger5TrendDataPoint[] }) {
  if (trendData.length === 0) {
    return null;
  }

  // Colors matching Tiger 5 stat cards
  const COLORS = {
    threePutts: '#3D8EF0',    // Royal Blue
    bogeyOnPar5: '#A855F7',   // Court Purple
    doubleBogey: '#06C8E0',   // Aqua
    bogeyApproach: '#D4F000', // Volt
    missedGreen: '#F03DAA',  // Magenta
  };

  // Format x-axis label as "Date - Course"
  const formattedData = trendData.map(d => ({
    ...d,
    label: `${d.date.substring(5)} - ${d.course}`,
  }));

  return (
    <div style={{ marginTop: '24px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Tiger 5 Trend</h4>
      <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ash)" opacity={0.3} />
            <XAxis 
              dataKey="label" 
              stroke="var(--ash)" 
              tick={{ fill: 'var(--ash)', fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="left" 
              stroke="var(--ash)" 
              tick={{ fill: 'var(--ash)', fontSize: 11 }}
              label={{ value: 'Tiger 5 Fails', angle: -90, position: 'insideLeft', fill: 'var(--ash)', fontSize: 11 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="var(--ash)" 
              tick={{ fill: 'var(--ash)', fontSize: 11 }}
              domain={[(dataMin: number) => dataMin - 5, (dataMax: number) => dataMax + 5]}
              label={{ value: 'Score', angle: 90, position: 'insideRight', fill: 'var(--ash)', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px', padding: '12px' }}
              labelStyle={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}
              itemStyle={{ color: 'var(--cement)', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar yAxisId="left" dataKey="threePutts" name="3 Putts" stackId="a" fill={COLORS.threePutts} />
            <Bar yAxisId="left" dataKey="bogeyOnPar5" name="Bogey on Par 5" stackId="a" fill={COLORS.bogeyOnPar5} />
            <Bar yAxisId="left" dataKey="doubleBogey" name="Double Bogey" stackId="a" fill={COLORS.doubleBogey} />
            <Bar yAxisId="left" dataKey="bogeyApproach" name="Bogey: Approach <125" stackId="a" fill={COLORS.bogeyApproach} />
            <Bar yAxisId="left" dataKey="missedGreen" name="Missed Green" stackId="a" fill={COLORS.missedGreen} />
            <Line yAxisId="right" type="monotone" dataKey="totalScore" name="Score" stroke="var(--scarlet)" strokeWidth={3} dot={{ fill: 'var(--scarlet)', r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Potential Score Section - Shows what scores could be if Tiger 5 fails reduced by 50%
 */
function PotentialScoreSection({ 
  trendData, 
  tiger5Fails, 
  totalRounds 
}: { 
  trendData: Tiger5TrendDataPoint[]; 
  tiger5Fails: Tiger5Fail; 
  totalRounds: number;
}) {
  if (trendData.length === 0 || tiger5Fails.totalFails === 0) {
    return null;
  }

  // Calculate average strokes lost per Tiger 5 fail
  const avgStrokesLostPerFail = tiger5Fails.totalFails > 0 
    ? Math.abs(tiger5Fails.sgOnFailHoles) / tiger5Fails.totalFails 
    : 0;

  // Calculate potential score for each round
  const potentialData = trendData.map(d => {
    const totalFails = d.threePutts + d.bogeyOnPar5 + d.doubleBogey + d.bogeyApproach + d.missedGreen;
    // If we reduce fails by 50%, we save half the strokes lost per fail
    const strokesSaved = totalFails * 0.5 * avgStrokesLostPerFail;
    const potentialScore = d.totalScore - strokesSaved;
    
    return {
      ...d,
      label: `${d.date.substring(5)} - ${d.course}`,
      totalFails,
      strokesSaved,
      potentialScore: Math.round(potentialScore * 10) / 10,
    };
  });

  // Calculate totals
  const avgActualScore = potentialData.reduce((sum, d) => sum + d.totalScore, 0) / potentialData.length;
  const avgPotentialScore = potentialData.reduce((sum, d) => sum + d.potentialScore, 0) / potentialData.length;
  const totalStrokesSaved = potentialData.reduce((sum, d) => sum + d.strokesSaved, 0);

  return (
    <div style={{ marginTop: '24px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>What If: Tiger 5 Fails Reduced by 50%?</h4>
      
      {/* Chart */}
      <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={potentialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ash)" opacity={0.3} />
            <XAxis 
              dataKey="label" 
              stroke="var(--ash)" 
              tick={{ fill: 'var(--ash)', fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="var(--ash)" 
              tick={{ fill: 'var(--ash)', fontSize: 11 }}
              domain={['dataMin - 5', 'dataMax + 5']}
              label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: 'var(--ash)', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px', padding: '12px' }}
              labelStyle={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}
              itemStyle={{ color: 'var(--cement)', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="totalScore" name="Actual Score" fill="var(--pitch)" />
            <Bar dataKey="potentialScore" name="Potential Score" fill="var(--chalk)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
        <div className="card-stat" style={{ borderLeft: '3px solid var(--pitch)' }}>
          <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Average Score</div>
          <div className="value-stat" style={{ color: 'var(--pitch)' }}>{avgActualScore.toFixed(1)}</div>
          <div className="label" style={{ marginTop: '8px', color: 'var(--ash)', fontSize: '11px' }}>
            Actual average across {totalRounds} rounds
          </div>
        </div>
        
        <div className="card-stat" style={{ borderLeft: '3px solid var(--chalk)' }}>
          <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Potential Average</div>
          <div className="value-stat" style={{ color: 'var(--chalk)' }}>{avgPotentialScore.toFixed(1)}</div>
          <div className="label" style={{ marginTop: '8px', color: 'var(--ash)', fontSize: '11px' }}>
            If Tiger 5 fails reduced by 50%
          </div>
        </div>
        
        <div className="card-stat" style={{ borderLeft: '3px solid var(--chalk)' }}>
          <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Total Strokes Saved</div>
          <div className="value-stat" style={{ color: 'var(--chalk)' }}>{totalStrokesSaved.toFixed(1)}</div>
          <div className="label" style={{ marginTop: '8px', color: 'var(--ash)', fontSize: '11px' }}>
            Across all rounds
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Strokes Gained View - Hero card + stat cards for each shot type
 * SG Driving, SG Approach, SG Putting, SG Short Game, SG Recovery + Other
 */
function StrokesGainedView({ metrics, filteredShots }: { metrics: Tiger5Metrics; filteredShots: ProcessedShot[] }) {
  const { totalStrokesGained, byCategory, sgSeparators } = metrics;
  const [sgDisplayMode, setSgDisplayMode] = useState<'total' | 'average'>('total');

  // Calculate total holes played (unique round-hole combinations)
  const uniqueHoles = new Set(filteredShots.map(s => `${s['Round ID']}-${s.Hole}`));
  const totalHoles = uniqueHoles.size;
  const sgPerHole = totalHoles > 0 ? totalStrokesGained / totalHoles : 0;

  // Build SG per hole by shot type data
  const shotTypes = ['Driving', 'Approach', 'Short Game', 'Putting', 'Other'] as const;
  type TableShotType = typeof shotTypes[number];

  // Initialize data structure: shotType -> hole -> { totalSG, shotCount, avgSG }
  const sgByHoleAndType = new Map<TableShotType, Map<number, { totalSG: number; shotCount: number; avgSG: number }>>();

  shotTypes.forEach(st => {
    sgByHoleAndType.set(st, new Map());
  });

  // Process each shot
  filteredShots.forEach(shot => {
    // Map shotType to our table categories
    let tableShotType: TableShotType;
    switch (shot.shotType) {
      case 'Drive':
        tableShotType = 'Driving';
        break;
      case 'Approach':
        tableShotType = 'Approach';
        break;
      case 'Short Game':
        tableShotType = 'Short Game';
        break;
      case 'Putt':
        tableShotType = 'Putting';
        break;
      case 'Recovery':
      default:
        tableShotType = 'Other';
        break;
    }

    const holeMap = sgByHoleAndType.get(tableShotType)!;
    const holeData = holeMap.get(shot.Hole) || { totalSG: 0, shotCount: 0, avgSG: 0 };
    holeData.totalSG += shot.calculatedStrokesGained;
    holeData.shotCount += 1;
    holeData.avgSG = holeData.shotCount > 0 ? holeData.totalSG / holeData.shotCount : 0;
    holeMap.set(shot.Hole, holeData);
  });

  // Calculate totals for each shot type
  const totalsByShotType = new Map<TableShotType, { totalSG: number; shotCount: number; avgSG: number }>();
  shotTypes.forEach(st => {
    const holeMap = sgByHoleAndType.get(st)!;
    let totalSG = 0;
    let shotCount = 0;
    holeMap.forEach(holeData => {
      totalSG += holeData.totalSG;
      shotCount += holeData.shotCount;
    });
    totalsByShotType.set(st, {
      totalSG,
      shotCount,
      avgSG: shotCount > 0 ? totalSG / shotCount : 0
    });
  });

  // Calculate totals for each hole (across all shot types)
  const totalsByHole = new Map<number, { totalSG: number; shotCount: number; avgSG: number }>();
  for (let hole = 1; hole <= 18; hole++) {
    let totalSG = 0;
    let shotCount = 0;
    shotTypes.forEach(st => {
      const holeMap = sgByHoleAndType.get(st)!;
      const holeData = holeMap.get(hole);
      if (holeData) {
        totalSG += holeData.totalSG;
        shotCount += holeData.shotCount;
      }
    });
    totalsByHole.set(hole, {
      totalSG,
      shotCount,
      avgSG: shotCount > 0 ? totalSG / shotCount : 0
    });
  }

  // Build category data for stat cards
  // Map existing categories: Drive, Approach, Short Game, Putt
  // For Recovery + Other: combine Recovery shots with any edge cases
  const categoryData = byCategory.map(cat => ({
    type: cat.type,
    totalShots: cat.totalShots,
    strokesGained: cat.strokesGained,
    avgStrokesGained: cat.avgStrokesGained,
  }));

  // Find Recovery shots for "Recovery + Other"
  const recoveryShots = filteredShots.filter(s => s.shotType === 'Recovery');
  const recoverySG = recoveryShots.reduce((sum, s) => sum + s.calculatedStrokesGained, 0);

  // Build stat cards data
  const statCards = [
    {
      id: 'driving',
      label: 'Driving',
      category: categoryData.find(c => c.type === 'Drive'),
      accentColor: '',
    },
    {
      id: 'approach',
      label: 'Approach',
      category: categoryData.find(c => c.type === 'Approach'),
      accentColor: '',
    },
    {
      id: 'putting',
      label: 'Putting',
      category: categoryData.find(c => c.type === 'Putt'),
      accentColor: '',
    },
    {
      id: 'shortgame',
      label: 'Short Game',
      category: categoryData.find(c => c.type === 'Short Game'),
      accentColor: '',
    },
    {
      id: 'recovery',
      label: 'Recovery + Other',
      category: {
        type: 'Recovery + Other',
        totalShots: recoveryShots.length,
        strokesGained: recoverySG,
        avgStrokesGained: recoveryShots.length > 0 ? recoverySG / recoveryShots.length : 0,
      },
      accentColor: '',
    },
  ];

  // Find highest and lowest SG values for accent colors
  const sgValues = statCards.map(card => card.category?.avgStrokesGained ?? 0);
  const highestSG = Math.max(...sgValues);
  const lowestSG = Math.min(...sgValues);

  // Apply accent colors (green for highest, red for lowest)
  statCards.forEach(card => {
    const sg = card.category?.avgStrokesGained ?? 0;
    if (sg === highestSG && highestSG !== lowestSG) {
      card.accentColor = 'var(--under)'; // Green
    } else if (sg === lowestSG && highestSG !== lowestSG) {
      card.accentColor = 'var(--scarlet)'; // Red
    }
  });

  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Strokes Gained</h4>

      {/* Hero Card - Total SG */}
      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '16px', maxWidth: '400px' }}>
        <div className="card-hero is-flagship">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--scarlet)' }}>Total SG</div>
            <div style={{ width: '6px', height: '6px', background: 'var(--scarlet)', borderRadius: '50%' }}></div>
          </div>
          <div className="value-hero" style={{ color: getStrokeGainedColor(totalStrokesGained) }}>
            {formatStrokesGained(totalStrokesGained)}
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>SG / Hole</div>
              <div className="value-stat" style={{ color: getStrokeGainedColor(sgPerHole) }}>
                {formatStrokesGained(sgPerHole)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Total Holes</div>
              <div className="value-stat">{totalHoles}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards - SG by Shot Type */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '24px' }}>
        {statCards.map((card) => {
          const cat = card.category;
          if (!cat || cat.totalShots === 0) return null;
          
          return (
            <div 
              key={card.id} 
              className="card-stat"
              style={{ 
                borderLeft: card.accentColor ? `3px solid ${card.accentColor}` : '3px solid var(--pitch)',
                background: card.accentColor ? 'var(--shadow)' : 'var(--shadow)',
              }}
            >
              <div className="label" style={{ color: 'var(--ash)', marginBottom: '12px' }}>
                {card.label}
              </div>
              <div 
                className="value-stat" 
                style={{ color: getStrokeGainedColor(cat.strokesGained) }}
              >
                {formatStrokesGained(cat.strokesGained)}
              </div>
              <div className="flex justify-between" style={{ marginTop: '12px' }}>
                <div>
                  <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>SG / Shot</div>
                  <div 
                    className="value-stat" 
                    style={{ color: getStrokeGainedColor(cat.avgStrokesGained), fontSize: '12px' }}
                  >
                    {formatStrokesGained(cat.avgStrokesGained)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Shots</div>
                  <div className="value-stat" style={{ fontSize: '12px' }}>{cat.totalShots}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend for accents */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '11px', color: 'var(--ash)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--under)', borderRadius: '2px' }}></div>
          <span>Highest SG</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--scarlet)', borderRadius: '2px' }}></div>
          <span>Lowest SG</span>
        </div>
      </div>

      {/* SG Separators Section - Distance-based SG breakdown */}
      <div style={{ marginTop: '32px' }}>
        <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Strokes Gained Separators</h4>
        <p style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>
          SG breakdown by distance categories
        </p>
        
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {sgSeparators.map((separator) => {
            return (
              <div 
                key={separator.label} 
                className="card-stat"
                style={{ borderLeft: '3px solid var(--pitch)' }}
              >
                <div className="label" style={{ color: 'var(--ash)', marginBottom: '4px', fontSize: '12px' }}>
                  {separator.label}
                </div>
                <div className="label" style={{ color: 'var(--ash)', marginBottom: '12px', fontSize: '10px' }}>
                  {separator.description}
                </div>
                <div 
                  className="value-stat" 
                  style={{ color: getStrokeGainedColor(separator.strokesGained) }}
                >
                  {formatStrokesGained(separator.strokesGained)}
                </div>
                <div className="flex justify-between" style={{ marginTop: '12px' }}>
                  <div>
                    <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>SG / Shot</div>
                    <div 
                      className="value-stat" 
                      style={{ color: getStrokeGainedColor(separator.avgStrokesGained), fontSize: '12px' }}
                    >
                      {formatStrokesGained(separator.avgStrokesGained)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Shots</div>
                    <div className="value-stat" style={{ fontSize: '12px' }}>{separator.totalShots}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SG Per Hole By Shot Type Table */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: 'var(--ash)' }}>SG by Hole & Shot Type</h4>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--ash)', fontSize: '12px' }}>
              <input
                type="radio"
                name="sgDisplayMode"
                checked={sgDisplayMode === 'total'}
                onChange={() => setSgDisplayMode('total')}
                style={{ accentColor: 'var(--scarlet)' }}
              />
              Total SG
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--ash)', fontSize: '12px' }}>
              <input
                type="radio"
                name="sgDisplayMode"
                checked={sgDisplayMode === 'average'}
                onChange={() => setSgDisplayMode('average')}
                style={{ accentColor: 'var(--scarlet)' }}
              />
              Avg SG / Shot
            </label>
          </div>
        </div>

        <div style={{ background: 'var(--charcoal)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ash)', fontWeight: 600, background: 'var(--obsidian)', position: 'sticky', left: 0, zIndex: 1 }}>
                    Shot Type
                  </th>
                  {[...Array(18)].map((_, i) => (
                    <th key={i + 1} style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--ash)', fontWeight: 600, minWidth: '40px' }}>
                      {i + 1}
                    </th>
                  ))}
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--ash)', fontWeight: 600, background: 'var(--obsidian)', minWidth: '50px' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {shotTypes.map((shotType) => {
                  const holeMap = sgByHoleAndType.get(shotType)!;
                  const totals = totalsByShotType.get(shotType)!;
                  
                  return (
                    <tr key={shotType} style={{ borderBottom: '1px solid var(--pitch)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)', position: 'sticky', left: 0, zIndex: 1 }}>
                        {shotType}
                      </td>
                      {[...Array(18)].map((_, i) => {
                        const holeNum = i + 1;
                        const holeData = holeMap.get(holeNum);
                        const value = holeData ? (sgDisplayMode === 'total' ? holeData.totalSG : holeData.avgSG) : 0;
                        const hasData = holeData && holeData.shotCount > 0;
                        
                        return (
                          <td
                            key={holeNum}
                            style={{
                              padding: '8px 4px',
                              textAlign: 'center',
                              color: hasData ? getStrokeGainedColor(value) : 'var(--ash)',
                              opacity: hasData ? 1 : 0.3,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px'
                            }}
                          >
                            {hasData ? formatStrokesGained(value) : '-'}
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          color: getStrokeGainedColor(sgDisplayMode === 'total' ? totals.totalSG : totals.avgSG),
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: 'var(--obsidian)'
                        }}
                      >
                        {formatStrokesGained(sgDisplayMode === 'total' ? totals.totalSG : totals.avgSG)}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row - sums across all shot types for each hole */}
                <tr style={{ borderTop: '2px solid var(--pitch)', background: 'var(--obsidian)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--chalk)', fontWeight: 700, position: 'sticky', left: 0, zIndex: 1 }}>
                    Total
                  </td>
                  {[...Array(18)].map((_, i) => {
                    const holeNum = i + 1;
                    const holeTotal = totalsByHole.get(holeNum)!;
                    const value = sgDisplayMode === 'total' ? holeTotal.totalSG : holeTotal.avgSG;
                    const hasData = holeTotal.shotCount > 0;
                    
                    return (
                      <td
                        key={holeNum}
                        style={{
                          padding: '10px 4px',
                          textAlign: 'center',
                          color: hasData ? getStrokeGainedColor(value) : 'var(--ash)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                      >
                        {hasData ? formatStrokesGained(value) : '-'}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: getStrokeGainedColor(sgDisplayMode === 'total' ? totalStrokesGained : metrics.avgStrokesGained),
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 700
                    }}
                  >
                    {formatStrokesGained(sgDisplayMode === 'total' ? totalStrokesGained : metrics.avgStrokesGained)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Strokes Gained Trend Chart */}
      <StrokesGainedTrendChart filteredShots={filteredShots} />
    </div>
  )
}

/**
 * Root Cause Section - Shows the root cause of Tiger 5 fails
 * For each Tiger 5 fail hole, identifies the shot with lowest SG as the root cause
 */
function RootCauseSection({ rootCause, totalFailHoles }: { rootCause: RootCauseMetrics; totalFailHoles: number }) {
  // Root cause card data - ordered as: penalty, driving, approach, lag putts, makeable putts, short game, recovery
  const rootCauseCards = [
    { 
      label: 'Penalties', 
      value: rootCause.penalties,
      sgValue: rootCause.penaltiesSG,
      color: '#F03DAA'  // Magenta
    },
    { 
      label: 'Driving', 
      value: rootCause.driving,
      sgValue: rootCause.drivingSG,
      color: '#A855F7'  // Court Purple
    },
    { 
      label: 'Approach', 
      value: rootCause.approach,
      sgValue: rootCause.approachSG,
      color: '#D4F000'  // Volt
    },
    { 
      label: 'Lag Putts (13+)', 
      value: rootCause.lagPutts,
      sgValue: rootCause.lagPuttsSG,
      color: '#06C8E0'  // Aqua
    },
    { 
      label: 'Makeable Putts (0-12)', 
      value: rootCause.makeablePutts,
      sgValue: rootCause.makeablePuttsSG,
      color: '#3D8EF0'  // Royal Blue
    },
    { 
      label: 'Short Game', 
      value: rootCause.shortGame,
      sgValue: rootCause.shortGameSG,
      color: '#FF8C00'  // Orange
    },
    { 
      label: 'Recovery', 
      value: rootCause.recovery,
      sgValue: rootCause.recoverySG,
      color: '#10B981'  // Emerald
    },
  ];

  return (
    <div style={{ marginTop: '24px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Tiger 5: Root Cause</h4>
      <p style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>
        Shot with lowest SG on each Tiger 5 fail hole ({totalFailHoles} total fails)
      </p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {rootCauseCards.map((card) => {
          const percentage = totalFailHoles > 0 ? (card.value / totalFailHoles) * 100 : 0;
          return (
            <div 
              key={card.label} 
              className="card-stat" 
              style={{ borderLeft: `3px solid ${card.color}` }}
            >
              <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
                {card.label}
              </div>
              <div className="value-stat">{card.value}</div>
              <div style={{ marginTop: '8px' }}>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>% of Fails</div>
                <div className="value-stat" style={{ fontSize: '11px' }}>{percentage.toFixed(1)}%</div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>Total SG</div>
                <div className="value-stat" style={{ fontSize: '11px', color: getStrokeGainedColor(card.sgValue) }}>
                  {formatStrokesGained(card.sgValue)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Driving View - Hero cards for driving metrics
 * - Penalty Rate (OB counts double)
 * - Driving Distance (75th percentile)
 * - Total Strokes Gained - Driving
 * - Fairway Hit Percentage
 * - Driving Analysis section with charts
 */
function DrivingView({ metrics, analysis, filteredShots }: { metrics: DrivingMetrics; analysis: DrivingAnalysis; filteredShots: ProcessedShot[] }) {
  const [driveFilter, setDriveFilter] = useState<'all' | 'driver' | 'non-driver'>('all');

  // Filter shots based on drive type
  // Driver = Did not Hit Driver is "No" or blank/empty
  // Non Driver = Did not Hit Driver is "Yes"
  const filteredDrives = useMemo(() => {
    return filteredShots.filter(shot => {
      if (driveFilter === 'all') return shot.shotType === 'Drive';
      if (driveFilter === 'driver') {
        return shot.shotType === 'Drive' && 
          (shot['Did not Hit Driver'] === 'No' || shot['Did not Hit Driver'] === '' || shot['Did not Hit Driver'] === undefined);
      }
      if (driveFilter === 'non-driver') return shot.shotType === 'Drive' && shot['Did not Hit Driver'] === 'Yes';
      return false;
    });
  }, [filteredShots, driveFilter]);

  // Recalculate metrics based on filtered drives
  const filteredMetrics = useMemo(() => {
    const drives = filteredDrives;
    const totalDrives = drives.length;
    
    if (totalDrives === 0) {
      return {
        ...metrics,
        totalDrives: 0,
        fairwayPct: 0,
        drivingSG: 0,
        avgDrivingSG: 0,
        fairwayPctDriver: 0,
        fairwayPctNonDriver: 0,
        drivingDistance75th: 0,
        penaltyRate: 0,
        positiveSGPct: 0,
        totalPenalties: 0,
        obPenalties: 0,
        otherPenalties: 0,
        sgPenalties: 0,
      };
    }

    // Calculate fairways
    const fairwaysHit = drives.filter(d => d['Ending Lie'] === 'Fairway').length;
    const fairwayPct = (fairwaysHit / totalDrives) * 100;

    // Calculate SG
    const drivingSG = drives.reduce((sum, d) => sum + d.calculatedStrokesGained, 0);
    const avgDrivingSG = drivingSG / totalDrives;

    // Fairway % by driver type
    const driverDrives = drives.filter(d => d['Did not Hit Driver'] === 'No' || d['Did not Hit Driver'] === '' || d['Did not Hit Driver'] === undefined);
    const nonDriverDrives = drives.filter(d => d['Did not Hit Driver'] === 'Yes');
    
    const driverFairways = driverDrives.filter(d => d['Ending Lie'] === 'Fairway').length;
    const nonDriverFairways = nonDriverDrives.filter(d => d['Ending Lie'] === 'Fairway').length;

    // Calculate driving distance (75th percentile)
    const driveDistances = drives.map(d => Math.abs(d['Starting Distance'] - d['Ending Distance'])).sort((a, b) => a - b);
    const distance75thIndex = Math.floor(driveDistances.length * 0.75);
    const drivingDistance75th = driveDistances[distance75thIndex] || 0;

    // Calculate penalty rate
    const obPenalties = drives.filter(d => d.Penalty === 'Yes' && (d['Ending Lie'] === 'Out of Bounds' || d['Ending Lie'] === 'OB')).length;
    const otherPenalties = drives.filter(d => d.Penalty === 'Yes' && d['Ending Lie'] !== 'Out of Bounds' && d['Ending Lie'] !== 'OB').length;
    const totalPenalties = obPenalties + otherPenalties;
    const penaltyRate = ((obPenalties * 2 + otherPenalties) / totalDrives) * 100;
    const sgPenalties = drives.filter(d => d.Penalty === 'Yes').reduce((sum, d) => sum + d.calculatedStrokesGained, 0);

    // Calculate positive SG percentage
    const positiveDrives = drives.filter(d => d.calculatedStrokesGained > 0).length;
    const positiveSGPct = (positiveDrives / totalDrives) * 100;

    return {
      ...metrics,
      totalDrives,
      fairwayPct,
      drivingSG,
      avgDrivingSG,
      fairwayPctDriver: driverDrives.length > 0 ? (driverFairways / driverDrives.length) * 100 : 0,
      fairwayPctNonDriver: nonDriverDrives.length > 0 ? (nonDriverFairways / nonDriverDrives.length) * 100 : 0,
      drivingDistance75th,
      penaltyRate,
      positiveSGPct,
      totalPenalties,
      obPenalties,
      otherPenalties,
      sgPenalties,
    };
  }, [filteredDrives, metrics]);

  const { 
    totalDrives, 
    fairwayPct, 
    drivingSG, 
    avgDrivingSG, 
    drivingDistance75th,
    obPenalties: _obPenalties,
    otherPenalties: _otherPenalties,
    penaltyRate,
    sgPenalties,
    fairwayPctDriver,
    fairwayPctNonDriver,
    positiveSGPct,
  } = filteredMetrics;

  // Calculate Problem Drive metrics from filtered drives
  const problemMetrics = useMemo(() => {
    return calculateProblemDriveMetrics(filteredDrives);
  }, [filteredDrives]);

  // Filter analysis data based on drive type - always use actual ending lie (no grouping)
  const filteredAnalysis = useMemo(() => {
    // Recalculate ending locations using actual ending lie
    const endingLocationsMap = new Map<string, { count: number; strokesGained: number }>();
    
    filteredDrives.forEach(drive => {
      const location = drive['Ending Lie'] as string;
      const existing = endingLocationsMap.get(location) || { count: 0, strokesGained: 0 };
      existing.count += 1;
      existing.strokesGained += drive.calculatedStrokesGained;
      endingLocationsMap.set(location, existing);
    });
    
    const totalDrives = filteredDrives.length;
    const endingLocations = Array.from(endingLocationsMap.entries())
      .map(([location, data]) => ({
        location: location as 'Fairway' | 'Rough' | 'Recovery' | 'Sand' | 'Green' | 'Tee' | 'Out of Bounds' | 'Water' | 'Penalty Area' | 'Other',
        count: data.count,
        percentage: totalDrives > 0 ? (data.count / totalDrives) * 100 : 0,
        strokesGained: data.strokesGained,
        avgStrokesGained: data.count > 0 ? data.strokesGained / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      ...analysis,
      endingLocations,
    };
  }, [analysis, filteredDrives]);

  return (
    <div className="content">
      {/* Section Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ color: 'var(--ash)' }}>Driving Performance</h4>
        
        {/* Drive Type Filter Radio Buttons */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: driveFilter === 'all' ? 'var(--chalk)' : 'var(--ash)', fontSize: '13px' }}>
            <input
              type="radio"
              name="driveFilter"
              value="all"
              checked={driveFilter === 'all'}
              onChange={() => setDriveFilter('all')}
              style={{ accentColor: 'var(--scarlet)' }}
            />
            All Drives
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: driveFilter === 'driver' ? 'var(--chalk)' : 'var(--ash)', fontSize: '13px' }}>
            <input
              type="radio"
              name="driveFilter"
              value="driver"
              checked={driveFilter === 'driver'}
              onChange={() => setDriveFilter('driver')}
              style={{ accentColor: 'var(--scarlet)' }}
            />
            Driver
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: driveFilter === 'non-driver' ? 'var(--chalk)' : 'var(--ash)', fontSize: '13px' }}>
            <input
              type="radio"
              name="driveFilter"
              value="non-driver"
              checked={driveFilter === 'non-driver'}
              onChange={() => setDriveFilter('non-driver')}
              style={{ accentColor: 'var(--scarlet)' }}
            />
            Non Driver
          </label>
        </div>
      </div>
      
      {/* Hero Cards - 4 metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        
        {/* Card 1: Penalty Rate */}
        <div className="card-hero is-flagship">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--scarlet)' }}>Penalty Rate</div>
            <div style={{ width: '6px', height: '6px', background: 'var(--scarlet)', borderRadius: '50%' }}></div>
          </div>
          <div className="value-hero" style={{ color: getPenaltyRateColor(penaltyRate) }}>
            {penaltyRate.toFixed(1)}%
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>SG Penalties</div>
            <div className="value-stat" style={{ color: getStrokeGainedColor(sgPenalties) }}>
              {formatStrokesGained(sgPenalties)}
            </div>
          </div>
        </div>

        {/* Card 2: Driving Distance (75th percentile) */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Distance (75th %)</div>
          </div>
          <div className="value-hero" style={{ color: 'var(--chalk)' }}>
            {drivingDistance75th.toFixed(0)} <span style={{ fontSize: '18px' }}>yds</span>
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>Total Drives</div>
            <div className="value-stat">{totalDrives}</div>
          </div>
        </div>

        {/* Card 3: Total SG - Driving */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>SG - Driving</div>
          </div>
          <div className="value-hero" style={{ color: getStrokeGainedColor(drivingSG) }}>
            {formatStrokesGained(drivingSG)}
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>SG / Drive</div>
              <div className="value-stat" style={{ color: getStrokeGainedColor(avgDrivingSG) }}>
                {formatStrokesGained(avgDrivingSG)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>+ Drives</div>
              <div className="value-stat">{positiveSGPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Card 4: Fairway Hit % */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>
              {driveFilter === 'all' ? 'Fairway %' : driveFilter === 'driver' ? 'Fairway % (Driver)' : 'Fairway % (Non Driver)'}
            </div>
          </div>
          <div className="value-hero" style={{ color: getFairwayPctColor(fairwayPct) }}>
            {fairwayPct.toFixed(1)}%
          </div>
          {driveFilter === 'all' && (
            <div className="flex justify-between" style={{ marginTop: '16px' }}>
              <div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Driver</div>
                <div className="value-stat" style={{ color: getFairwayPctColor(fairwayPctDriver) }}>
                  {fairwayPctDriver.toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Non-Driver</div>
                <div className="value-stat" style={{ color: getFairwayPctColor(fairwayPctNonDriver) }}>
                  {fairwayPctNonDriver.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Driving Analysis Section */}
      <DrivingAnalysisSection analysis={filteredAnalysis} totalDrives={totalDrives} />

      {/* Problem Drive Section */}
      <ProblemDriveSection metrics={problemMetrics} />

      {/* All Drives Table - Collapsible */}
      <DrivesTableSection shots={filteredDrives} />
    </div>
  );
}

/**
 * Driving Analysis Section - Donut and Bar charts for drive analysis
 */
function DrivingAnalysisSection({ analysis, totalDrives }: { analysis: DrivingAnalysis; totalDrives: number }) {
  const { endingLocations } = analysis;

  // Map location types to chart colors - each location has a distinct color
  const LOCATION_COLORS: Record<string, string> = {
    'Fairway': '#3D8EF0',      // Royal Blue
    'Rough': '#A855F7',         // Court Purple
    'Recovery': '#06C8E0',      // Aqua
    'Sand': '#D4F000',          // Volt
    'Green': '#F03DAA',         // Magenta
    'Tee': '#FF8C00',           // Orange
    'Out of Bounds': '#EF4444', // Red
    'Water': '#3D8EF0',         // Royal Blue (same as Fairway for water)
    'Penalty Area': '#A855F7',  // Court Purple (same as Rough)
    'Other': '#6B7280',         // Gray
  };

  // Format data for donut chart
  const donutData = endingLocations.map(loc => ({
    name: loc.location,
    value: loc.count,
    percentage: loc.percentage.toFixed(1),
    strokesGained: loc.strokesGained,
    avgStrokesGained: loc.avgStrokesGained,
  }));

  // Custom tooltip for donut chart
  const DonutTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof donutData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--court)',
        border: '1px solid var(--scarlet)',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}>
          {data.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Count: <span style={{ color: 'var(--chalk)' }}>{data.value}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Percentage: <span style={{ color: 'var(--chalk)' }}>{data.percentage}%</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)' }}>
          Avg SG: <span style={{ color: getStrokeGainedColor(data.avgStrokesGained) }}>
            {formatStrokesGained(data.avgStrokesGained)}
          </span>
        </div>
      </div>
    );
  };

  // Custom tooltip for SG by location horizontal bar chart
  const LocationSGTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { strokesGained: number; avgStrokesGained: number; count: number; location: string } }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--court)',
        border: '1px solid var(--scarlet)',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}>
          {data.location}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Total SG: <span style={{ color: getStrokeGainedColor(data.strokesGained) }}>
            {formatStrokesGained(data.strokesGained)}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Avg SG: <span style={{ color: getStrokeGainedColor(data.avgStrokesGained) }}>
            {formatStrokesGained(data.avgStrokesGained)}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)' }}>
          Count: <span style={{ color: 'var(--chalk)' }}>{data.count}</span>
        </div>
      </div>
    );
  };

  if (endingLocations.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Driving Analysis</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Donut Chart - Drive Ending Locations */}
        {endingLocations.length > 0 && (
          <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
            <h5 style={{ marginBottom: '12px', color: 'var(--chalk)', fontSize: '14px', fontWeight: 600 }}>
              Drive Ending Locations
            </h5>
            <p style={{ fontSize: '11px', color: 'var(--ash)', marginBottom: '16px' }}>
              Percentage breakdown of where drives end up
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                >
                  {donutData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={LOCATION_COLORS[entry.name] || '#6B7280'}
                      stroke="var(--charcoal)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                {/* Center text showing total drives - separate from data to avoid tooltip issues */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--chalk)"
                  style={{ fontSize: '24px', fontWeight: 'bold' }}
                >
                  {totalDrives}
                </text>
                <Tooltip content={<DonutTooltip />} />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value) => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Horizontal Bar Chart - SG by Ending Location */}
        {endingLocations.length > 0 && (
          <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
            <h5 style={{ marginBottom: '12px', color: 'var(--chalk)', fontSize: '14px', fontWeight: 600 }}>
              SG by Ending Location
            </h5>
            <p style={{ fontSize: '11px', color: 'var(--ash)', marginBottom: '16px' }}>
              Total Strokes Gained by where drives end up
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                data={endingLocations} 
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ash)" opacity={0.3} horizontal={false} />
                <XAxis 
                  type="number"
                  stroke="var(--ash)" 
                  tick={{ fill: 'var(--ash)', fontSize: 11 }}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <YAxis 
                  type="category"
                  dataKey="location" 
                  stroke="var(--ash)" 
                  tick={{ fill: 'var(--ash)', fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<LocationSGTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={() => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Total SG</span>}
                />
                <Bar 
                  dataKey="strokesGained" 
                  name="Total SG"
                  radius={[0, 4, 4, 0]}
                >
                  {endingLocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={LOCATION_COLORS[entry.location] || chartColors[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Drives Table Section - Collapsible table showing all drives
 * Columns: Course, Hole, Starting Distance, Ending Distance, Ending Lie, Penalty, SG
 */
function DrivesTableSection({ shots }: { shots: ProcessedShot[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for drives only
  const drives = shots.filter(shot => shot.shotType === 'Drive');

  // Group drives by round (date + course)
  const drivesByRound = drives.reduce((acc, drive) => {
    const key = `${drive.Date}|${drive.Course}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(drive);
    return acc;
  }, {} as Record<string, ProcessedShot[]>);

  // Sort rounds by date (most recent first)
  const sortedRounds = Object.entries(drivesByRound).sort((a, b) => {
    const dateA = a[0].split('|')[0];
    const dateB = b[0].split('|')[0];
    return dateB.localeCompare(dateA);
  });

  if (drives.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'var(--charcoal)',
          border: '1px solid var(--ash)',
          borderRadius: '4px',
          color: 'var(--chalk)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 600 }}>All Drives</span>
        <span style={{ fontSize: '12px', color: 'var(--ash)' }}>
          {drives.length} drives • {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {sortedRounds.map(([roundKey, roundDrives]) => {
            const [dateStr, courseStr] = roundKey.split('|');

            return (
              <div key={roundKey} style={{ marginBottom: '16px', padding: '12px', background: 'var(--charcoal)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '12px', color: 'var(--chalk)' }}>
                  <span><strong>Date:</strong> {dateStr}</span>
                  <span><strong>Course:</strong> {courseStr}</span>
                  <span><strong>Drives:</strong> {roundDrives.length}</span>
                </div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '8%' }}>Hole</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>Non Driver</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '11%' }}>Start Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '11%' }}>End Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '15%' }}>End Lie</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>Penalty</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '11%' }}>Driver Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundDrives
                      .sort((a, b) => a.Hole - b.Hole)
                      .map((drive, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{drive.Hole}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: drive['Did not Hit Driver'] === 'Yes' ? 'var(--bogey)' : 'var(--chalk)' }}>
                            {drive['Did not Hit Driver'] === 'Yes' ? 'Yes' : ''}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {drive['Starting Distance']}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {drive['Ending Distance']}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{drive['Ending Lie']}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: drive.Penalty === 'Yes' ? 'var(--scarlet)' : 'transparent' }}>
                            {drive.Penalty === 'Yes' ? 'Yes' : ''}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {drive['Starting Distance'] - drive['Ending Distance']}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: getShotSGColor(drive.calculatedStrokesGained), fontFamily: 'var(--font-mono)' }}>
                            {formatStrokesGained(drive.calculatedStrokesGained)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Problem Drive Section - Shows penalties and obstruction breakdown
 * - Penalties: Total, OB, Standard
 * - Obstruction: Sand + Recovery (drives ending in sand or recovery lie)
 */
function ProblemDriveSection({ metrics }: { metrics: ProblemDriveMetrics }) {
  // Don't render if no drives
  if (metrics.totalDrives === 0) {
    return null;
  }

  // Chart colors for the breakdown items
  const penaltyColors = ['#F03DAA', '#A855F7', '#3D8EF0']; // Magenta, Purple, Blue
  const obstructionColors = ['#06C8E0', '#D4F000']; // Aqua, Volt

  return (
    <div style={{ marginTop: '32px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Problem Drive Analysis</h4>
      <p style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>
        Penalties and obstruction breakdown ({metrics.totalDrives} total drives)
      </p>

      {/* Penalties Breakdown */}
      <div style={{ marginBottom: '24px' }}>
        <h5 style={{ marginBottom: '12px', color: 'var(--chalk)', fontSize: '14px', fontWeight: 600 }}>
          Penalties
        </h5>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Total Penalties */}
          <div className="card-stat" style={{ borderLeft: `3px solid ${penaltyColors[0]}` }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
              Total Penalties
            </div>
            <div className="value-stat">{metrics.totalPenalties}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{metrics.penaltyPct.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
              <div className="value-stat" style={{ fontSize: '12px', color: getStrokeGainedColor(metrics.penaltySG) }}>
                {formatStrokesGained(metrics.penaltySG)}
              </div>
            </div>
          </div>

          {/* OB Penalties */}
          <div className="card-stat" style={{ borderLeft: `3px solid ${penaltyColors[1]}` }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
              OB Penalties
            </div>
            <div className="value-stat">{metrics.obPenalties}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{metrics.obPenaltyPct.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
              <div className="value-stat" style={{ fontSize: '12px', color: getStrokeGainedColor(metrics.obPenaltySG) }}>
                {formatStrokesGained(metrics.obPenaltySG)}
              </div>
            </div>
          </div>

          {/* Standard Penalties */}
          <div className="card-stat" style={{ borderLeft: `3px solid ${penaltyColors[2]}` }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
              Standard Penalties
            </div>
            <div className="value-stat">{metrics.standardPenalties}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{metrics.standardPenaltyPct.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
              <div className="value-stat" style={{ fontSize: '12px', color: getStrokeGainedColor(metrics.standardPenaltySG) }}>
                {formatStrokesGained(metrics.standardPenaltySG)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Obstruction Breakdown */}
      <div>
        <h5 style={{ marginBottom: '12px', color: 'var(--chalk)', fontSize: '14px', fontWeight: 600 }}>
          Obstruction Rate
        </h5>
        <p style={{ fontSize: '11px', color: 'var(--ash)', marginBottom: '12px' }}>
          Drives ending in Sand or Recovery lie
        </p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Total Obstruction */}
          <div className="card-stat" style={{ borderLeft: `3px solid ${obstructionColors[0]}` }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
              Total Obstruction
            </div>
            <div className="value-stat">{metrics.obstructionCount}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{metrics.obstructionPct.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
              <div className="value-stat" style={{ fontSize: '12px', color: getStrokeGainedColor(metrics.obstructionSG) }}>
                {formatStrokesGained(metrics.obstructionSG)}
              </div>
            </div>
          </div>

          {/* Sand */}
          <div className="card-stat" style={{ borderLeft: `3px solid ${obstructionColors[1]}` }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
              Sand
            </div>
            <div className="value-stat">{metrics.sandCount}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{metrics.sandPct.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
              <div className="value-stat" style={{ fontSize: '12px', color: getStrokeGainedColor(metrics.sandSG) }}>
                {formatStrokesGained(metrics.sandSG)}
              </div>
            </div>
          </div>

          {/* Recovery */}
          <div className="card-stat" style={{ borderLeft: `3px solid ${chartColors[4]}` }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px', fontSize: '11px' }}>
              Recovery
            </div>
            <div className="value-stat">{metrics.recoveryCount}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>% of Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{metrics.recoveryPct.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Total SG</div>
              <div className="value-stat" style={{ fontSize: '12px', color: getStrokeGainedColor(metrics.recoverySG) }}>
                {formatStrokesGained(metrics.recoverySG)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Approach View - Hero cards for approach metrics
 * - Total SG Approach
 * - Green Hit % = % of Approach shots with ending lie = Green
 * - Proximity < 150 = average proximity of approach shots <= 150 yards
 */
function ApproachView({ metrics, approachByDistance, approachFromRough, approachHeatMapData, filteredShots }: { metrics: ApproachMetrics; approachByDistance: ApproachDistanceBucket[]; approachFromRough: ApproachDistanceBucket[]; approachHeatMapData: ApproachHeatMapData; filteredShots: ProcessedShot[] }) {
  const { 
    totalApproaches: _totalApproaches,
    approachSG,
    avgApproachSG,
    positiveSGPct,
    positiveSGCount: _positiveSGCount,
    greenHitPct,
    greenHits: _greenHits,
    greenHitPctFairway,
    greenHitsFairway: _greenHitsFairway,
    totalApproachesFairway: _totalApproachesFairway,
    greenHitPctRough,
    greenHitsRough: _greenHitsRough,
    totalApproachesRough: _totalApproachesRough,
    proximityUnder150,
    proximityUnder150Count: _proximityUnder150Count,
    proximityUnder150OnGreen,
    proximityUnder150OnGreenCount: _proximityUnder150OnGreenCount,
    within20FeetPct,
    within20FeetCount: _within20FeetCount,
    approachesOver150: _approachesOver150,
    approachesUnder150: _approachesUnder150,
    greenHitPctOver150: _greenHitPctOver150,
    greenHitPctUnder150: _greenHitPctUnder150,
  } = metrics;

  // Get color for green hit percentage
  const getGreenHitPctColor = (pct: number): string => {
    if (pct >= 50) return 'var(--under)';      // Green
    if (pct >= 35) return 'var(--bogey)';        // Yellow
    return 'var(--double)';                       // Red
  };

  // Get color for proximity (lower is better)
  const getProximityColor = (proximity: number): string => {
    if (proximity <= 30) return 'var(--under)';  // Green
    if (proximity <= 45) return 'var(--bogey)';  // Yellow
    return 'var(--double)';                       // Red
  };

  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Approach Performance</h4>

      {/* Hero Cards - 3 metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        
        {/* Card 1: Total SG Approach */}
        <div className="card-hero is-flagship">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--scarlet)' }}>Total SG Approach</div>
            <div style={{ width: '6px', height: '6px', background: 'var(--scarlet)', borderRadius: '50%' }}></div>
          </div>
          <div className="value-hero" style={{ color: getStrokeGainedColor(approachSG) }}>
            {formatStrokesGained(approachSG)}
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>SG / Shot</div>
              <div className="value-stat" style={{ color: getStrokeGainedColor(avgApproachSG) }}>
                {formatStrokesGained(avgApproachSG)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>+ Approach</div>
              <div className="value-stat">{positiveSGPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Card 2: Green Hit % */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Green Hit %</div>
          </div>
          <div className="value-hero" style={{ color: getGreenHitPctColor(greenHitPct) }}>
            {greenHitPct.toFixed(1)}%
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Fairway</div>
              <div className="value-stat" style={{ color: getGreenHitPctColor(greenHitPctFairway) }}>
                {greenHitPctFairway.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Rough</div>
              <div className="value-stat" style={{ color: getGreenHitPctColor(greenHitPctRough) }}>
                {greenHitPctRough.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Proximity < 150 */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Proximity &lt; 150yds</div>
          </div>
          <div className="value-hero" style={{ color: getProximityColor(proximityUnder150) }}>
            {proximityUnder150.toFixed(1)} <span style={{ fontSize: '18px' }}>ft</span>
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Prox. on Green</div>
              <div className="value-stat" style={{ color: getProximityColor(proximityUnder150OnGreen) }}>
                {proximityUnder150OnGreen.toFixed(1)} ft
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Within 20ft</div>
              <div className="value-stat" style={{ color: getGreenHitPctColor(within20FeetPct) }}>
                {within20FeetPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Approach by Distance Section */}
      {approachByDistance.length > 0 && (
        <>
          <h4 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--ash)' }}>Approach (Fairway and Rough): Approach Skill</h4>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {approachByDistance.map((bucket) => (
              <div key={bucket.label} className="card">
                <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                  <div className="label" style={{ color: 'var(--scarlet)' }}>{bucket.label}</div>
                </div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px', marginBottom: '12px' }}>
                  {bucket.description}
                </div>
                
                {/* Main Value: SG */}
                <div className="value-hero" style={{ color: getStrokeGainedColor(bucket.strokesGained), fontSize: '28px' }}>
                  {formatStrokesGained(bucket.strokesGained)}
                </div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px', marginBottom: '16px' }}>
                  SG ({bucket.totalShots} shots)
                </div>
                
                <div className="flex justify-between">
                  <div>
                    <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Green %</div>
                    <div className="value-stat" style={{ color: getGreenHitPctColor(bucket.greenHitPct), fontSize: '14px' }}>
                      {bucket.greenHitPct.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Prox</div>
                    <div className="value-stat" style={{ color: getProximityColor(bucket.proximity), fontSize: '14px' }}>
                      {bucket.proximity.toFixed(1)} ft
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Approach from Rough Section */}
      {approachFromRough.length > 0 && (
        <>
          <h4 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--ash)' }}>Approach from Rough: Rough Skill</h4>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {approachFromRough.map((bucket) => (
              <div key={bucket.label} className="card">
                <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                  <div className="label" style={{ color: 'var(--scarlet)' }}>{bucket.label}</div>
                </div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px', marginBottom: '12px' }}>
                  {bucket.description}
                </div>
                
                {/* Main Value: SG */}
                <div className="value-hero" style={{ color: getStrokeGainedColor(bucket.strokesGained), fontSize: '28px' }}>
                  {formatStrokesGained(bucket.strokesGained)}
                </div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px', marginBottom: '16px' }}>
                  SG ({bucket.totalShots} shots)
                </div>
                
                <div className="flex justify-between">
                  <div>
                    <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Green %</div>
                    <div className="value-stat" style={{ color: getGreenHitPctColor(bucket.greenHitPct), fontSize: '14px' }}>
                      {bucket.greenHitPct.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="label" style={{ color: 'var(--ash)', fontSize: '10px' }}>Prox</div>
                    <div className="value-stat" style={{ color: getProximityColor(bucket.proximity), fontSize: '14px' }}>
                      {bucket.proximity.toFixed(1)} ft
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Approach Heat Map Section */}
      <ApproachHeatMapSection data={approachHeatMapData} />

      {/* Approach Ending Lie Section - Two Bar Charts */}
      <ApproachEndingLieSection filteredShots={filteredShots} />

      {/* All Approach Shots Table - Collapsible */}
      <ApproachTableSection shots={filteredShots} />
    </div>
  );
}

/**
 * Approach Table Section - Collapsible table showing all approach shots
 * Columns: Date, Course, Hole, Starting Distance, Starting Lie, Ending Distance, Ending Lie, Penalty, SG
 */
function ApproachTableSection({ shots }: { shots: ProcessedShot[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for approach shots only
  const approaches = shots.filter(shot => shot.shotType === 'Approach');

  // Group approaches by round (date + course)
  const approachesByRound = approaches.reduce((acc, approach) => {
    const key = `${approach.Date}|${approach.Course}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(approach);
    return acc;
  }, {} as Record<string, ProcessedShot[]>);

  // Sort rounds by date (most recent first)
  const sortedRounds = Object.entries(approachesByRound).sort((a, b) => {
    const dateA = a[0].split('|')[0];
    const dateB = b[0].split('|')[0];
    return dateB.localeCompare(dateA);
  });

  if (approaches.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'var(--charcoal)',
          border: '1px solid var(--ash)',
          borderRadius: '4px',
          color: 'var(--chalk)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 600 }}>All Approach Shots</span>
        <span style={{ fontSize: '12px', color: 'var(--ash)' }}>
          {approaches.length} approach shots • {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {sortedRounds.map(([roundKey, roundApproaches]) => {
            const [dateStr, courseStr] = roundKey.split('|');

            return (
              <div key={roundKey} style={{ marginBottom: '16px', padding: '12px', background: 'var(--charcoal)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '12px', color: 'var(--chalk)' }}>
                  <span><strong>Date:</strong> {dateStr}</span>
                  <span><strong>Course:</strong> {courseStr}</span>
                  <span><strong>Approach Shots:</strong> {roundApproaches.length}</span>
                </div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '8%' }}>Hole</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>Start Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>Start Lie</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>End Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>End Lie</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>Penalty</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundApproaches
                      .sort((a, b) => a.Hole - b.Hole)
                      .map((approach, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{approach.Hole}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {approach['Starting Distance']}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{approach['Starting Lie']}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {approach['Ending Distance']}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{approach['Ending Lie']}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: approach.Penalty === 'Yes' ? 'var(--scarlet)' : 'transparent' }}>
                            {approach.Penalty === 'Yes' ? 'Yes' : ''}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: getShotSGColor(approach.calculatedStrokesGained), fontFamily: 'var(--font-mono)' }}>
                            {formatStrokesGained(approach.calculatedStrokesGained)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Approach Ending Lie Section - Shows ending lie distribution and SG by ending lie
 */
function ApproachEndingLieSection({ filteredShots }: { filteredShots: ProcessedShot[] }) {
  // Filter to approach shots only
  const approachShots = useMemo(() => {
    return filteredShots.filter(shot => shot.shotType === 'Approach');
  }, [filteredShots]);

  // Calculate ending lie data
  const endingLieData = useMemo(() => {
    const totalApproaches = approachShots.length;
    if (totalApproaches === 0) return [];

    const lieMap = new Map<string, { count: number; strokesGained: number }>();

    approachShots.forEach(shot => {
      const lie = shot['Ending Lie'] || 'Other';
      const existing = lieMap.get(lie) || { count: 0, strokesGained: 0 };
      existing.count += 1;
      existing.strokesGained += shot.calculatedStrokesGained;
      lieMap.set(lie, existing);
    });

    return Array.from(lieMap.entries())
      .map(([lie, data]) => ({
        lie,
        count: data.count,
        percentage: (data.count / totalApproaches) * 100,
        strokesGained: data.strokesGained,
        avgStrokesGained: data.count > 0 ? data.strokesGained / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [approachShots]);

  // Colors for different ending lies
  const LIE_COLORS: Record<string, string> = {
    'Green': '#3D8EF0',      // Royal Blue
    'Fairway': '#10B981',    // Emerald
    'Rough': '#A855F7',      // Court Purple
    'Sand': '#D4F000',        // Volt
    'Recovery': '#06C8E0',   // Aqua
    'Water': '#3B82F6',      // Blue
    'Out of Bounds': '#EF4444', // Red
    'Other': '#6B7280',       // Gray
  };

  if (endingLieData.length === 0) {
    return null;
  }

  // Custom tooltip for percentage chart
  const PercentageTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof endingLieData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--court)',
        border: '1px solid var(--scarlet)',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}>
          {data.lie}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Count: <span style={{ color: 'var(--chalk)' }}>{data.count}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)' }}>
          Percentage: <span style={{ color: 'var(--chalk)' }}>{data.percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  // Custom tooltip for SG chart
  const SGTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof endingLieData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--court)',
        border: '1px solid var(--scarlet)',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}>
          {data.lie}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Total SG: <span style={{ color: getStrokeGainedColor(data.strokesGained) }}>
            {formatStrokesGained(data.strokesGained)}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Avg SG: <span style={{ color: getStrokeGainedColor(data.avgStrokesGained) }}>
            {formatStrokesGained(data.avgStrokesGained)}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)' }}>
          Count: <span style={{ color: 'var(--chalk)' }}>{data.count}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Approach Ending Lie</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Chart 1: Ending Lie as % of Total Approach Shots */}
        <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
          <h5 style={{ marginBottom: '8px', color: 'var(--chalk)', fontSize: '14px', fontWeight: 600 }}>
            Ending Lie % of Total Shots
          </h5>
          <p style={{ fontSize: '11px', color: 'var(--ash)', marginBottom: '16px' }}>
            Distribution of where approach shots end up
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={endingLieData} 
              margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ash)" opacity={0.3} />
              <XAxis 
                dataKey="lie" 
                stroke="var(--ash)" 
                tick={{ fill: 'var(--ash)', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                stroke="var(--ash)" 
                tick={{ fill: 'var(--ash)', fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<PercentageTooltip />} />
              <Bar 
                dataKey="percentage" 
                name="% of Shots"
                radius={[4, 4, 0, 0]}
              >
                {endingLieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={LIE_COLORS[entry.lie] || chartColors[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Total SG by Ending Lie */}
        <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
          <h5 style={{ marginBottom: '8px', color: 'var(--chalk)', fontSize: '14px', fontWeight: 600 }}>
            Total SG by Ending Lie
          </h5>
          <p style={{ fontSize: '11px', color: 'var(--ash)', marginBottom: '16px' }}>
            Strokes Gained performance by ending location
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={endingLieData} 
              margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ash)" opacity={0.3} />
              <XAxis 
                dataKey="lie" 
                stroke="var(--ash)" 
                tick={{ fill: 'var(--ash)', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                stroke="var(--ash)" 
                tick={{ fill: 'var(--ash)', fontSize: 11 }}
                tickFormatter={(value) => formatStrokesGained(value)}
              />
              <Tooltip content={<SGTooltip />} />
              <Bar 
                dataKey="strokesGained" 
                name="Total SG"
                radius={[4, 4, 0, 0]}
              >
                {endingLieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={LIE_COLORS[entry.lie] || chartColors[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Heat Map Section Component
function ApproachHeatMapSection({ data }: { data: ApproachHeatMapData }) {
  const [sgDisplayMode, setSgDisplayMode] = useState<'total' | 'perRound'>('total');

  // Helper to get color based on SG value
  const getHeatMapColor = (sgValue: number): string => {
    if (sgValue > 0.5) return 'rgba(34, 197, 94, 0.7)';
    if (sgValue > 0.2) return 'rgba(74, 222, 128, 0.5)';
    if (sgValue > 0) return 'rgba(187, 247, 208, 0.3)';
    if (sgValue > -0.2) return 'rgba(254, 226, 226, 0.3)';
    if (sgValue > -0.5) return 'rgba(252, 165, 165, 0.5)';
    return 'rgba(239, 68, 68, 0.7)';
  };

  // Get cell data for a specific lie and distance bucket
  const getCellData = (lie: string, distanceBucket: string) => {
    return data.cells.find(c => c.lie === lie && c.distanceBucket === distanceBucket);
  };

  // Get the SG value to use for coloring based on display mode
  const getSgValue = (cell: typeof data.cells[0] | undefined) => {
    if (!cell) return 0;
    return sgDisplayMode === 'total' ? cell.strokesGained : cell.sgPerRound;
  };

  // Calculate totals for each column
  const columnTotals = data.distanceBuckets.map(bucket => {
    const bucketCells = data.cells.filter(c => c.distanceBucket === bucket);
    return {
      bucket,
      totalShots: bucketCells.reduce((sum, c) => sum + c.totalShots, 0),
      strokesGained: bucketCells.reduce((sum, c) => sum + c.strokesGained, 0),
    };
  });

  // Calculate grand total
  const grandTotal = {
    totalShots: data.cells.reduce((sum, c) => sum + c.totalShots, 0),
    strokesGained: data.cells.reduce((sum, c) => sum + c.strokesGained, 0),
  };

  return (
    <>
      <h4 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--ash)' }}>Approach Heat Map</h4>
      
      {/* Radio buttons */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="sgDisplayMode"
            value="total"
            checked={sgDisplayMode === 'total'}
            onChange={() => setSgDisplayMode('total')}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--ash)' }}>Total SG</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="sgDisplayMode"
            value="perRound"
            checked={sgDisplayMode === 'perRound'}
            onChange={() => setSgDisplayMode('perRound')}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--ash)' }}>SG per Round</span>
        </label>
      </div>

      {/* Heat Map Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--ash)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>Starting Lie</th>
              {data.distanceBuckets.map(bucket => (
                <th key={bucket} style={{ padding: '12px', textAlign: 'center', color: 'var(--ash)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>{bucket}</th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', color: 'var(--ash)', fontWeight: '600', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lies.map(lie => {
              const rowCells = data.cells.filter(c => c.lie === lie);
              const rowTotal = {
                totalShots: rowCells.reduce((sum, c) => sum + c.totalShots, 0),
                strokesGained: rowCells.reduce((sum, c) => sum + c.strokesGained, 0),
              };
              
              return (
                <tr key={lie}>
                  <td style={{ padding: '12px', fontWeight: '600', color: 'var(--scarlet)', borderBottom: '1px solid var(--border)' }}>{lie}</td>
                  {data.distanceBuckets.map(bucket => {
                    const cell = getCellData(lie, bucket);
                    const hasShots = cell && cell.totalShots > 0;
                    const sgValue = getSgValue(cell);
                    
                    return (
                      <td key={`${lie}-${bucket}`} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)', backgroundColor: hasShots ? getHeatMapColor(sgValue) : 'transparent', minWidth: '100px' }}>
                        {hasShots && <div style={{ fontWeight: '600', fontSize: '14px' }}>{cell.totalShots}</div>}
                        {hasShots && <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgValue), marginTop: '2px' }}>{formatStrokesGained(sgValue)}</div>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', fontWeight: '600' }}>
                    {rowTotal.totalShots > 0 && (
                      <>
                        <div style={{ fontSize: '14px' }}>{rowTotal.totalShots}</div>
                        <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgDisplayMode === 'total' ? rowTotal.strokesGained : (data.totalRounds > 0 ? rowTotal.strokesGained / data.totalRounds : 0)), marginTop: '2px' }}>
                          {formatStrokesGained(sgDisplayMode === 'total' ? rowTotal.strokesGained : (data.totalRounds > 0 ? rowTotal.strokesGained / data.totalRounds : 0))}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {/* Grand Total Row */}
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <td style={{ padding: '12px', fontWeight: '700', color: 'var(--ash)', borderBottom: '2px solid var(--border)' }}>Total</td>
              {columnTotals.map(col => {
                const sgValue = sgDisplayMode === 'total' ? col.strokesGained : (data.totalRounds > 0 ? col.strokesGained / data.totalRounds : 0);
                return (
                  <td key={`total-${col.bucket}`} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid var(--border)', fontWeight: '600' }}>
                    {col.totalShots > 0 && (
                      <>
                        <div style={{ fontSize: '14px' }}>{col.totalShots}</div>
                        <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgValue), marginTop: '2px' }}>{formatStrokesGained(sgValue)}</div>
                      </>
                    )}
                  </td>
                );
              })}
              <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-tertiary)', fontWeight: '700' }}>
                {grandTotal.totalShots > 0 && (
                  <>
                    <div style={{ fontSize: '14px' }}>{grandTotal.totalShots}</div>
                    <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgDisplayMode === 'total' ? grandTotal.strokesGained : (data.totalRounds > 0 ? grandTotal.strokesGained / data.totalRounds : 0)), marginTop: '2px' }}>
                      {formatStrokesGained(sgDisplayMode === 'total' ? grandTotal.strokesGained : (data.totalRounds > 0 ? grandTotal.strokesGained / data.totalRounds : 0))}
                    </div>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--ash)', fontSize: '12px' }}>Color scale:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(239, 68, 68, 0.7)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Strong negative</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(254, 226, 226, 0.3)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Slight negative</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(187, 247, 208, 0.3)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Slight positive</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(34, 197, 94, 0.7)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Strong positive</span>
        </div>
      </div>
    </>
  );
}

/**
 * Putting View - Hero cards for putting metrics
 * - Total SG Putting
 * - Make % 0-4 ft
 * - Total SG 5-12 feet
 * - Poor Lag (count)
 * - Speed Rating (%)
 */
function PuttingView({ metrics, lagMetrics, filteredShots }: { metrics: PuttingMetrics; lagMetrics: LagPuttingMetrics; filteredShots: ProcessedShot[] }) {
  const { 
    totalSGPutting, 
    avgSGPutting, 
    totalPutts,
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
  } = metrics;

  // Helper function for make % color (higher is better)
  const getMakePctColor = (pct: number): string => {
    if (pct >= 90) return 'var(--under)';     // Green - excellent
    if (pct >= 80) return 'var(--bogey)';     // Yellow - average
    return 'var(--double)';                    // Red - needs work
  };

  // Helper for speed rating color (lower is better for speed rating = less long putts)
  const getSpeedRatingColor = (pct: number): string => {
    if (pct <= 10) return 'var(--under)';    // Green - rarely goes long
    if (pct <= 20) return 'var(--bogey)';     // Yellow - sometimes goes long
    return 'var(--double)';                    // Red - too often goes long
  };

  // Helper for Good Lag % color (higher is better)
  const getGoodLagColor = (pct: number): string => {
    if (pct >= 70) return 'var(--under)';    // Green - excellent
    if (pct >= 50) return 'var(--bogey)';     // Yellow - average
    return 'var(--double)';                    // Red - needs work
  };

  // Helper for Poor Lag % color (lower is better)
  const getPoorLagColor = (pct: number): string => {
    if (pct <= 10) return 'var(--under)';    // Green - excellent
    if (pct <= 25) return 'var(--bogey)';     // Yellow - average
    return 'var(--double)';                    // Red - needs work
  };

  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Putting Performance</h4>
      
      {/* Hero Cards - 5 metrics in a grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        
        {/* Card 1: Total SG Putting */}
        <div className="card-hero is-flagship">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--scarlet)' }}>Total SG Putting</div>
            <div style={{ width: '6px', height: '6px', background: 'var(--scarlet)', borderRadius: '50%' }}></div>
          </div>
          <div className="value-hero" style={{ color: getStrokeGainedColor(totalSGPutting) }}>
            {formatStrokesGained(totalSGPutting)}
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>SG / Putt</div>
              <div className="value-stat" style={{ color: getStrokeGainedColor(avgSGPutting), fontSize: '12px' }}>
                {formatStrokesGained(avgSGPutting)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Total Putts</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{totalPutts}</div>
            </div>
          </div>
        </div>

        {/* Card 2: Make % 0-4 ft */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Make % 0-4 ft</div>
          </div>
          <div className="value-hero" style={{ color: getMakePctColor(makePct0to4Ft) }}>
            {makePct0to4Ft.toFixed(1)}%
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>Made</div>
            <div className="value-stat">
              {made0to4Ft} / {total0to4Ft}
            </div>
          </div>
        </div>

        {/* Card 3: Total SG 5-12 ft */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>SG 5-12 ft</div>
          </div>
          <div className="value-hero" style={{ color: getStrokeGainedColor(totalSG5to12Ft) }}>
            {formatStrokesGained(totalSG5to12Ft)}
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>SG / Putt</div>
              <div className="value-stat" style={{ color: getStrokeGainedColor(avgSG5to12Ft), fontSize: '12px' }}>
                {formatStrokesGained(avgSG5to12Ft)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Putts</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{total5to12Ft}</div>
            </div>
          </div>
        </div>

        {/* Card 4: Poor Lag */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Poor Lag</div>
          </div>
          <div className="value-hero" style={{ color: poorLagCount > 0 ? 'var(--double)' : 'var(--under)' }}>
            {poorLagCount}
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>Total Lag Putts</div>
            <div className="value-stat">
              {totalLagPutts}
            </div>
          </div>
        </div>

        {/* Card 5: Speed Rating */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Speed Rating</div>
          </div>
          <div className="value-hero" style={{ color: getSpeedRatingColor(speedRating) }}>
            {speedRating.toFixed(1)}%
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>Long</div>
            <div className="value-stat">
              {longPutts} / {totalLongPutts}
            </div>
          </div>
        </div>

      </div>

      {/* Legend for metrics */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '32px', fontSize: '12px', color: 'var(--ash)' }}>
        <div>
          <strong>Make %:</strong> Higher is better (90%+ = green, 80-90% = yellow, &lt;80% = red)
        </div>
        <div>
          <strong>Speed Rating:</strong> Lower is better (% of lag putts going long)
        </div>
        <div>
          <strong>Poor Lag:</strong> First putts &gt;20ft ending &ge;5ft from hole
        </div>
      </div>

      {/* Putting By Distance Table */}
      {puttingByDistance.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Putting by Distance</h4>
          <div style={{ background: 'var(--charcoal)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ash)', fontWeight: 600, background: 'var(--obsidian)', width: '140px' }}>
                      Distance (ft)
                    </th>
                    {puttingByDistance.map(bucket => (
                      <th key={bucket.label} style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--ash)', fontWeight: 600, background: 'var(--obsidian)', minWidth: '70px' }}>
                        {bucket.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: # of Putts */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      # of Putts
                    </td>
                    {puttingByDistance.map(bucket => (
                      <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                        {bucket.totalPutts > 0 ? bucket.totalPutts : ''}
                      </td>
                    ))}
                  </tr>
                  {/* Row 2: Total Strokes Gained */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      Total SG
                    </td>
                    {puttingByDistance.map(bucket => (
                      <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: getStrokeGainedColor(bucket.totalStrokesGained), fontFamily: 'var(--font-mono)' }}>
                        {bucket.totalPutts > 0 ? formatStrokesGained(bucket.totalStrokesGained) : ''}
                      </td>
                    ))}
                  </tr>
                  {/* Row 3: Make % */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      Make %
                    </td>
                    {puttingByDistance.map(bucket => (
                      <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: bucket.totalPutts > 0 ? getMakePctColor(bucket.makePct) : 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                        {bucket.totalPutts > 0 ? `${bucket.makePct.toFixed(1)}%` : ''}
                      </td>
                    ))}
                  </tr>
                  {/* Row 4: # of 3 Putts */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      # of 3 Putts
                    </td>
                    {puttingByDistance.map(bucket => (
                      <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: bucket.threePutts > 0 ? 'var(--double)' : 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                        {bucket.threePutts > 0 ? bucket.threePutts : ''}
                      </td>
                    ))}
                  </tr>
                  {/* Row 5: Speed Ratio (% Long) */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      Speed Ratio (% Long)
                    </td>
                    {puttingByDistance.map(bucket => (
                      <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: bucket.totalPutts > 0 ? getSpeedRatingColor(bucket.speedRatio) : 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                        {bucket.totalPutts > 0 ? `${bucket.speedRatio.toFixed(1)}%` : ''}
                      </td>
                    ))}
                  </tr>
                  {/* Row 6: Proximity of Missed Putts - only for 13-60 ft buckets */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      Proximity of Missed Putts
                    </td>
                    {puttingByDistance.map(bucket => {
                      const isLagBucket = bucket.minDistance >= 13;
                      return (
                        <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: isLagBucket && bucket.proximityMissed > 0 ? 'var(--chalk)' : 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                          {isLagBucket && bucket.proximityMissed > 0 ? `${bucket.proximityMissed.toFixed(1)} ft` : ''}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 7: Good Lag % - only for 13-60 ft buckets */}
                  <tr style={{ borderBottom: '1px solid var(--pitch)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      Good Lag %
                    </td>
                    {puttingByDistance.map(bucket => {
                      const isLagBucket = bucket.minDistance >= 13;
                      return (
                        <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: isLagBucket && bucket.goodLagPct > 0 ? getGoodLagColor(bucket.goodLagPct) : 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                          {isLagBucket && bucket.goodLagPct > 0 ? `${bucket.goodLagPct.toFixed(1)}%` : ''}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 8: Poor Lag % - only for 13-60 ft buckets */}
                  <tr>
                    <td style={{ padding: '8px 12px', color: 'var(--chalk)', fontWeight: 500, background: 'var(--obsidian)' }}>
                      Poor Lag %
                    </td>
                    {puttingByDistance.map(bucket => {
                      const isLagBucket = bucket.minDistance >= 13;
                      return (
                        <td key={bucket.label} style={{ padding: '8px 8px', textAlign: 'center', color: isLagBucket && bucket.poorLagPct > 0 ? getPoorLagColor(bucket.poorLagPct) : 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                          {isLagBucket && bucket.poorLagPct > 0 ? `${bucket.poorLagPct.toFixed(1)}%` : ''}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Legend for lag metrics */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '32px', fontSize: '11px', color: 'var(--ash)' }}>
            <div>
              <strong>Good Lag %:</strong> Higher is better (% of putts &le;3ft)
            </div>
            <div>
              <strong>Poor Lag %:</strong> Lower is better (% of putts &ge;5ft)
            </div>
          </div>
        </div>
      )}

      {/* Lag Putting Section */}
      <LagPuttingSection metrics={lagMetrics} />

      {/* All Putts Table - Collapsible */}
      <PuttsTableSection shots={filteredShots} />
    </div>
  );
}

/**
 * Lag Putting Section - Card and two donut charts for lag putts (>20 ft)
 */
function LagPuttingSection({ metrics }: { metrics: LagPuttingMetrics }) {
  const { avgLeaveDistance, totalLagPutts, threePuttsByStartDistance, leaveDistanceDistribution } = metrics;

  // Format data for donut charts
  const threePuttsData = threePuttsByStartDistance.map(item => ({
    name: item.label,
    value: item.count,
    percentage: item.percentage,
  }));

  const leaveDistanceData = leaveDistanceDistribution.map(item => ({
    name: item.label,
    value: item.count,
    percentage: item.percentage,
  }));

  // Custom tooltip for donut charts
  const DonutTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof threePuttsData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{ 
        background: 'var(--obsidian)', 
        border: '1px solid var(--pitch)', 
        padding: '8px 12px', 
        borderRadius: '4px',
        fontSize: '12px',
      }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600 }}>{data.name} ft</div>
        <div style={{ color: 'var(--ash)' }}>
          {data.value} putts ({data.percentage.toFixed(1)}%)
        </div>
      </div>
    );
  };

  // Helper for leave distance color (lower is better)
  const getLeaveDistanceColor = (label: string): string => {
    if (label === '0-4') return 'var(--under)';
    if (label === '5-8') return 'var(--bogey)';
    if (label === '9-12') return 'var(--double)';
    return 'var(--scarlet)';
  };

  return (
    <div style={{ marginTop: '40px' }}>
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Lag Putting</h4>
      
      {/* Card and First Chart Row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        
        {/* Card: Avg. Leave Distance */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Avg. Leave Distance</div>
          </div>
          <div className="value-hero" style={{ color: avgLeaveDistance <= 4 ? 'var(--under)' : avgLeaveDistance <= 8 ? 'var(--bogey)' : 'var(--double)' }}>
            {totalLagPutts > 0 ? `${avgLeaveDistance.toFixed(1)} ft` : '-'}
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>Total Lag Putts</div>
            <div className="value-stat">
              {totalLagPutts}
            </div>
          </div>
        </div>

        {/* Chart 1: # 3 Putts - First Putt Starting Distance */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}># 3 Putts: First Putt Starting Distance</div>
          </div>
          {threePuttsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={threePuttsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {threePuttsData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>{value} ft</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)' }}>
              No 3-putt data
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Leave Distance Distribution */}
      <div style={{ marginTop: '16px' }}>
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>Leave Distance Distribution - Lag Putts</div>
          </div>
          {leaveDistanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={leaveDistanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {leaveDistanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getLeaveDistanceColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)' }}>
              No lag putt data
            </div>
          )}
        </div>
      </div>

      {/* Legend for leave distance chart */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '32px', fontSize: '11px', color: 'var(--ash)' }}>
        <div>
          <strong>Leave Distance:</strong> Lower is better (0-4 ft = green, 5-8 ft = yellow, 9-12 ft = red, 13+ ft = scarlet)
        </div>
      </div>
    </div>
  );
}

/**
 * Putts Table Section - Collapsible table showing all putts
 * Columns: Hole, Starting Distance, Ending Distance, Putt Result, SG
 * Grouped by round (date + course), sorted by hole within each round
 */
function PuttsTableSection({ shots }: { shots: ProcessedShot[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for putts only
  const putts = shots.filter(shot => shot.shotType === 'Putt');

  // Group putts by round (date + course)
  const puttsByRound = putts.reduce((acc, putt) => {
    const key = `${putt.Date}|${putt.Course}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(putt);
    return acc;
  }, {} as Record<string, ProcessedShot[]>);

  // Sort rounds by date (most recent first)
  const sortedRounds = Object.entries(puttsByRound).sort((a, b) => {
    const dateA = a[0].split('|')[0];
    const dateB = b[0].split('|')[0];
    return dateB.localeCompare(dateA);
  });

  if (putts.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'var(--charcoal)',
          border: '1px solid var(--ash)',
          borderRadius: '4px',
          color: 'var(--chalk)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 600 }}>All Putts</span>
        <span style={{ fontSize: '12px', color: 'var(--ash)' }}>
          {putts.length} putts • {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {sortedRounds.map(([roundKey, roundPutts]) => {
            const [dateStr, courseStr] = roundKey.split('|');

            return (
              <div key={roundKey} style={{ marginBottom: '16px', padding: '12px', background: 'var(--charcoal)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '12px', color: 'var(--chalk)' }}>
                  <span><strong>Date:</strong> {dateStr}</span>
                  <span><strong>Course:</strong> {courseStr}</span>
                  <span><strong>Putts:</strong> {roundPutts.length}</span>
                </div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>Hole</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '14%' }}>Start Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '14%' }}>End Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '14%' }}>Result</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '14%' }}>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundPutts
                      .sort((a, b) => a.Hole - b.Hole)
                      .map((putt, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{putt.Hole}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {putt['Starting Distance']}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                            {putt['Ending Distance']}
                          </td>
                          <td style={{ 
                            padding: '6px', 
                            textAlign: 'center', 
                            color: putt['Putt Result'] === 'Made' ? 'var(--under)' : putt['Putt Result'] === 'Long' ? 'var(--double)' : 'var(--chalk)',
                            fontWeight: putt['Putt Result'] === 'Made' ? 600 : 400
                          }}>
                            {putt['Putt Result'] || '-'}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', color: getShotSGColor(putt.calculatedStrokesGained), fontFamily: 'var(--font-mono)' }}>
                            {formatStrokesGained(putt.calculatedStrokesGained)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Scoring View - Hole outcome distribution and par-specific scoring metrics
 * - Donut chart: Hole outcome distribution (Eagle, Birdie, Par, Bogey, Double Bogey+)
 * - Three cards: Par 3, Par 4, Par 5 metrics
 */
function ScoringView({ metrics, birdieAndBogeyMetrics, mentalMetrics }: { metrics: ScoringMetrics; birdieAndBogeyMetrics: BirdieAndBogeyMetrics; mentalMetrics: MentalMetrics }) {
  const { holeOutcomes, totalHoles, par3, par4, par5 } = metrics;
  const { bogeyRates, birdieOpportunities, bogeyRootCause, doubleBogeyPlusRootCause, totalBogeys, totalDoubleBogeyPlus } = birdieAndBogeyMetrics;
  
  // Mental resilience metrics - destructured for use in ScoringView
  const { 
    bounceBackPct, 
    bounceBackCount, 
    bounceBackTotal,
    dropOffPct, 
    dropOffCount, 
    dropOffTotal,
    gasPedalPct, 
    gasPedalCount, 
    gasPedalTotal,
    bogeyTrainPct, 
    bogeyTrainCount, 
    bogeyTrainTotal,
    driveAfterT5FailSG,
    driveAfterT5FailCount,
    driveAfterT5FailVsBenchmark,
  } = mentalMetrics;

  // Colors for hole outcomes - using semantic scoring colors
  const OUTCOME_COLORS: Record<HoleOutcome, string> = {
    'Eagle': '#00C07A',       // Green/Under par
    'Birdie': '#52D9A0',      // Mint/Gain
    'Par': '#8A8580',         // Gray/Even
    'Bogey': '#F59520',        // Amber/Bogey
    'Double Bogey+': '#E8202A', // Red/Over par
  };

  // Format data for donut chart
  const donutData = holeOutcomes.map(outcome => ({
    name: outcome.outcome,
    value: outcome.count,
    percentage: outcome.percentage.toFixed(1),
    scoreToPar: outcome.scoreToPar,
  }));

  // Custom tooltip for donut chart
  const DonutTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof donutData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--court)',
        border: '1px solid var(--scarlet)',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}>
          {data.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>
          Count: <span style={{ color: 'var(--chalk)' }}>{data.value}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cement)' }}>
          Percentage: <span style={{ color: 'var(--chalk)' }}>{data.percentage}%</span>
        </div>
      </div>
    );
  };

  // Par card data
  const parCards = [
    { label: 'Par 3', data: par3, color: '#3D8EF0' },
    { label: 'Par 4', data: par4, color: '#A855F7' },
    { label: 'Par 5', data: par5, color: '#06C8E0' },
  ];

  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Scoring by Par</h4>

      {/* Hero Cards - Par 3, Par 4, Par 5 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {parCards.map((card) => (
          <div 
            key={card.label} 
            className="card-hero"
            style={{ borderLeft: `4px solid ${card.color}` }}
          >
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '14px' }}>{card.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--ash)' }}>{card.data.totalHoles} holes</div>
            </div>
            
            {/* Main Value: Avg Score */}
            <div className="value-hero" style={{ color: 'var(--chalk)', fontSize: '36px' }}>
              {card.data.totalHoles > 0 ? card.data.avgScore.toFixed(1) : '-'}
            </div>
            
            {/* Bottom row: Total SG and Avg vs Par */}
            <div className="flex justify-between" style={{ marginTop: '16px' }}>
              <div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Total SG</div>
                <div className="value-stat" style={{ color: getStrokeGainedColor(card.data.totalStrokesGained) }}>
                  {card.data.totalHoles > 0 ? formatStrokesGained(card.data.totalStrokesGained) : '-'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Avg vs Par</div>
                <div className="value-stat" style={{ 
                  color: card.data.totalHoles > 0 
                    ? (card.data.avgScoreVsPar < 0 ? 'var(--under)' : card.data.avgScoreVsPar > 0 ? 'var(--double)' : 'var(--ash)')
                    : 'var(--ash)'
                }}>
                  {card.data.totalHoles > 0 
                    ? (card.data.avgScoreVsPar > 0 ? '+' : '') + card.data.avgScoreVsPar.toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mental Resilience Section - Moved from Mental tab */}
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Mental Resilience</h4>
        
        {/* Five Cards */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {/* Card 1: Bounce Back % */}
          <div className="card-stat" style={{ borderLeft: '3px solid var(--under)' }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Bounce Back %</div>
            <div className="value-stat" style={{ color: 'var(--under)' }}>{bounceBackPct.toFixed(1)}%</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>Count</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{bounceBackCount} / {bounceBackTotal}</div>
            </div>
            <div className="label" style={{ fontSize: '10px', marginTop: '8px', color: 'var(--ash)' }}>Higher is better</div>
          </div>

          {/* Card 2: Drop Off % */}
          <div className="card-stat" style={{ borderLeft: '3px solid var(--scarlet)' }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Drop Off %</div>
            <div className="value-stat" style={{ color: 'var(--scarlet)' }}>{dropOffPct.toFixed(1)}%</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>Count</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{dropOffCount} / {dropOffTotal}</div>
            </div>
            <div className="label" style={{ fontSize: '10px', marginTop: '8px', color: 'var(--ash)' }}>Lower is better</div>
          </div>

          {/* Card 3: Gas Pedal % */}
          <div className="card-stat" style={{ borderLeft: '3px solid var(--under)' }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Gas Pedal %</div>
            <div className="value-stat" style={{ color: 'var(--under)' }}>{gasPedalPct.toFixed(1)}%</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>Count</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{gasPedalCount} / {gasPedalTotal}</div>
            </div>
            <div className="label" style={{ fontSize: '10px', marginTop: '8px', color: 'var(--ash)' }}>Higher is better</div>
          </div>

          {/* Card 4: Bogey Train % */}
          <div className="card-stat" style={{ borderLeft: '3px solid var(--scarlet)' }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Bogey Train %</div>
            <div className="value-stat" style={{ color: 'var(--scarlet)' }}>{bogeyTrainPct.toFixed(1)}%</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>Count</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{bogeyTrainCount} / {bogeyTrainTotal}</div>
            </div>
            <div className="label" style={{ fontSize: '10px', marginTop: '8px', color: 'var(--ash)' }}>Lower is better</div>
          </div>

          {/* Card 5: Drive after Tiger 5 Fail */}
          <div className="card-stat" style={{ borderLeft: '3px solid var(--pitch)' }}>
            <div className="label" style={{ color: 'var(--ash)', marginBottom: '8px' }}>Drive after T5 Fail</div>
            <div className="value-stat" style={{ color: getStrokeGainedColor(driveAfterT5FailSG) }}>
              {formatStrokesGained(driveAfterT5FailSG)}
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '9px' }}>Drives</div>
              <div className="value-stat" style={{ fontSize: '12px' }}>{driveAfterT5FailCount}</div>
            </div>
            <div className="label" style={{ fontSize: '10px', marginTop: '8px', color: 'var(--ash)' }}>
              vs Avg: <span style={{ color: driveAfterT5FailVsBenchmark >= 0 ? 'var(--under)' : 'var(--scarlet)' }}>
                {driveAfterT5FailVsBenchmark >= 0 ? '+' : ''}{formatStrokesGained(driveAfterT5FailVsBenchmark)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Heading for Distribution */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Hole Outcome Distribution</h4>

      {/* Donut Chart and Bogey Rate on Same Row */}
      {holeOutcomes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Donut Chart - Hole Outcome Distribution */}
          <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
            <p style={{ fontSize: '11px', color: 'var(--ash)', marginBottom: '16px' }}>
              Distribution of scores vs par across {totalHoles} holes
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                >
                  {donutData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={OUTCOME_COLORS[entry.name as HoleOutcome] || '#6B7280'}
                      stroke="var(--charcoal)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                {/* Center text showing total holes */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--chalk)"
                  style={{ fontSize: '24px', fontWeight: 'bold' }}
                >
                  {totalHoles}
                </text>
                <Tooltip content={<DonutTooltip />} />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value) => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bogey Rate Stacked Bar Chart */}
          <div>
            <h5 style={{ marginBottom: '12px', color: 'var(--ash)', fontSize: '14px' }}>Bogey & Double Bogey+ Rate by Par</h5>
            <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bogeyRates} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dark)" />
                  <XAxis dataKey="label" stroke="var(--ash)" fontSize={11} />
                  <YAxis stroke="var(--ash)" fontSize={11} unit="%" />
                  <Tooltip 
                    contentStyle={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px' }}
                    labelStyle={{ color: 'var(--chalk)' }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'bogeyRate' ? 'Bogey' : 'Double Bogey+']}
                  />
                  <Bar dataKey="bogeyRate" stackId="a" fill="#F59520" name="Bogey" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="doubleBogeyPlusRate" stackId="a" fill="#E8202A" name="Double Bogey+" radius={[0, 4, 4, 0]} />
                  <Legend 
                    formatter={(value) => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>{value}</span>}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: '11px', color: 'var(--ash)', marginTop: '8px' }}>
                {totalBogeys} total bogeys, {totalDoubleBogeyPlus} double bogey+ across {bogeyRates[0]?.totalHoles} holes
              </p>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: '24px' }}>
        <h5 style={{ marginBottom: '12px', color: 'var(--ash)', fontSize: '14px' }}>Bogey & Double Bogey+ Rate by Par</h5>
        <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bogeyRates} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dark)" />
              <XAxis dataKey="label" stroke="var(--ash)" fontSize={11} />
              <YAxis stroke="var(--ash)" fontSize={11} unit="%" />
              <Tooltip 
                contentStyle={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px' }}
                labelStyle={{ color: 'var(--chalk)' }}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'bogeyRate' ? 'Bogey' : 'Double Bogey+']}
              />
              <Bar dataKey="bogeyRate" stackId="a" fill="#F59520" name="Bogey" radius={[4, 0, 0, 4]} />
              <Bar dataKey="doubleBogeyPlusRate" stackId="a" fill="#E8202A" name="Double Bogey+" radius={[0, 4, 4, 0]} />
              <Legend 
                formatter={(value) => <span style={{ color: 'var(--ash)', fontSize: '11px' }}>{value}</span>}
              />
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '11px', color: 'var(--ash)', marginTop: '8px' }}>
            {totalBogeys} total bogeys, {totalDoubleBogeyPlus} double bogey+ across {bogeyRates[0].totalHoles} holes
          </p>
        </div>
      </div>

      {/* Bogey and Double Bogey+ Root Cause Charts - Side by Side */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {/* Bogey Root Cause Chart */}
        <div style={{ flex: 1 }}>
          <h5 style={{ marginBottom: '12px', color: 'var(--ash)', fontSize: '14px' }}>Bogey Root Cause ({totalBogeys} holes)</h5>
          <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={[
                  { name: 'Penalties', count: bogeyRootCause.penalties },
                  { name: 'Driving', count: bogeyRootCause.driving },
                  { name: 'Approach', count: bogeyRootCause.approach },
                  { name: 'Lag Putts', count: bogeyRootCause.lagPutts },
                  { name: 'Makeable Putts', count: bogeyRootCause.makeablePutts },
                  { name: 'Short Game', count: bogeyRootCause.shortGame },
                  { name: 'Recovery', count: bogeyRootCause.recovery },
                ]} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dark)" />
                <XAxis type="number" stroke="var(--ash)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--ash)" fontSize={10} width={80} />
                <Tooltip 
                  contentStyle={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px' }}
                  labelStyle={{ color: 'var(--chalk)' }}
                />
                <Bar dataKey="count" fill="#F59520" name="Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Double Bogey+ Root Cause Chart */}
        <div style={{ flex: 1 }}>
          <h5 style={{ marginBottom: '12px', color: 'var(--ash)', fontSize: '14px' }}>Double Bogey+ Root Cause ({totalDoubleBogeyPlus} holes)</h5>
          <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={[
                  { name: 'Penalties', count: doubleBogeyPlusRootCause.penalties },
                  { name: 'Driving', count: doubleBogeyPlusRootCause.driving },
                  { name: 'Approach', count: doubleBogeyPlusRootCause.approach },
                  { name: 'Lag Putts', count: doubleBogeyPlusRootCause.lagPutts },
                  { name: 'Makeable Putts', count: doubleBogeyPlusRootCause.makeablePutts },
                  { name: 'Short Game', count: doubleBogeyPlusRootCause.shortGame },
                  { name: 'Recovery', count: doubleBogeyPlusRootCause.recovery },
                ]} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dark)" />
                <XAxis type="number" stroke="var(--ash)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--ash)" fontSize={10} width={80} />
                <Tooltip 
                  contentStyle={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px' }}
                  labelStyle={{ color: 'var(--chalk)' }}
                />
                <Bar dataKey="count" fill="#E8202A" name="Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Birdie Opportunities - Prominent Hero Cards */}
      <div style={{ marginBottom: '24px', marginTop: '32px' }}>
        <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Birdie Opportunities</h4>
        
        {/* Three Hero Cards for Birdie Opportunities */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Card 1: Opportunities */}
          <div 
            className="card-hero"
            style={{ borderLeft: '4px solid #3D8EF0' }}
          >
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '14px' }}>Opportunities</div>
            </div>
            
            {/* Main Value */}
            <div className="value-hero" style={{ color: 'var(--chalk)', fontSize: '42px' }}>
              {birdieOpportunities.opportunities}
            </div>
            
            {/* Bottom Info */}
            <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>GIR with putt ≤ 20 ft</div>
            </div>
          </div>

          {/* Card 2: Conversions */}
          <div 
            className="card-hero"
            style={{ borderLeft: '4px solid #52D9A0' }}
          >
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '14px' }}>Conversions</div>
            </div>
            
            {/* Main Value */}
            <div className="value-hero" style={{ color: 'var(--under)', fontSize: '42px' }}>
              {birdieOpportunities.conversions}
            </div>
            
            {/* Bottom Info */}
            <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>Birdies made</div>
            </div>
          </div>

          {/* Card 3: Conversion % */}
          <div 
            className="card-hero"
            style={{ borderLeft: '4px solid #F59520' }}
          >
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '14px' }}>Conversion %</div>
            </div>
            
            {/* Main Value */}
            <div className="value-hero" style={{ color: birdieOpportunities.conversionPct >= 50 ? 'var(--under)' : 'var(--bogey)', fontSize: '42px' }}>
              {birdieOpportunities.conversionPct.toFixed(1)}%
            </div>
            
            {/* Bottom Info */}
            <div className="flex justify-between" style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
              <div>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Made</div>
                <div className="value-stat">{birdieOpportunities.conversions}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>Opportunities</div>
                <div className="value-stat">{birdieOpportunities.opportunities}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Short Game Leave Distribution Section - Shows where short game shots finish on the green
 * Buckets: 0-4 ft, 5-8 ft, 9-12 ft, 13-20 ft, 21+ ft, Missed Green
 */
function ShortGameLeaveDistributionSection({ filteredShots }: { filteredShots: ProcessedShot[] }) {
  // Filter to short game shots only
  const shortGameShots = useMemo(() => {
    return filteredShots.filter(shot => shot.shotType === 'Short Game');
  }, [filteredShots]);

  // Calculate leave distribution
  const leaveDistribution = useMemo(() => {
    const totalShots = shortGameShots.length;
    if (totalShots === 0) {
      return {
        buckets: [],
        totalShortGameShots: 0,
      };
    }

    // Initialize bucket counts
    const bucketCounts = {
      '0-4': 0,
      '5-8': 0,
      '9-12': 0,
      '13-20': 0,
      '21+': 0,
      'missed': 0,
    };

    // Categorize each shot
    shortGameShots.forEach(shot => {
      const endingLie = shot['Ending Lie'];
      const endingDistance = shot['Ending Distance'];

      // Check if shot missed the green
      if (endingLie !== 'Green') {
        bucketCounts['missed']++;
        return;
      }

      // Shot is on the green - categorize by distance
      if (endingDistance <= 4) {
        bucketCounts['0-4']++;
      } else if (endingDistance <= 8) {
        bucketCounts['5-8']++;
      } else if (endingDistance <= 12) {
        bucketCounts['9-12']++;
      } else if (endingDistance <= 20) {
        bucketCounts['13-20']++;
      } else {
        bucketCounts['21+']++;
      }
    });

    // Convert to bucket objects with percentages
    const buckets = [
      { label: '0-4 ft', bucket: '0-4', count: bucketCounts['0-4'], percentage: (bucketCounts['0-4'] / totalShots) * 100 },
      { label: '5-8 ft', bucket: '5-8', count: bucketCounts['5-8'], percentage: (bucketCounts['5-8'] / totalShots) * 100 },
      { label: '9-12 ft', bucket: '9-12', count: bucketCounts['9-12'], percentage: (bucketCounts['9-12'] / totalShots) * 100 },
      { label: '13-20 ft', bucket: '13-20', count: bucketCounts['13-20'], percentage: (bucketCounts['13-20'] / totalShots) * 100 },
      { label: '21+ ft', bucket: '21+', count: bucketCounts['21+'], percentage: (bucketCounts['21+'] / totalShots) * 100 },
      { label: 'Missed Green', bucket: 'missed', count: bucketCounts['missed'], percentage: (bucketCounts['missed'] / totalShots) * 100 },
    ];

    return { buckets, totalShortGameShots: totalShots };
  }, [shortGameShots]);

  // Colors for each bucket
  const BUCKET_COLORS: Record<string, string> = {
    '0-4': '#22C55E', '5-8': '#4ADE80', '9-12': '#FACC15', '13-20': '#FB923C', '21+': '#F87171', 'missed': '#EF4444',
  };

  const LeaveTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof leaveDistribution.buckets[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{ background: 'var(--court)', border: '1px solid var(--scarlet)', borderRadius: '4px', padding: '12px' }}>
        <div style={{ color: 'var(--chalk)', fontWeight: 600, marginBottom: '8px' }}>{data.label}</div>
        <div style={{ fontSize: '12px', color: 'var(--cement)', marginBottom: '4px' }}>Count: <span style={{ color: 'var(--chalk)' }}>{data.count}</span></div>
        <div style={{ fontSize: '12px', color: 'var(--cement)' }}>Percentage: <span style={{ color: 'var(--chalk)' }}>{data.percentage.toFixed(1)}%</span></div>
      </div>
    );
  };

  if (leaveDistribution.buckets.length === 0 || leaveDistribution.totalShortGameShots === 0) return null;

  return (
    <div style={{ marginTop: '32px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Leave Distribution</h4>
      <p style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>Where short game shots finish on the green ({leaveDistribution.totalShortGameShots} total shots)</p>
      <div style={{ background: 'var(--charcoal)', padding: '16px', borderRadius: '4px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={leaveDistribution.buckets} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ash)" opacity={0.3} />
            <XAxis dataKey="label" stroke="var(--ash)" tick={{ fill: 'var(--ash)', fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
            <YAxis stroke="var(--ash)" tick={{ fill: 'var(--ash)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip content={<LeaveTooltip />} />
            <Bar dataKey="percentage" name="% of Shots" radius={[4, 4, 0, 0]}>
              {leaveDistribution.buckets.map((entry) => (
                <Cell key={`cell-${entry.bucket}`} fill={BUCKET_COLORS[entry.bucket] || chartColors[0]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--ash)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#22C55E', borderRadius: '2px' }}></div><span>0-4 ft (Best)</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#4ADE80', borderRadius: '2px' }}></div><span>5-8 ft</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#FACC15', borderRadius: '2px' }}></div><span>9-12 ft</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#FB923C', borderRadius: '2px' }}></div><span>13-20 ft</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#F87171', borderRadius: '2px' }}></div><span>21+ ft</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></div><span>Missed Green</span></div>
      </div>
    </div>
  );
}

/**
 * Short Game Table Section - Collapsible table showing all short game shots
 */
function ShortGameTableSection({ filteredShots }: { filteredShots: ProcessedShot[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shortGameShots = useMemo(() => filteredShots.filter(shot => shot.shotType === 'Short Game'), [filteredShots]);
  const shortGameByRound = shortGameShots.reduce((acc, shot) => {
    const key = `${shot.Date}|${shot.Course}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(shot);
    return acc;
  }, {} as Record<string, ProcessedShot[]>);
  const sortedRounds = Object.entries(shortGameByRound).sort((a, b) => b[0].split('|')[0].localeCompare(a[0].split('|')[0]));

  if (shortGameShots.length === 0) return null;

  return (
    <div style={{ marginTop: '32px' }}>
      <button onClick={() => setIsExpanded(!isExpanded)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: 'var(--charcoal)', border: '1px solid var(--ash)', borderRadius: '4px', color: 'var(--chalk)', cursor: 'pointer', fontSize: '14px' }}>
        <span style={{ fontWeight: 600 }}>All Short Game Shots</span>
        <span style={{ fontSize: '12px', color: 'var(--ash)' }}>{shortGameShots.length} short game shots • {isExpanded ? '▲' : '▼'}</span>
      </button>
      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {sortedRounds.map(([roundKey, roundShots]) => {
            const [dateStr, courseStr] = roundKey.split('|');
            return (
              <div key={roundKey} style={{ marginBottom: '16px', padding: '12px', background: 'var(--charcoal)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '12px', color: 'var(--chalk)' }}>
                  <span><strong>Date:</strong> {dateStr}</span>
                  <span><strong>Course:</strong> {courseStr}</span>
                  <span><strong>Short Game Shots:</strong> {roundShots.length}</span>
                </div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '6%' }}>Shot</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '6%' }}>Hole</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>Start Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>Start Lie</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>End Dist</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '12%' }}>End Lie</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '8%' }}>Penalty</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: 'var(--ash)', width: '10%' }}>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundShots.sort((a, b) => a.Hole - b.Hole || a.Shot - b.Shot).map((shot, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                        <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{shot.Shot}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{shot.Hole}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>{shot['Starting Distance']}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{shot['Starting Lie']}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>{shot['Ending Distance']}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: 'var(--chalk)' }}>{shot['Ending Lie']}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: shot.Penalty === 'Yes' ? 'var(--scarlet)' : 'transparent' }}>{shot.Penalty === 'Yes' ? 'Yes' : ''}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: getShotSGColor(shot.calculatedStrokesGained), fontFamily: 'var(--font-mono)' }}>{formatStrokesGained(shot.calculatedStrokesGained)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Short Game View - Hero cards for short game metrics
 * - Total SG Short Game
 * - <= 8ft from Fairway - % of short game shots from Fairway that end on green within 8 feet
 * - <= 8ft from Rough - % of short game shots from Rough that end on green within 8 feet
 * - <= 8ft from Sand - % of short game shots from Sand that end on green within 8 feet
 */
function ShortGameView({ metrics, shortGameHeatMapData, filteredShots }: { metrics: ShortGameMetrics; shortGameHeatMapData: ShortGameHeatMapData; filteredShots: ProcessedShot[] }) {
  const {
    shortGameSG,
    avgShortGameSG,
    positiveSGPct,
    within8FeetFairwayPct,
    within8FeetFairwayCount,
    totalShortGameFairway,
    within8FeetRoughPct,
    within8FeetRoughCount,
    totalShortGameRough,
    within8FeetSandPct,
    within8FeetSandCount,
    totalShortGameSand,
  } = metrics;

  // Get color for proximity percentage (higher is better)
  // Using a simple threshold: >50% green, 30-50% yellow, <30% red
  const getProximityColor = (pct: number): string => {
    if (pct >= 50) return 'var(--under)';    // Green
    if (pct >= 30) return 'var(--bogey)';    // Yellow
    return 'var(--double)';                   // Red
  };

  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '16px', color: 'var(--ash)' }}>Short Game Performance</h4>

      {/* Hero Cards - 4 metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        
        {/* Card 1: Total SG - Short Game */}
        <div className="card-hero is-flagship">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--scarlet)' }}>Total SG</div>
            <div style={{ width: '6px', height: '6px', background: 'var(--scarlet)', borderRadius: '50%' }}></div>
          </div>
          <div className="value-hero" style={{ color: getStrokeGainedColor(shortGameSG) }}>
            {formatStrokesGained(shortGameSG)}
          </div>
          <div className="flex justify-between" style={{ marginTop: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>SG / Shot</div>
              <div className="value-stat" style={{ color: getStrokeGainedColor(avgShortGameSG) }}>
                {formatStrokesGained(avgShortGameSG)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ color: 'var(--ash)', fontSize: '11px' }}>+ Short Game</div>
              <div className="value-stat">{positiveSGPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Card 2: <= 8ft from Fairway */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>&lt;= 8ft Fairway</div>
          </div>
          <div className="value-hero" style={{ color: getProximityColor(within8FeetFairwayPct) }}>
            {within8FeetFairwayPct.toFixed(1)}%
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>
              {within8FeetFairwayCount} / {totalShortGameFairway} shots
            </div>
          </div>
        </div>

        {/* Card 3: <= 8ft from Rough */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>&lt;= 8ft Rough</div>
          </div>
          <div className="value-hero" style={{ color: getProximityColor(within8FeetRoughPct) }}>
            {within8FeetRoughPct.toFixed(1)}%
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>
              {within8FeetRoughCount} / {totalShortGameRough} shots
            </div>
          </div>
        </div>

        {/* Card 4: <= 8ft from Sand */}
        <div className="card-hero">
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <div className="label" style={{ color: 'var(--ash)' }}>&lt;= 8ft Sand</div>
          </div>
          <div className="value-hero" style={{ color: getProximityColor(within8FeetSandPct) }}>
            {within8FeetSandPct.toFixed(1)}%
          </div>
          <div style={{ marginTop: '16px', padding: '8px 0', borderTop: '1px solid var(--charcoal)' }}>
            <div className="label" style={{ color: 'var(--ash)', fontSize: '12px' }}>
              {within8FeetSandCount} / {totalShortGameSand} shots
            </div>
          </div>
        </div>

      </div>

      {/* Legend for proximity colors */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '11px', color: 'var(--ash)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--under)', borderRadius: '2px' }}></div>
          <span>50%+ (Good)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--bogey)', borderRadius: '2px' }}></div>
          <span>30-50% (Average)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--double)', borderRadius: '2px' }}></div>
          <span>&lt;30% (Needs Work)</span>
        </div>
      </div>

      {/* Short Game Heat Map Section */}
      <ShortGameHeatMapSection data={shortGameHeatMapData} />

      {/* Short Game Leave Distribution Section */}
      <ShortGameLeaveDistributionSection filteredShots={filteredShots} />

      {/* Short Game Table Section */}
      <ShortGameTableSection filteredShots={filteredShots} />
    </div>
  );
}

// Short Game Heat Map Section Component
function ShortGameHeatMapSection({ data }: { data: ShortGameHeatMapData }) {
  const [sgDisplayMode, setSgDisplayMode] = useState<'total' | 'perRound'>('total');

  const getHeatMapColor = (sgValue: number): string => {
    if (sgValue > 0.5) return 'rgba(34, 197, 94, 0.7)';
    if (sgValue > 0.2) return 'rgba(74, 222, 128, 0.5)';
    if (sgValue > 0) return 'rgba(187, 247, 208, 0.3)';
    if (sgValue > -0.2) return 'rgba(254, 226, 226, 0.3)';
    if (sgValue > -0.5) return 'rgba(252, 165, 165, 0.5)';
    return 'rgba(239, 68, 68, 0.7)';
  };

  const getCellData = (lie: string, distanceBucket: string) => {
    return data.cells.find(c => c.lie === lie && c.distanceBucket === distanceBucket);
  };

  const getSgValue = (cell: typeof data.cells[0] | undefined) => {
    if (!cell) return 0;
    return sgDisplayMode === 'total' ? cell.strokesGained : cell.sgPerRound;
  };

  const columnTotals = data.distanceBuckets.map(bucket => {
    const bucketCells = data.cells.filter(c => c.distanceBucket === bucket);
    return {
      bucket,
      totalShots: bucketCells.reduce((sum, c) => sum + c.totalShots, 0),
      strokesGained: bucketCells.reduce((sum, c) => sum + c.strokesGained, 0),
    };
  });

  const grandTotal = {
    totalShots: data.cells.reduce((sum, c) => sum + c.totalShots, 0),
    strokesGained: data.cells.reduce((sum, c) => sum + c.strokesGained, 0),
  };

  return (
    <>
      <h4 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--ash)' }}>Short Game Heat Map</h4>
      
      <div style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="sgDisplayModeShortGame"
            value="total"
            checked={sgDisplayMode === 'total'}
            onChange={() => setSgDisplayMode('total')}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--ash)' }}>Total SG</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="sgDisplayModeShortGame"
            value="perRound"
            checked={sgDisplayMode === 'perRound'}
            onChange={() => setSgDisplayMode('perRound')}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--ash)' }}>SG per Round</span>
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--ash)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>Starting Lie</th>
              {data.distanceBuckets.map(bucket => (
                <th key={bucket} style={{ padding: '12px', textAlign: 'center', color: 'var(--ash)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>{bucket}</th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', color: 'var(--ash)', fontWeight: '600', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lies.map(lie => {
              const rowCells = data.cells.filter(c => c.lie === lie);
              const rowTotal = {
                totalShots: rowCells.reduce((sum, c) => sum + c.totalShots, 0),
                strokesGained: rowCells.reduce((sum, c) => sum + c.strokesGained, 0),
              };
              
              return (
                <tr key={lie}>
                  <td style={{ padding: '12px', fontWeight: '600', color: 'var(--scarlet)', borderBottom: '1px solid var(--border)' }}>{lie}</td>
                  {data.distanceBuckets.map(bucket => {
                    const cell = getCellData(lie, bucket);
                    const hasShots = cell && cell.totalShots > 0;
                    const sgValue = getSgValue(cell);
                    
                    return (
                      <td key={`${lie}-${bucket}`} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)', backgroundColor: hasShots ? getHeatMapColor(sgValue) : 'transparent', minWidth: '100px' }}>
                        {hasShots && <div style={{ fontWeight: '600', fontSize: '14px' }}>{cell.totalShots}</div>}
                        {hasShots && <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgValue), marginTop: '2px' }}>{formatStrokesGained(sgValue)}</div>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', fontWeight: '600' }}>
                    {rowTotal.totalShots > 0 && (
                      <>
                        <div style={{ fontSize: '14px' }}>{rowTotal.totalShots}</div>
                        <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgDisplayMode === 'total' ? rowTotal.strokesGained : (data.totalRounds > 0 ? rowTotal.strokesGained / data.totalRounds : 0)), marginTop: '2px' }}>
                          {formatStrokesGained(sgDisplayMode === 'total' ? rowTotal.strokesGained : (data.totalRounds > 0 ? rowTotal.strokesGained / data.totalRounds : 0))}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <td style={{ padding: '12px', fontWeight: '700', color: 'var(--ash)', borderBottom: '2px solid var(--border)' }}>Total</td>
              {columnTotals.map(col => {
                const sgValue = sgDisplayMode === 'total' ? col.strokesGained : (data.totalRounds > 0 ? col.strokesGained / data.totalRounds : 0);
                return (
                  <td key={`total-${col.bucket}`} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid var(--border)', fontWeight: '600' }}>
                    {col.totalShots > 0 && (
                      <>
                        <div style={{ fontSize: '14px' }}>{col.totalShots}</div>
                        <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgValue), marginTop: '2px' }}>{formatStrokesGained(sgValue)}</div>
                      </>
                    )}
                  </td>
                );
              })}
              <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-tertiary)', fontWeight: '700' }}>
                {grandTotal.totalShots > 0 && (
                  <>
                    <div style={{ fontSize: '14px' }}>{grandTotal.totalShots}</div>
                    <div style={{ fontSize: '11px', color: getStrokeGainedColor(sgDisplayMode === 'total' ? grandTotal.strokesGained : (data.totalRounds > 0 ? grandTotal.strokesGained / data.totalRounds : 0)), marginTop: '2px' }}>
                      {formatStrokesGained(sgDisplayMode === 'total' ? grandTotal.strokesGained : (data.totalRounds > 0 ? grandTotal.strokesGained / data.totalRounds : 0))}
                    </div>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--ash)', fontSize: '12px' }}>Color scale:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(239, 68, 68, 0.7)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Strong negative</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(254, 226, 226, 0.3)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Slight negative</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(187, 247, 208, 0.3)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Slight positive</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(34, 197, 94, 0.7)' }}></div>
          <span style={{ color: 'var(--ash)', fontSize: '11px' }}>Strong positive</span>
        </div>
      </div>
    </>
  );
}

/**
 * Player Path View - Performance Drivers by Segment
 */
function PlayerPathView({ drivers: _drivers, playerPathMetrics }: { drivers: PerformanceDriversResult; playerPathMetrics: PlayerPathMetrics }) {
  const [activeSegment, setActiveSegment] = useState<'Driving' | 'Approach' | 'Putting' | 'Short Game'>('Driving');
  
  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Critical': return 'var(--scarlet)';
      case 'Significant': return '#EA580C';
      case 'Moderate': return '#CA8A04';
      case 'Strong': return 'var(--under)';
      default: return 'var(--ash)';
    }
  };
  
  // Get segment icon
  const getSegmentIcon = (segment: string): string => {
    switch (segment) {
      case 'Driving': return '🚗';
      case 'Approach': return '🎯';
      case 'Short Game': return '🏌️';
      case 'Putting': return '⛳';
      default: return '📈';
    }
  };
  
  // Get drivers for current segment
  const getSegmentDrivers = () => {
    const { driving, approach, putting, shortGame } = playerPathMetrics;
    
    switch (activeSegment) {
      case 'Driving':
        return [
          { code: 'D1', data: driving.d1 },
          { code: 'D2', data: driving.d2 },
          { code: 'D3', data: driving.d3 },
          { code: 'D4', data: driving.d4 },
          { code: 'D5', data: driving.d5 },
        ];
      case 'Approach':
        return [
          { code: 'A1', data: approach.a1 },
          { code: 'A2', data: approach.a2 },
          { code: 'A3', data: approach.a3 },
          { code: 'A4', data: approach.a4 },
        ];
      case 'Putting':
        return [
          { code: 'L1-L3', data: putting.lag },
          { code: 'M1', data: putting.m1 },
          { code: 'M2', data: putting.m2 },
        ];
      case 'Short Game':
        return [
          { code: 'S1', data: shortGame.s1 },
          { code: 'S2', data: shortGame.s2 },
          { code: 'S3', data: shortGame.s3 },
        ];
      default:
        return [];
    }
  };
  
  const segmentDrivers = getSegmentDrivers();
  
  // Render driver card based on driver type
  const renderDriverCard = (driver: { code: string; data: any }) => {
    if (!driver.data) return null;
    
    const { code, data } = driver;
    
    // Common card styling
    const cardStyle = {
      borderLeft: `4px solid ${getSeverityColor(data.severity)}`,
      background: 'var(--charcoal)',
      padding: '16px',
      borderRadius: '4px',
      marginBottom: '12px',
    };
    
    return (
      <div key={code} style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 700, 
              color: 'var(--chalk)',
              background: 'var(--obsidian)',
              padding: '4px 8px',
              borderRadius: '4px',
            }}>
              {code}
            </span>
            <span style={{ color: 'var(--chalk)', fontWeight: 600, fontSize: '14px' }}>{data.name}</span>
          </div>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 600, 
            color: getSeverityColor(data.severity),
            background: `${getSeverityColor(data.severity)}20`,
            padding: '4px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}>
            {data.severity}
          </span>
        </div>
        
        {/* Description */}
        <p style={{ color: 'var(--cement)', fontSize: '11px', marginBottom: '12px' }}>
          {data.description}
        </p>
        
        {/* Driver-specific content */}
        {code.startsWith('D') && renderDrivingDriver(data)}
        {code.startsWith('A') && renderApproachDriver(data)}
        {code === 'L1-L3' && renderLagPuttingDriver(data)}
        {code === 'M1' && renderMakeableDriver(data)}
        {code === 'M2' && renderPrimaryLossDriver(data)}
        {code.startsWith('S') && renderShortGameDriver(data)}
      </div>
    );
  };
  
  // Driving driver rendering
  const renderDrivingDriver = (data: any) => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div>
          <span style={{ color: 'var(--ash)' }}>Value: </span>
          <span style={{ color: 'var(--chalk)', fontWeight: 600 }}>
            {typeof data.value === 'number' ? data.value.toFixed(1) : data.fwHitRate?.toFixed(1)}%
          </span>
        </div>
        {data.sgImpact !== undefined && (
          <div>
            <span style={{ color: 'var(--ash)' }}>SG Impact: </span>
            <span style={{ color: data.sgImpact < 0 ? 'var(--scarlet)' : 'var(--under)', fontWeight: 600 }}>
              {data.sgImpact.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    );
  };
  
  // Approach driver rendering
  const renderApproachDriver = (data: any) => {
    if (!data.bands || data.bands.length === 0) return null;
    
    return (
      <div>
        <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ash)' }}>
              <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Band</th>
              <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Shots</th>
              <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>GIR%</th>
              <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>SG</th>
            </tr>
          </thead>
          <tbody>
            {data.bands.filter((b: any) => b.totalShots > 0).map((band: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                <td style={{ padding: '4px', color: 'var(--chalk)' }}>{band.label}</td>
                <td style={{ padding: '4px', textAlign: 'right', color: 'var(--cement)' }}>{band.totalShots}</td>
                <td style={{ padding: '4px', textAlign: 'right', color: 'var(--chalk)' }}>{band.girRate?.toFixed(1)}%</td>
                <td style={{ padding: '4px', textAlign: 'right', color: band.sgTotal < 0 ? 'var(--scarlet)' : 'var(--under)' }}>
                  {band.sgTotal?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Lag putting driver rendering
  const renderLagPuttingDriver = (data: any) => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ color: 'var(--ash)' }}>Poor Lag Rate: </span>
          <span style={{ color: 'var(--chalk)', fontWeight: 600 }}>{data.poorLagRate?.toFixed(1)}%</span>
        </div>
        <div>
          <span style={{ color: 'var(--ash)' }}>Dispersion: </span>
          <span style={{ color: 'var(--chalk)', fontWeight: 600 }}>{data.speedDispersionBand?.toFixed(1)}ft</span>
        </div>
        <div>
          <span style={{ color: 'var(--ash)' }}>Centering: </span>
          <span style={{ color: 'var(--chalk)', fontWeight: 600 }}>{data.centeringRate}</span>
        </div>
      </div>
    );
  };
  
  // Makeable putt driver rendering
  const renderMakeableDriver = (data: any) => {
    if (!data.buckets || data.buckets.length === 0) return null;
    
    return (
      <div>
        <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ash)' }}>
              <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Bucket</th>
              <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Putts</th>
              <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Make%</th>
              <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>SG/Put</th>
            </tr>
          </thead>
          <tbody>
            {data.buckets.filter((b: any) => b.totalPutts > 0).map((bucket: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                <td style={{ padding: '4px', color: 'var(--chalk)' }}>{bucket.label}</td>
                <td style={{ padding: '4px', textAlign: 'right', color: 'var(--cement)' }}>{bucket.totalPutts}</td>
                <td style={{ padding: '4px', textAlign: 'right', color: 'var(--chalk)' }}>{bucket.makePct?.toFixed(1)}%</td>
                <td style={{ padding: '4px', textAlign: 'right', color: bucket.avgSG < 0 ? 'var(--scarlet)' : 'var(--under)' }}>
                  {bucket.avgSG?.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Primary loss driver rendering
  const renderPrimaryLossDriver = (data: any) => {
    return (
      <div style={{ fontSize: '11px' }}>
        <span style={{ color: 'var(--ash)' }}>Primary Loss: </span>
        <span style={{ color: 'var(--scarlet)', fontWeight: 600 }}>{data.primaryLossBucket}</span>
        <span style={{ color: 'var(--ash)' }}> ({data.primaryLossSG?.toFixed(2)} SG)</span>
      </div>
    );
  };
  
  // Short game driver rendering
  const renderShortGameDriver = (data: any) => {
    if (data.lieMetrics) {
      return (
        <div>
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Lie</th>
                <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Shots</th>
                <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>≤8ft</th>
                <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.lieMetrics.filter((m: any) => m.totalShots > 0).map((metric: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                  <td style={{ padding: '4px', color: 'var(--chalk)' }}>{metric.lie}</td>
                  <td style={{ padding: '4px', textAlign: 'right', color: 'var(--cement)' }}>{metric.totalShots}</td>
                  <td style={{ padding: '4px', textAlign: 'right', color: 'var(--chalk)' }}>{metric.inside8Feet}</td>
                  <td style={{ padding: '4px', textAlign: 'right', color: metric.proximityRate < 50 ? 'var(--scarlet)' : 'var(--under)' }}>
                    {metric.proximityRate?.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    if (data.distanceMetrics) {
      return (
        <div>
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ash)' }}>
                <th style={{ textAlign: 'left', padding: '4px', color: 'var(--ash)' }}>Distance</th>
                <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Shots</th>
                <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>≤8ft</th>
                <th style={{ textAlign: 'right', padding: '4px', color: 'var(--ash)' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.distanceMetrics.filter((m: any) => m.totalShots > 0).map((metric: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--dark)' }}>
                  <td style={{ padding: '4px', color: 'var(--chalk)' }}>{metric.label}</td>
                  <td style={{ padding: '4px', textAlign: 'right', color: 'var(--cement)' }}>{metric.totalShots}</td>
                  <td style={{ padding: '4px', textAlign: 'right', color: 'var(--chalk)' }}>{metric.inside8Feet}</td>
                  <td style={{ padding: '4px', textAlign: 'right', color: metric.proximityRate < 50 ? 'var(--scarlet)' : 'var(--under)' }}>
                    {metric.proximityRate?.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    return (
      <div style={{ fontSize: '11px' }}>
        <span style={{ color: 'var(--ash)' }}>Failure Rate: </span>
        <span style={{ color: data.value > 20 ? 'var(--scarlet)' : 'var(--chalk)', fontWeight: 600 }}>
          {data.value?.toFixed(1)}%
        </span>
        <span style={{ color: 'var(--ash)' }}> ({data.failures}/{data.totalShortGameShots} shots)</span>
      </div>
    );
  };
  
  // Summary stats
  const criticalCount = playerPathMetrics.criticalDrivers.length;
  const significantCount = playerPathMetrics.significantDrivers.length;
  const moderateCount = playerPathMetrics.moderateDrivers.length;
  
  return (
    <div className="content">
      {/* Section Heading */}
      <h4 style={{ marginBottom: '8px', color: 'var(--ash)' }}>Player Path</h4>
      <p style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>
        Performance Drivers — Specific, measurable aspects of your game with statistically significant impact on scoring
      </p>
      
      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ 
          background: 'var(--charcoal)', 
          padding: '12px 16px', 
          borderRadius: '4px',
          borderLeft: '3px solid var(--scarlet)',
          flex: 1,
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--scarlet)' }}>{criticalCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--ash)' }}>Critical Drivers</div>
        </div>
        <div style={{ 
          background: 'var(--charcoal)', 
          padding: '12px 16px', 
          borderRadius: '4px',
          borderLeft: '3px solid #EA580C',
          flex: 1,
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#EA580C' }}>{significantCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--ash)' }}>Significant Drivers</div>
        </div>
        <div style={{ 
          background: 'var(--charcoal)', 
          padding: '12px 16px', 
          borderRadius: '4px',
          borderLeft: '3px solid #CA8A04',
          flex: 1,
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#CA8A04' }}>{moderateCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--ash)' }}>Moderate Drivers</div>
        </div>
        <div style={{ 
          background: 'var(--charcoal)', 
          padding: '12px 16px', 
          borderRadius: '4px',
          borderLeft: '3px solid var(--under)',
          flex: 1,
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--under)' }}>{playerPathMetrics.totalRounds}</div>
          <div style={{ fontSize: '10px', color: 'var(--ash)' }}>Rounds Analyzed</div>
        </div>
      </div>
      
      {/* Segment Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: '24px',
        borderBottom: '1px solid var(--ash)',
        paddingBottom: '8px',
      }}>
        {(['Driving', 'Approach', 'Putting', 'Short Game'] as const).map(segment => (
          <button
            key={segment}
            onClick={() => setActiveSegment(segment)}
            style={{
              background: activeSegment === segment ? 'var(--charcoal)' : 'transparent',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              padding: '10px 16px',
              cursor: 'pointer',
              color: activeSegment === segment ? 'var(--chalk)' : 'var(--ash)',
              fontWeight: activeSegment === segment ? 600 : 400,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{getSegmentIcon(segment)}</span>
            <span>{segment}</span>
          </button>
        ))}
      </div>
      
      {/* Driver Cards */}
      <div>
        {segmentDrivers.map(driver => renderDriverCard(driver))}
        
        {segmentDrivers.filter(d => d.data).length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ash)' }}>
            <p>No driver data available for this segment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App
