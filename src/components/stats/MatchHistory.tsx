import React, { useState, useEffect, useMemo } from 'react';
import { Match, Throw } from '../../types';
import { Calendar, Target, Award, ChevronDown, ChevronUp, TrendingUp, Loader, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, getTimestampForSort } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';

interface MatchHistoryProps {
  matches: Match[];
  playerId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, playerId }) => {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<string, Match>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sort matches by date (newest first)
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) =>
      getTimestampForSort(b.startedAt) - getTimestampForSort(a.startedAt)
    );
  }, [matches]);

  // Filter matches by search query
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return sortedMatches;
    const query = searchQuery.toLowerCase();
    return sortedMatches.filter(match => {
      const matchPlayers = match.players || [];
      const player = matchPlayers.find(p => p.playerId === playerId);
      const opponent = matchPlayers.find(p => p.playerId !== playerId);
      const dateStr = formatDate(match.startedAt).toLowerCase();
      
      return (
        player?.name.toLowerCase().includes(query) ||
        opponent?.name.toLowerCase().includes(query) ||
        dateStr.includes(query) ||
        match.type?.toLowerCase().includes(query)
      );
    });
  }, [sortedMatches, searchQuery, playerId]);

  // Pagination
  const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Load match details when expanding
  const toggleMatch = async (matchId: string) => {
    if (expandedMatch === matchId) {
      setExpandedMatch(null);
      return;
    }

    setExpandedMatch(matchId);

    // Load details if not already loaded and not currently loading
    if (!matchDetails[matchId] && !loadingDetails[matchId]) {
      setLoadingDetails(prev => ({ ...prev, [matchId]: true }));
      try {
        const fullMatch = await api.matches.getById(matchId);
        setMatchDetails(prev => ({ ...prev, [matchId]: fullMatch }));
      } catch (error: any) {
        // Handle rate limit errors gracefully
        if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
          console.warn('Rate limit reached, please wait a moment before trying again');
          // Retry after a delay
          setTimeout(() => {
            if (!matchDetails[matchId] && !loadingDetails[matchId]) {
              toggleMatch(matchId);
            }
          }, 2000);
        } else {
          console.error('Failed to load match details:', error);
        }
      } finally {
        setLoadingDetails(prev => ({ ...prev, [matchId]: false }));
      }
    }
  };

  // Prepare round-by-round data for chart
  const prepareRoundData = (match: Match) => {
    const allThrows: Throw[] = [];
    const legs = match.legs || [];
    const players = match.players || [];

    // Return empty if no data
    if (legs.length === 0 || players.length === 0) {
      return [];
    }

    // Collect all throws from all legs
    legs.forEach(leg => {
      const throws = leg.throws || [];
      allThrows.push(...throws);
    });

    // Sort by timestamp
    const sortedThrows = allThrows.sort((a, b) =>
      getTimestampForSort(a.timestamp) - getTimestampForSort(b.timestamp)
    );

    // Group by player and round (3 darts = 1 round)
    const playerRounds: Record<string, { round: number; score: number }[]> = {};

    players.forEach(player => {
      const playerThrows = sortedThrows.filter(t => t.playerId === player.playerId);
      const rounds: { round: number; score: number }[] = [];

      for (let i = 0; i < playerThrows.length; i += 1) {
        const roundNumber = Math.floor(i / 3) + 1;
        const throwScore = playerThrows[i].score ?? 0;

        // Check if this round already exists
        const existingRound = rounds.find(r => r.round === roundNumber);
        if (existingRound) {
          existingRound.score += throwScore;
        } else {
          rounds.push({ round: roundNumber, score: throwScore });
        }
      }

      playerRounds[player.playerId] = rounds;
    });

    // Merge data for chart
    const roundCounts = Object.values(playerRounds).map(r => r.length);
    const maxRounds = roundCounts.length > 0 ? Math.max(...roundCounts) : 0;
    const chartData = [];

    for (let i = 1; i <= maxRounds; i++) {
      const dataPoint: any = { round: i };

      players.forEach(player => {
        const roundData = playerRounds[player.playerId]?.find(r => r.round === i);
        // Use playerId as key to avoid issues with special characters in names
        dataPoint[player.playerId] = roundData?.score || 0;
      });

      chartData.push(dataPoint);
    }

    return chartData;
  };
  
  return (
    <div className="space-y-3">
      {/* Search and Pagination Controls */}
      {sortedMatches.length > 0 && (
        <div className="mb-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nach Gegner, Datum oder Spieltyp suchen..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-dark-700 bg-dark-800 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Items per page and pagination info */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">Zeige:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 rounded-lg border border-dark-700 bg-dark-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-dark-400">
                von {filteredMatches.length} Match{filteredMatches.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-dark-700 bg-dark-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-700 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-800 text-white hover:bg-dark-700 border border-dark-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-dark-700 bg-dark-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-700 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredMatches.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Target size={48} className="mx-auto mb-2 opacity-50" />
          <p>{searchQuery ? 'Keine Matches gefunden' : 'Noch keine Spiele gespielt'}</p>
          {searchQuery && (
            <p className="text-sm mt-2">Keine Matches gefunden für "{searchQuery}"</p>
          )}
        </div>
      ) : (
        paginatedMatches.map((match) => {
          const matchPlayers = match.players || [];
          const player = matchPlayers.find(p => p.playerId === playerId);
          const opponent = matchPlayers.find(p => p.playerId !== playerId);
          const isWin = match.winner === playerId;
          const isExpanded = expandedMatch === match.id;

          // Skip matches without player data - they can't be displayed properly
          if (matchPlayers.length === 0 || !player) return null;
          
          return (
            <div 
              key={match.id}
              className={`border rounded-lg overflow-hidden transition-all ${
                isWin 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              {/* Match Summary */}
              <button
                onClick={() => toggleMatch(match.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Result Badge */}
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    isWin 
                      ? 'bg-green-500 text-white' 
                      : 'bg-red-500 text-white'
                  }`}>
                    {isWin ? 'WIN' : 'LOSS'}
                  </div>
                  
                  {/* Match Info */}
                  <div className="flex-1 text-left">
                    <div className="font-bold text-gray-800 dark:text-white">
                      {player.name} vs {opponent?.name || 'Unbekannt'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(match.startedAt)}
                      </span>
                      <span>Score: {player.legsWon} - {opponent?.legsWon ?? 0}</span>
                      <span>Avg: {(player.matchAverage ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="hidden md:flex items-center gap-4 text-sm">
                    {player.match180s > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Award size={16} />
                        <span>{player.match180s}×180</span>
                      </div>
                    )}
                    {player.matchHighestScore > 0 && (
                      <div className="text-gray-600 dark:text-gray-400">
                        High: {player.matchHighestScore}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Expand Icon */}
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white/50 dark:bg-gray-800/50 space-y-6">
                  {/* Round-by-Round Chart */}
                  <div className="glass-card p-6 rounded-xl">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp size={20} className="text-primary-400" />
                      Runden-Verlauf
                    </h4>
                    {loadingDetails[match.id] ? (
                      <div className="bg-dark-900 rounded-lg p-12 text-center">
                        <Loader className="mx-auto mb-4 text-primary-400 animate-spin" size={48} />
                        <p className="text-dark-400 font-medium">Lade Match-Details...</p>
                      </div>
                    ) : matchDetails[match.id] ? (
                      <div className="bg-dark-900 rounded-lg p-4">
                        {prepareRoundData(matchDetails[match.id]).length > 0 ? (
                          <div className="h-[220px] sm:h-[300px]"><ResponsiveContainer width="100%" height="100%">
                            <LineChart data={prepareRoundData(matchDetails[match.id])}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                          <XAxis 
                            dataKey="round" 
                            stroke="#737373" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Runde', position: 'insideBottom', offset: -5, fill: '#737373' }}
                          />
                          <YAxis 
                            stroke="#737373" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Punkte', angle: -90, position: 'insideLeft', fill: '#737373' }}
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
                            formatter={(value: number) => [`${value} Punkte`, '']}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                          />
                          {matchPlayers.map((p, index) => (
                            <Line
                              key={p.playerId}
                              type="monotone"
                              dataKey={p.playerId}
                              stroke={index === 0 ? '#0ea5e9' : '#a855f7'}
                              strokeWidth={3}
                              dot={{ fill: index === 0 ? '#0ea5e9' : '#a855f7', r: 5 }}
                              activeDot={{ r: 7 }}
                              name={p.name}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer></div>
                        ) : (
                          <div className="bg-dark-900 rounded-lg p-8 text-center">
                            <TrendingUp size={48} className="mx-auto mb-3 text-dark-600 opacity-30" />
                            <p className="text-dark-400 font-medium">Keine Runden-Daten verfügbar</p>
                            <p className="text-dark-500 text-sm mt-2">
                              Dieses Match wurde möglicherweise vor dem Tracking-Update gespielt
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-dark-900 rounded-lg p-8 text-center">
                        <TrendingUp size={48} className="mx-auto mb-3 text-dark-600 opacity-30" />
                        <p className="text-dark-400 font-medium">Keine Runden-Daten verfügbar</p>
                      </div>
                    )}
                  </div>

                  <div className={`grid ${opponent ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                    {/* Player Stats */}
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                        {player.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <StatBox label="Average" value={(player.matchAverage ?? 0).toFixed(2)} />
                        <StatBox label="Highest Score" value={player.matchHighestScore ?? 0} />
                        <StatBox label="180s" value={player.match180s ?? 0} />
                        <StatBox label="140+" value={player.match140Plus ?? 0} />
                        <StatBox label="100+" value={player.match100Plus ?? 0} />
                        <StatBox
                          label="Checkout %"
                          value={
                            (player.checkoutAttempts ?? 0) > 0
                              ? `${(((player.checkoutsHit ?? 0) / player.checkoutAttempts) * 100).toFixed(1)}%`
                              : '0%'
                          }
                        />
                      </div>
                    </div>

                    {/* Opponent Stats - only show if opponent exists */}
                    {opponent && (
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                          {opponent.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <StatBox label="Average" value={(opponent.matchAverage ?? 0).toFixed(2)} />
                          <StatBox label="Highest Score" value={opponent.matchHighestScore ?? 0} />
                          <StatBox label="180s" value={opponent.match180s ?? 0} />
                          <StatBox label="140+" value={opponent.match140Plus ?? 0} />
                          <StatBox label="100+" value={opponent.match100Plus ?? 0} />
                          <StatBox
                            label="Checkout %"
                            value={
                              (opponent.checkoutAttempts ?? 0) > 0
                                ? `${(((opponent.checkoutsHit ?? 0) / opponent.checkoutAttempts) * 100).toFixed(1)}%`
                                : '0%'
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Leg-by-Leg Breakdown */}
                  {match.legs && match.legs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h5 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Leg Details
                      </h5>
                      <div className="flex gap-2 flex-wrap">
                        {match.legs.map((leg, index) => (
                          <div
                            key={leg.id}
                            className={`px-3 py-1 rounded text-sm ${
                              leg.winner === playerId
                                ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                : 'bg-red-500/20 text-red-700 dark:text-red-300'
                            }`}
                          >
                            Leg {index + 1}: {leg.winner === playerId ? '✓' : '✗'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
    <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
    <div className="text-lg font-bold text-gray-800 dark:text-white">{value}</div>
  </div>
);

export default MatchHistory;
