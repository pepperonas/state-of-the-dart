import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Activity, TrendingUp, TrendingDown, Minus, Download, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { useTenant } from '../../context/TenantContext';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ComposedChart
} from 'recharts';
import MatchHistory from './MatchHistory';
import { 
  calculateImprovement, 
  exportMatchHistoryCSV,
  exportMatchHistoryExcel,
  exportMatchHistoryPDF 
} from '../../utils/exportImport';
import { Match } from '../../types';
import { DartboardHeatmapBlur } from '../dartboard/DartboardHeatmapBlur';
import { Flame, FileSpreadsheet, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { formatDate, getTimestampForSort } from '../../utils/dateUtils';

const VALID_TABS = ['overview', 'progress', 'history', 'compare', 'heatmap'] as const;
type TabType = typeof VALID_TABS[number];
type TimeInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

const StatsOverview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { players, getPlayerHeatmap } = usePlayer();
  const { storage } = useTenant();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [comparePlayerIds, setComparePlayerIds] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(() => {
    const saved = localStorage.getItem('stats_time_interval');
    return (saved && ['daily', 'weekly', 'monthly', 'yearly'].includes(saved)) 
      ? saved as TimeInterval 
      : 'monthly';
  });
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // Get tab from URL or default to 'overview'
  const tabParam = searchParams.get('tab');
  const selectedTab: TabType = VALID_TABS.includes(tabParam as TabType) ? (tabParam as TabType) : 'overview';

  // Update tab and URL
  const setSelectedTab = (tab: TabType) => {
    setSearchParams({ tab });
  };
  
  // Load matches from API (Database-First!)
  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoadingMatches(true);
        const fetchedMatches = await api.matches.getAll();
        setMatches(fetchedMatches);
        console.log('✅ Matches loaded from API:', fetchedMatches.length);
      } catch (error) {
        console.error('❌ Failed to load matches:', error);
        setMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    };
    
    loadMatches();
  }, []);
  
  // Load selected player from localStorage on mount
  React.useEffect(() => {
    const savedPlayerId = localStorage.getItem('stats_selected_player_id');
    if (savedPlayerId && players.some(p => p.id === savedPlayerId)) {
      setSelectedPlayerId(savedPlayerId);
    } else if (players.length > 0 && !selectedPlayerId) {
      // Fallback to first player if no saved selection
      setSelectedPlayerId(players[0].id);
    }
  }, [players]);

  // Save selected player to localStorage when changed
  React.useEffect(() => {
    if (selectedPlayerId) {
      localStorage.setItem('stats_selected_player_id', selectedPlayerId);
    }
  }, [selectedPlayerId]);

  // Save time interval to localStorage when changed
  React.useEffect(() => {
    localStorage.setItem('stats_time_interval', timeInterval);
  }, [timeInterval]);
  
  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);
  
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  
  // Filter matches for selected player
  const playerMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    const filtered = matches.filter(match => {
      // Handle matches from API which might not have players array
      if (!match.players || !Array.isArray(match.players)) {
        // If no players array, check if winner matches selectedPlayerId
        return match.winner === selectedPlayerId;
      }
      return match.players.some((p: any) => p.playerId === selectedPlayerId);
    });
    return filtered;
  }, [matches, selectedPlayerId]);
  
  // Get heatmap data for selected player
  const heatmapData = useMemo(() => {
    if (!selectedPlayerId) return null;
    return getPlayerHeatmap(selectedPlayerId);
  }, [selectedPlayerId, getPlayerHeatmap]);
  
  // Calculate improvement metrics
  const improvement = useMemo(() => {
    return calculateImprovement(playerMatches);
  }, [playerMatches]);
  
  // Prepare chart data
  const progressData = useMemo(() => {
    return playerMatches
      .sort((a, b) => getTimestampForSort(a.startedAt) - getTimestampForSort(b.startedAt))
      .map((match, index) => {
        const players = match.players || [];
        const player = players.find((p: any) => p.playerId === selectedPlayerId);
        
        // Skip matches without player data - FIX for empty/zero charts
        if (!player) return null;
        
        const legs = match.legs || [];
        return {
          match: `#${index + 1}`,
          date: formatDate(match.startedAt, { month: 'short', day: 'numeric' }),
          average: player.matchAverage || 0,
          checkoutPercent: player.checkoutAttempts > 0
            ? (player.checkoutsHit / player.checkoutAttempts) * 100
            : 0,
          score180s: player.match180s || 0,
          score140: player.match140Plus || 0,
          score100: player.match100Plus || 0,
          legsWon: player.legsWon || 0,
          legsLost: legs.length - (player.legsWon || 0),
          highestScore: player.matchHighestScore || 0,
        };
      })
      .filter(Boolean); // Remove null entries
  }, [playerMatches, selectedPlayerId]);

  // Score distribution data for pie chart
  const scoreDistribution = useMemo(() => {
    if (!selectedPlayer) return [];
    return [
      { name: '180s', value: selectedPlayer.stats.total180s, color: '#ef4444' },
      { name: '140-179', value: selectedPlayer.stats.total140Plus, color: '#f97316' },
      { name: '100-139', value: selectedPlayer.stats.total100Plus, color: '#eab308' },
      { name: '60-99', value: selectedPlayer.stats.total60Plus, color: '#22c55e' },
    ].filter(item => item.value > 0);
  }, [selectedPlayer]);

  // Performance radar data
  const performanceRadar = useMemo(() => {
    if (!selectedPlayer || selectedPlayer.stats.gamesPlayed === 0) return [];
    const maxAvg = 80;
    const max180s = Math.max(10, selectedPlayer.stats.total180s);
    const maxGames = Math.max(50, selectedPlayer.stats.gamesPlayed);
    
    return [{
      metric: 'Average',
      value: (selectedPlayer.stats.averageOverall / maxAvg) * 100,
      fullMark: 100,
    }, {
      metric: 'Checkout %',
      value: selectedPlayer.stats.checkoutPercentage,
      fullMark: 100,
    }, {
      metric: '180s',
      value: (selectedPlayer.stats.total180s / max180s) * 100,
      fullMark: 100,
    }, {
      metric: 'Win Rate',
      value: (selectedPlayer.stats.gamesWon / selectedPlayer.stats.gamesPlayed) * 100,
      fullMark: 100,
    }, {
      metric: 'Erfahrung',
      value: (selectedPlayer.stats.gamesPlayed / maxGames) * 100,
      fullMark: 100,
    }];
  }, [selectedPlayer]);

  // Win/Loss data
  const winLossData = useMemo(() => {
    if (!selectedPlayer) return [];
    return [
      { name: 'Gewonnen', value: selectedPlayer.stats.gamesWon, color: '#22c55e' },
      { name: 'Verloren', value: selectedPlayer.stats.gamesPlayed - selectedPlayer.stats.gamesWon, color: '#ef4444' },
    ];
  }, [selectedPlayer]);

  // Time series performance data (daily/weekly/monthly/yearly)
  const timeSeriesData = useMemo(() => {
    const getTimeKey = (timestamp: number): string => {
      const date = new Date(timestamp);
      switch (timeInterval) {
        case 'daily':
          return formatDate(timestamp, { year: 'numeric', month: 'short', day: 'numeric' });
        case 'weekly': {
          // Get ISO week number
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          return `${date.getFullYear()} W${weekNumber}`;
        }
        case 'monthly':
          return formatDate(timestamp, { year: 'numeric', month: 'short' });
        case 'yearly':
          return date.getFullYear().toString();
        default:
          return formatDate(timestamp, { year: 'numeric', month: 'short' });
      }
    };

    const timeStats: Record<string, { games: number; avgSum: number; wins: number; timestamp: number }> = {};

    playerMatches.forEach(match => {
      // Skip matches without player data
      const players = match.players || [];
      const player = players.find((p: any) => p.playerId === selectedPlayerId);
      
      if (!player) return;
      
      const matchTimestamp = getTimestampForSort(match.startedAt);
      const timeKey = getTimeKey(matchTimestamp);
      if (!timeStats[timeKey]) {
        timeStats[timeKey] = { games: 0, avgSum: 0, wins: 0, timestamp: matchTimestamp };
      }
      
      timeStats[timeKey].games++;
      timeStats[timeKey].avgSum += player.matchAverage || 0;
      if (match.winner === selectedPlayerId) {
        timeStats[timeKey].wins++;
      }
    });

    return Object.entries(timeStats)
      .map(([period, stats]) => ({
        period,
        average: stats.games > 0 ? stats.avgSum / stats.games : 0,
        games: stats.games,
        winRate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
        timestamp: stats.timestamp,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [playerMatches, selectedPlayerId, timeInterval]);
  
  const handleExportCSV = () => {
    if (!selectedPlayer) return;
    exportMatchHistoryCSV(playerMatches, selectedPlayer.name);
    setShowExportMenu(false);
  };
  
  const handleExportExcel = () => {
    if (!selectedPlayer) return;
    exportMatchHistoryExcel(playerMatches, selectedPlayer.name);
    setShowExportMenu(false);
  };
  
  const handleExportPDF = () => {
    if (!selectedPlayer) return;
    exportMatchHistoryPDF(playerMatches, selectedPlayer.name);
    setShowExportMenu(false);
  };
  
  if (players.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          
          <div className="glass-card rounded-xl shadow-lg p-12">
            <div className="text-center py-12">
              <Activity size={64} className="mx-auto text-dark-600 mb-6" />
              <p className="text-white text-2xl font-bold mb-2">Keine Statistiken verfügbar</p>
              <p className="text-dark-400 text-lg mt-2">
                Erstelle einen Spieler und spiele einige Matches, um Statistiken zu sehen
              </p>
              <button
                onClick={() => navigate('/players')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all"
              >
                Spieler erstellen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg transition-all font-semibold"
            >
              <Download size={18} />
              Export
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors text-left"
                >
                  <FileText size={18} />
                  <span>CSV Export</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors text-left"
                >
                  <FileSpreadsheet size={18} />
                  <span>Excel Export</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors text-left"
                >
                  <FileText size={18} />
                  <span>PDF Export</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Player Selector */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-white font-semibold">Spieler:</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            >
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.avatar} {player.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedPlayer && (
          <>
            {/* Improvement Banner */}
            {playerMatches.length >= 10 && (
              <div className={`glass-card p-6 mb-6 border-2 ${
                improvement.trend === 'improving' 
                  ? 'border-success-500 bg-success-500/10' 
                  : improvement.trend === 'declining'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-primary-500 bg-primary-500/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {improvement.trend === 'improving' ? (
                      <TrendingUp size={36} className="text-success-400" />
                    ) : improvement.trend === 'declining' ? (
                      <TrendingDown size={36} className="text-red-400" />
                    ) : (
                      <Minus size={36} className="text-primary-400" />
                    )}
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {improvement.trend === 'improving' && 'Du verbesserst dich! 📈'}
                        {improvement.trend === 'declining' && 'Leichter Rückgang 📉'}
                        {improvement.trend === 'stable' && 'Stabile Performance 📊'}
                      </h3>
                      <p className="text-sm text-dark-300 mt-1">
                        Aktuell: <span className="font-bold text-white">{improvement.recentAverage.toFixed(2)}</span> | 
                        Historisch: <span className="font-bold text-white">{improvement.historicAverage.toFixed(2)}</span> | 
                        Differenz: <span className={`font-bold ${improvement.averageImprovement > 0 ? 'text-success-400' : 'text-red-400'}`}>
                          {improvement.averageImprovement > 0 ? '+' : ''}{improvement.averageImprovement.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="glass-card mb-6">
              <div className="flex border-b border-dark-700">
                <button
                  onClick={() => setSelectedTab('overview')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all ${
                    selectedTab === 'overview'
                      ? 'text-white border-b-2 border-primary-500 bg-primary-500/5'
                      : 'text-dark-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Übersicht
                </button>
                <button
                  onClick={() => setSelectedTab('progress')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all ${
                    selectedTab === 'progress'
                      ? 'text-white border-b-2 border-primary-500 bg-primary-500/5'
                      : 'text-dark-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Fortschritt
                </button>
                <button
                  onClick={() => setSelectedTab('history')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all ${
                    selectedTab === 'history'
                      ? 'text-white border-b-2 border-primary-500 bg-primary-500/5'
                      : 'text-dark-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Verlauf ({playerMatches.length})
                </button>
                <button
                  onClick={() => setSelectedTab('compare')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all ${
                    selectedTab === 'compare'
                      ? 'text-white border-b-2 border-primary-500 bg-primary-500/5'
                      : 'text-dark-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users size={16} className="inline mr-2" />
                  Vergleich
                </button>
                <button
                  onClick={() => setSelectedTab('heatmap')}
                  className={`flex-1 px-6 py-3 font-semibold transition-all ${
                    selectedTab === 'heatmap'
                      ? 'text-white border-b-2 border-primary-500 bg-primary-500/5'
                      : 'text-dark-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Flame size={16} className="inline mr-2" />
                  Heatmap
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Spiele" value={selectedPlayer.stats.gamesPlayed} />
                  <StatCard label="Gewonnen" value={selectedPlayer.stats.gamesWon} color="green" />
                  <StatCard 
                    label="Win Rate" 
                    value={
                      selectedPlayer.stats.gamesPlayed > 0
                        ? `${((selectedPlayer.stats.gamesWon / selectedPlayer.stats.gamesPlayed) * 100).toFixed(1)}%`
                        : '0%'
                    }
                    color="blue"
                  />
                  <StatCard label="Durchschnitt" value={selectedPlayer.stats.averageOverall.toFixed(2)} color="purple" />
                  <StatCard label="Bester Avg" value={selectedPlayer.stats.bestAverage.toFixed(2)} color="yellow" />
                  <StatCard label="180s" value={selectedPlayer.stats.total180s} icon="🎯" />
                  <StatCard label="High Checkout" value={selectedPlayer.stats.highestCheckout || '-'} />
                  <StatCard label="Checkout %" value={`${selectedPlayer.stats.checkoutPercentage.toFixed(1)}%`} />
                  <StatCard label="140+ Scores" value={selectedPlayer.stats.total140Plus} />
                  <StatCard label="100+ Scores" value={selectedPlayer.stats.total100Plus} />
                  <StatCard label="60+ Scores" value={selectedPlayer.stats.total60Plus} />
                  <StatCard label="9-Darters" value={selectedPlayer.stats.nineDartFinishes} icon="⭐" />
                </div>

                {/* Charts Section */}
                {selectedPlayer.stats.gamesPlayed > 0 && (
                  <>
                    {/* Performance Radar & Win/Loss Pie */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Performance Radar */}
                      <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">⭐</span>
                          Performance-Profil
                        </h3>
                        <div className="bg-dark-900 rounded-lg p-4">
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={performanceRadar}>
                              <PolarGrid stroke="#404040" />
                              <PolarAngleAxis 
                                dataKey="metric" 
                                stroke="#a3a3a3"
                                style={{ fontSize: '12px', fontWeight: 'bold' }}
                              />
                              <PolarRadiusAxis 
                                angle={90} 
                                domain={[0, 100]}
                                stroke="#737373"
                                style={{ fontSize: '10px' }}
                              />
                              <Radar 
                                name="Performance" 
                                dataKey="value" 
                                stroke="#0ea5e9" 
                                fill="#0ea5e9" 
                                fillOpacity={0.6}
                                strokeWidth={2}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#0a0a0a', 
                                  border: '1px solid #404040',
                                  borderRadius: '8px',
                                  padding: '12px'
                                }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Win/Loss Pie */}
                      <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">🏆</span>
                          Sieg-Statistik
                        </h3>
                        <div className="bg-dark-900 rounded-lg p-4">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={winLossData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {winLossData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#0a0a0a', 
                                  border: '1px solid #404040',
                                  borderRadius: '8px',
                                  padding: '12px'
                                }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Score Distribution */}
                    {scoreDistribution.length > 0 && (
                      <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">🎯</span>
                          Score-Verteilung
                        </h3>
                        <div className="bg-dark-900 rounded-lg p-4">
                          <ResponsiveContainer width="100%" height={350}>
                            <BarChart 
                              data={scoreDistribution}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis 
                                type="number"
                                stroke="#737373"
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                type="category"
                                dataKey="name"
                                stroke="#737373"
                                style={{ fontSize: '12px' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#0a0a0a', 
                                  border: '1px solid #404040',
                                  borderRadius: '8px',
                                  padding: '12px'
                                }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                              />
                              <Bar 
                                dataKey="value" 
                                radius={[0, 8, 8, 0]}
                              >
                                {scoreDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Monthly Performance */}
                    {timeSeriesData.length > 0 && (
                      <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">📊</span>
                            Entwicklung im Zeitverlauf
                            {timeSeriesData.length === 1 && (
                              <span className="text-sm text-amber-400 ml-2">(Nur 1 Datenpunkt - spiele mehr für Entwicklung!)</span>
                            )}
                          </h3>
                          <select
                            value={timeInterval}
                            onChange={(e) => setTimeInterval(e.target.value as TimeInterval)}
                            className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          >
                            <option value="daily">Täglich</option>
                            <option value="weekly">Wöchentlich</option>
                            <option value="monthly">Monatlich</option>
                            <option value="yearly">Jährlich</option>
                          </select>
                        </div>
                        <div className="bg-dark-900 rounded-lg p-4">
                          <ResponsiveContainer width="100%" height={350}>
                            <ComposedChart data={timeSeriesData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis 
                                dataKey="period" 
                                stroke="#737373"
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                yAxisId="left"
                                stroke="#737373"
                                style={{ fontSize: '12px' }}
                                label={{ value: 'Average', angle: -90, position: 'insideLeft', fill: '#a3a3a3' }}
                              />
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="#737373"
                                style={{ fontSize: '12px' }}
                                label={{ value: 'Win Rate %', angle: 90, position: 'insideRight', fill: '#a3a3a3' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#0a0a0a', 
                                  border: '1px solid #404040',
                                  borderRadius: '8px',
                                  padding: '12px'
                                }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              />
                              <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                              />
                              <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="average"
                                fill="#0ea5e9"
                                fillOpacity={0.3}
                                stroke="#0ea5e9"
                                strokeWidth={2}
                                dot={{ fill: '#0ea5e9', r: timeSeriesData.length <= 2 ? 8 : 4 }}
                                name="Durchschnitt"
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="winRate"
                                stroke="#22c55e"
                                strokeWidth={3}
                                dot={{ fill: '#22c55e', r: timeSeriesData.length <= 2 ? 8 : 4 }}
                                name="Win Rate %"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedPlayer.stats.gamesPlayed === 0 && (
                  <div className="glass-card p-12 text-center">
                    <Activity size={64} className="mx-auto mb-4 text-dark-600" />
                    <p className="text-white text-xl font-semibold mb-2">Keine Spieldaten vorhanden</p>
                    <p className="text-dark-400">Spiele einige Matches, um detaillierte Charts und Statistiken zu sehen</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'progress' && (
              <div className="space-y-6">
                {playerMatches.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Activity size={64} className="mx-auto mb-4 text-dark-600" />
                    <p className="text-dark-400 text-lg font-semibold">Noch keine Spiele für diesen Spieler</p>
                    <p className="text-dark-500 text-sm mt-2">Spiele einige Matches, um deine Fortschritte zu sehen</p>
                  </div>
                ) : (
                  <>
                    {/* Average Progress Chart */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold text-white mb-4">📈 Average-Entwicklung</h3>
                      <div className="bg-dark-900 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis
                              dataKey="date"
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <YAxis
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                              tickFormatter={(value) => value.toFixed(1)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #404040',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              itemStyle={{ color: '#0ea5e9' }}
                              formatter={(value: number) => value.toFixed(1)}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px' }}
                              iconType="line"
                              formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
                            />
                            <Line
                              type="monotone"
                              dataKey="average"
                              stroke="#0ea5e9"
                              strokeWidth={3}
                              dot={{ fill: '#0ea5e9', r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Durchschnitt"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Checkout Percentage Chart */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold text-white mb-4">🎯 Checkout-Quote</h3>
                      <div className="bg-dark-900 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis
                              dataKey="date"
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <YAxis
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              domain={[0, 100]}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #404040',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              itemStyle={{ color: '#22c55e' }}
                              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Checkout %']}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px' }}
                              iconType="line"
                              formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
                            />
                            <Line
                              type="monotone"
                              dataKey="checkoutPercent"
                              stroke="#22c55e"
                              strokeWidth={3}
                              dot={{ fill: '#22c55e', r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Checkout %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Score Distribution Chart */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold text-white mb-4">🔥 Score-Verteilung pro Match</h3>
                      <div className="bg-dark-900 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis
                              dataKey="date"
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <YAxis
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #404040',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              itemStyle={{ color: '#fff' }}
                              cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px' }}
                              formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
                            />
                            <Bar
                              dataKey="score180s"
                              fill="#a855f7"
                              name="180s"
                              radius={[8, 8, 0, 0]}
                            />
                            <Bar
                              dataKey="score140"
                              fill="#0ea5e9"
                              name="140+"
                              radius={[8, 8, 0, 0]}
                            />
                            <Bar
                              dataKey="score100"
                              fill="#22c55e"
                              name="100+"
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Legs Won/Lost Trend */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold text-white mb-4">🎯 Legs Gewonnen vs. Verloren</h3>
                      <div className="bg-dark-900 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis
                              dataKey="date"
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <YAxis
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #404040',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px', color: '#fff' }}
                              formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
                            />
                            <Area
                              type="monotone"
                              dataKey="legsWon"
                              stackId="1"
                              stroke="#22c55e"
                              fill="#22c55e"
                              fillOpacity={0.8}
                              name="Legs Gewonnen"
                            />
                            <Area
                              type="monotone"
                              dataKey="legsLost"
                              stackId="2"
                              stroke="#ef4444"
                              fill="#ef4444"
                              fillOpacity={0.8}
                              name="Legs Verloren"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Highest Score per Match */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold text-white mb-4">🚀 Höchste Scores</h3>
                      <div className="bg-dark-900 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis
                              dataKey="date"
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <YAxis
                              stroke="#a3a3a3"
                              style={{ fontSize: '12px' }}
                              domain={[0, 180]}
                              tick={{ fill: '#a3a3a3' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #404040',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px', color: '#fff' }}
                              formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
                            />
                            <Bar
                              dataKey="highestScore"
                              fill="url(#colorGradient)"
                              name="Höchster Score"
                              radius={[8, 8, 0, 0]}
                            />
                            <Line
                              type="monotone"
                              dataKey="average"
                              stroke="#0ea5e9"
                              strokeWidth={2}
                              dot={{ fill: '#0ea5e9', r: 3 }}
                              name="Durchschnitt"
                            />
                            <defs>
                              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
                              </linearGradient>
                            </defs>
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Performance Improvement Summary */}
                    {improvement && (
                      <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-white mb-4">📈 Verbesserungs-Trend</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-dark-900 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {improvement.averageImprovement >= 0 ? (
                                <TrendingUp size={20} className="text-success-500" />
                              ) : (
                                <TrendingDown size={20} className="text-red-500" />
                              )}
                              <span className="text-dark-400 text-sm">Average</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              improvement.averageImprovement >= 0 ? 'text-success-500' : 'text-red-500'
                            }`}>
                              {improvement.averageImprovement >= 0 ? '+' : ''}{improvement.averageImprovement.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-dark-900 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {improvement.checkoutImprovement >= 0 ? (
                                <TrendingUp size={20} className="text-success-500" />
                              ) : (
                                <TrendingDown size={20} className="text-red-500" />
                              )}
                              <span className="text-dark-400 text-sm">Checkout %</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              improvement.checkoutImprovement >= 0 ? 'text-success-500' : 'text-red-500'
                            }`}>
                              {improvement.checkoutImprovement >= 0 ? '+' : ''}{improvement.checkoutImprovement.toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-dark-900 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity size={20} className="text-primary-500" />
                              <span className="text-dark-400 text-sm">Spiele</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {playerMatches.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedTab === 'history' && (
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">📜 Match-Verlauf</h3>
                {playerMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity size={64} className="mx-auto mb-4 text-dark-600" />
                    <p className="text-dark-400 text-lg font-semibold">Noch keine Matches gespielt</p>
                    <p className="text-dark-500 text-sm mt-2">Starte ein Spiel, um deinen Verlauf zu sehen</p>
                  </div>
                ) : (
                  <MatchHistory matches={playerMatches} playerId={selectedPlayerId} />
                )}
              </div>
            )}

            {selectedTab === 'compare' && (
              <PlayerComparisonView 
                players={players}
                comparePlayerIds={comparePlayerIds}
                setComparePlayerIds={setComparePlayerIds}
                matches={matches}
                storage={storage}
              />
            )}

            {selectedTab === 'heatmap' && (
              <div className="space-y-6">
                {/* Heatmap Header */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                      <Flame size={32} className="text-orange-400" />
                      🎯 Wurf-Heatmap
                    </h2>
                  </div>
                  <p className="text-dark-300 text-lg">
                    Visualisierung aller Würfe von <span className="font-bold text-primary-400">{selectedPlayer?.name}</span>
                  </p>
                </div>

                {/* Heatmap Content */}
                {heatmapData && heatmapData.totalDarts > 0 ? (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="glass-card p-6 border-2 border-blue-500/30">
                        <div className="text-sm text-blue-300 mb-1 font-semibold">Total Würfe</div>
                        <div className="text-4xl font-bold text-white">{heatmapData.totalDarts}</div>
                        <div className="text-xs text-dark-400 mt-2">Alle aufgezeichneten Darts</div>
                      </div>
                      <div className="glass-card p-6 border-2 border-green-500/30">
                        <div className="text-sm text-green-300 mb-1 font-semibold">Segments getroffen</div>
                        <div className="text-4xl font-bold text-white">
                          {Object.keys(heatmapData.segments || {}).length}
                        </div>
                        <div className="text-xs text-dark-400 mt-2">Unterschiedliche Felder</div>
                      </div>
                      <div className="glass-card p-6 border-2 border-orange-500/30">
                        <div className="text-sm text-orange-300 mb-1 font-semibold">Präzision</div>
                        <div className="text-4xl font-bold text-white">
                          {selectedPlayer ? selectedPlayer.stats.checkoutPercentage.toFixed(1) : 0}%
                        </div>
                        <div className="text-xs text-dark-400 mt-2">Checkout Rate</div>
                      </div>
                      <div className="glass-card p-6 border-2 border-red-500/30">
                        <div className="text-sm text-red-300 mb-1 font-semibold">180s</div>
                        <div className="text-4xl font-bold text-white">
                          {selectedPlayer?.stats.total180s || 0}
                        </div>
                        <div className="text-xs text-dark-400 mt-2">Maximum Scores</div>
                      </div>
                    </div>

                    {/* Heatmap Visualization */}
                    <div className="glass-card p-8 border-2 border-primary-500/20">
                      <DartboardHeatmapBlur heatmapData={heatmapData} size={600} />
                    </div>
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center border-2 border-dashed border-dark-700">
                    <div className="text-8xl mb-6">🎯</div>
                    <h3 className="text-3xl font-bold text-white mb-4">Noch keine Wurf-Daten</h3>
                    <p className="text-dark-300 text-xl mb-6">
                      Spiele ein Match, um deine Wurf-Heatmap zu sehen!
                    </p>
                    <p className="text-dark-400 mb-6">
                      Die Heatmap zeigt dir auf einen Blick, wo du am häufigsten triffst:
                    </p>
                    <div className="flex items-center justify-center gap-6 text-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500 shadow-lg" style={{ boxShadow: '0 0 20px #ef444480' }}></div>
                        <span className="text-white font-semibold">Hot-Zones</span>
                        <span className="text-dark-400">(oft getroffen)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 shadow-lg" style={{ boxShadow: '0 0 20px #3b82f680' }}></div>
                        <span className="text-white font-semibold">Cold-Zones</span>
                        <span className="text-dark-400">(selten getroffen)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string; icon?: string }> = ({ 
  label, 
  value, 
  color = 'gray',
  icon 
}) => {
  const colorClasses = {
    gray: 'from-dark-700 to-dark-800 border-dark-600',
    green: 'from-success-600 to-success-700 border-success-500',
    blue: 'from-primary-600 to-primary-700 border-primary-500',
    purple: 'from-accent-600 to-accent-700 border-accent-500',
    yellow: 'from-yellow-600 to-yellow-700 border-yellow-500',
  };

  return (
    <div className={`glass-card p-6 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray} border border-opacity-20`}>
      <div className="text-sm text-dark-300 mb-2 font-medium">{label}</div>
      <div className="text-3xl font-bold text-white flex items-center gap-2">
        {icon && <span className="text-2xl">{icon}</span>}
        {value}
      </div>
    </div>
  );
};

// Player Comparison Component
const PlayerComparisonView: React.FC<{
  players: any[];
  comparePlayerIds: string[];
  setComparePlayerIds: (ids: string[]) => void;
  matches: Match[];
  storage: any;
}> = ({ players, comparePlayerIds, setComparePlayerIds, matches }) => {
  
  const togglePlayer = (playerId: string) => {
    if (comparePlayerIds.includes(playerId)) {
      setComparePlayerIds(comparePlayerIds.filter(id => id !== playerId));
    } else if (comparePlayerIds.length < 4) {
      setComparePlayerIds([...comparePlayerIds, playerId]);
    }
  };

  // Calculate stats for compared players - USE PLAYER STATS instead of match data
  const comparisonData = useMemo(() => {
    return comparePlayerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      
      if (!player || !player.stats) return null;

      const stats = player.stats;

      return {
        player,
        totalGames: stats.gamesPlayed || 0,
        wins: stats.gamesWon || 0,
        winRate: stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0,
        avgScore: stats.averageOverall || 0,
        total180s: stats.total180s || 0,
        checkoutRate: stats.checkoutPercentage || 0,
        highestScore: stats.highestCheckout || 0,
      };
    }).filter(Boolean);
  }, [comparePlayerIds, players]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (comparisonData.length === 0) return [];

    const categories = [
      { category: 'Average', max: 100 },
      { category: 'Win Rate', max: 100 },
      { category: 'Checkout %', max: 100 },
      { category: '180s', max: 20 },
      { category: 'Consistency', max: 100 },
    ];

    return categories.map(cat => {
      const dataPoint: any = { category: cat.category };
      comparisonData.forEach((data, index) => {
        let value = 0;
        switch (cat.category) {
          case 'Average':
            // Normalize to 0-100 (max average = 80)
            value = Math.min((data!.avgScore / 80) * 100, 100);
            break;
          case 'Win Rate':
            value = data!.winRate;
            break;
          case 'Checkout %':
            value = data!.checkoutRate;
            break;
          case '180s':
            // Normalize to 0-100 (max = 20 180s)
            value = Math.min((data!.total180s / 20) * 100, 100);
            break;
          case 'Consistency':
            // Normalize to 0-100 (max = 50 games)
            value = data!.totalGames > 0 ? Math.min((data!.totalGames / 50) * 100, 100) : 0;
            break;
        }
        dataPoint[`player${index}`] = value;
      });
      return dataPoint;
    });
  }, [comparisonData]);

  const colors = ['#0ea5e9', '#a855f7', '#22c55e', '#f59e0b'];

  if (players.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Users size={64} className="mx-auto mb-4 text-dark-600" />
        <p className="text-dark-400 text-lg font-semibold">Keine Spieler vorhanden</p>
        <p className="text-dark-500 text-sm mt-2">Erstelle Spieler, um sie zu vergleichen</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player Selection */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users size={24} />
          Spieler auswählen (max. 4)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              disabled={!comparePlayerIds.includes(player.id) && comparePlayerIds.length >= 4}
              className={`glass-card p-5 rounded-xl border-2 transition-all ${
                comparePlayerIds.includes(player.id)
                  ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                  : 'border-dark-700 hover:border-dark-600 hover:bg-dark-800/50'
              } ${
                !comparePlayerIds.includes(player.id) && comparePlayerIds.length >= 4
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:scale-105'
              }`}
            >
              <div className="text-4xl mb-3">{player.avatar}</div>
              <div className="font-bold text-white text-base">{player.name}</div>
              {comparePlayerIds.includes(player.id) && (
                <div className="text-xs text-primary-400 mt-2 font-semibold">✓ Ausgewählt</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {comparePlayerIds.length < 2 && (
        <div className="glass-card p-8 text-center">
          <p className="text-dark-400 text-lg font-semibold">Wähle mindestens 2 Spieler zum Vergleichen</p>
          <p className="text-dark-500 text-sm mt-2">Klicke auf die Spieler oben, um sie auszuwählen</p>
        </div>
      )}

      {comparisonData.length >= 2 && (
        <>
          {/* Radar Comparison */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">📊 Leistungsvergleich</h3>
            <div className="bg-dark-900 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#404040" />
                  <PolarAngleAxis dataKey="category" stroke="#737373" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#404040" />
                  {comparisonData.map((data, index) => (
                    <Radar
                      key={index}
                      name={data!.player.name}
                      dataKey={`player${index}`}
                      stroke={colors[index]}
                      fill={colors[index]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #404040',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Comparison Table */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">📈 Statistik-Vergleich</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left p-3 text-dark-400 font-semibold">Kategorie</th>
                    {comparisonData.map((data, index) => (
                      <th key={index} className="text-center p-3 text-white font-semibold">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl">{data!.player.avatar}</span>
                          <span>{data!.player.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dark-800">
                    <td className="p-3 text-dark-300">Spiele</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-white font-bold">
                        {data!.totalGames}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-dark-800">
                    <td className="p-3 text-dark-300">Siege</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-success-400 font-bold">
                        {data!.wins}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-dark-800">
                    <td className="p-3 text-dark-300">Siegrate</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-primary-400 font-bold">
                        {data!.winRate.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-dark-800">
                    <td className="p-3 text-dark-300">Durchschnitt</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-white font-bold">
                        {data!.avgScore.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-dark-800">
                    <td className="p-3 text-dark-300">180s</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-accent-400 font-bold">
                        {data!.total180s}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-dark-800">
                    <td className="p-3 text-dark-300">Checkout-Quote</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-success-400 font-bold">
                        {data!.checkoutRate.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-dark-300">Höchster Score</td>
                    {comparisonData.map((data, index) => (
                      <td key={index} className="p-3 text-center text-amber-400 font-bold">
                        {data!.highestScore}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar Chart Comparison */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">📊 Direktvergleich</h3>
            <div className="bg-dark-900 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: 'Average',
                      ...Object.fromEntries(comparisonData.map((d, i) => [`player${i}`, d!.avgScore])),
                    },
                    {
                      name: 'Win Rate %',
                      ...Object.fromEntries(comparisonData.map((d, i) => [`player${i}`, d!.winRate])),
                    },
                    {
                      name: 'Checkout %',
                      ...Object.fromEntries(comparisonData.map((d, i) => [`player${i}`, d!.checkoutRate])),
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" />
                  <YAxis stroke="#737373" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #404040',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {comparisonData.map((data, index) => (
                    <Bar
                      key={index}
                      dataKey={`player${index}`}
                      fill={colors[index]}
                      name={data!.player.name}
                      radius={[8, 8, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsOverview;