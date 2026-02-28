import { useState } from 'react'
import './styles/globals.css'
import { useGolfData } from './hooks/useGolfData'
import { TABS, Tiger5Metrics, Tiger5Fail, RootCauseMetrics, Tiger5FailDetails, RootCauseByFailTypeList, Tiger5TrendDataPoint } from './types/golf'
import { getStrokeGainedColor, formatStrokesGained } from './styles/tokens'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FilterBar } from './components/FilterBar'
import { getBenchmarkOptions } from './data/benchmarks'
import type { BenchmarkType } from './data/benchmarks'

function App() {
  const [activeTab, setActiveTab] = useState('tiger5')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { 
    filteredShots, 
    tiger5Metrics, 
    isLoading, 
    error, 
    lastUpdated,
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
          options={cascadingFilterOptions}
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
        
        {!isLoading && !error && activeTab !== 'tiger5' && (
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

function CategoryCard({ category }: { category: { type: string; totalShots: number; avgStrokesGained: number } }) {
  return (
    <div className="card-stat">
      <div className="label label-ash" style={{ marginBottom: '12px' }}>{category.type}</div>
      <div 
        className="value-stat" 
        style={{ color: getStrokeGainedColor(category.avgStrokesGained) }}
      >
        {formatStrokesGained(category.avgStrokesGained)}
      </div>
      <div className="label" style={{ marginTop: '8px', color: 'var(--ash)' }}>
        {category.totalShots} shots
      </div>
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
                            <td style={{ padding: '4px', textAlign: 'right', color: getStrokeGainedColor(shot.calculatedStrokesGained) }}>
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

export default App
