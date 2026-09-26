import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Match, Throw } from '../../types';
import { Calendar, Target, Award, ChevronDown, ChevronUp, TrendingUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, getTimestampForSort } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { Card, TextField, IconButton, Button, Select } from '../common';
import { Icon } from '../icons';
import LoadingIndicator from '../common/LoadingIndicator';
import { useChartTheme } from '../../utils/chartTheme';

interface MatchHistoryProps {
  matches: Match[];
  playerId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, playerId }) => {
  const { t } = useTranslation();
  const chart = useChartTheme();
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
    <div className="space-y-3 m3-stagger">
      {/* Search and Pagination Controls */}
      {sortedMatches.length > 0 && (
        <div className="mb-4 space-y-4">
          {/* Search */}
          <TextField
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('match_list.search_placeholder')}
            icon={<Search size={20} />}
          />

          {/* Items per page and pagination info */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="m3-body-small text-on-surface-variant">{t('match_list.show')}</span>
              <Select<number>
                value={itemsPerPage}
                onChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                size="sm"
                inline
                aria-label={t('match_list.per_page')}
                options={[10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))}
              />
              <span className="m3-body-small text-on-surface-variant">
                {t('match_list.of_matches', { count: filteredMatches.length })}
              </span>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <IconButton
                  variant="outlined"
                  label={t('match_list.previous_page')}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                </IconButton>

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
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={currentPage === pageNum ? 'tonal' : 'text'}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <IconButton
                  variant="outlined"
                  label={t('match_list.next_page')}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredMatches.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant">
          <Target size={48} className="mx-auto mb-2 opacity-50" />
          <p className="m3-body-large">{searchQuery ? t('match_list.none_found') : t('match_list.none_played')}</p>
          {searchQuery && (
            <p className="m3-body-small mt-2">{t('match_list.none_found_for', { query: searchQuery })}</p>
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
            <Card
              key={match.id}
              variant="elevated"
              className="overflow-hidden"
            >
              {/* Match Summary */}
              <button
                onClick={() => toggleMatch(match.id)}
                className="m3-state-layer w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Result Badge */}
                  <div className={`px-3 py-1 rounded-m3-full m3-label-large font-bold ${
                    isWin
                      ? 'bg-success-container text-on-success-container'
                      : 'bg-error-container text-on-error-container'
                  }`}>
                    {isWin ? t('match_list.win') : t('match_list.loss')}
                  </div>

                  {/* Match Info */}
                  <div className="flex-1 text-left">
                    <div className="m3-title-medium m3-emphasized text-on-surface">
                      {player.name} vs {opponent?.name || t('match_list.unknown')}
                    </div>
                    <div className="m3-body-small text-on-surface-variant flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(match.startedAt)}
                      </span>
                      <span>{t('match_list.score', { own: player.legsWon, opponent: opponent?.legsWon ?? 0 })}</span>
                      <span>{t('match_list.avg', { value: (player.matchAverage ?? 0).toFixed(2) })}</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="hidden md:flex items-center gap-4 m3-body-small">
                    {player.match180s > 0 && (
                      <div className="flex items-center gap-1 text-tertiary">
                        <Award size={16} />
                        <span>{player.match180s}×180</span>
                      </div>
                    )}
                    {player.matchHighestScore > 0 && (
                      <div className="text-on-surface-variant">
                        {t('match_list.high', { value: player.matchHighestScore })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expand Icon */}
                {isExpanded ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
              </button>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-outline-variant p-4 bg-surface-container-low space-y-6">
                  {/* Round-by-Round Chart */}
                  <Card variant="filled" className="p-6">
                    <h4 className="m3-title-medium m3-emphasized text-on-surface mb-4 flex items-center gap-2">
                      <TrendingUp size={20} className="text-primary" />
                      {t('match_list.round_chart')}
                    </h4>
                    {loadingDetails[match.id] ? (
                      <div className="bg-surface-container-high rounded-m3-md p-12 text-center">
                        <LoadingIndicator size={48} />
                        <p className="text-on-surface-variant m3-body-medium">{t('match_list.loading_details')}</p>
                      </div>
                    ) : matchDetails[match.id] ? (
                      <div className="bg-surface-container-high rounded-m3-md p-4">
                        {prepareRoundData(matchDetails[match.id]).length > 0 ? (
                          <div className="h-[220px] sm:h-[300px]"><ResponsiveContainer width="100%" height="100%">
                            <LineChart data={prepareRoundData(matchDetails[match.id])}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis 
                            dataKey="round" 
                            stroke={chart.axis} 
                            style={{ fontSize: '12px' }}
                            label={{ value: t('match_list.round'), position: 'insideBottom', offset: -5, fill: chart.axis }}
                          />
                          <YAxis 
                            stroke={chart.axis} 
                            style={{ fontSize: '12px' }}
                            label={{ value: t('match_list.points'), angle: -90, position: 'insideLeft', fill: chart.axis }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: chart.tooltip.contentStyle.backgroundColor, 
                              border: chart.tooltip.contentStyle.border as string, 
                              borderRadius: '8px', 
                              padding: '12px' 
                            }} 
                            labelStyle={{ color: chart.text, fontWeight: 'bold' }}
                            itemStyle={{ color: chart.text }}
                            formatter={(value: number) => [t('match_list.points_value', { count: value }), '']}
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
                              stroke={chart.series[index % chart.series.length]}
                              strokeWidth={3}
                              dot={{ fill: chart.series[index % chart.series.length], r: 5 }}
                              activeDot={{ r: 7 }}
                              name={p.name}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer></div>
                        ) : (
                          <div className="bg-surface-container-high rounded-m3-md p-8 text-center">
                            <TrendingUp size={48} className="mx-auto mb-3 text-on-surface-variant opacity-30" />
                            <p className="text-on-surface-variant m3-body-medium">{t('match_list.no_rounds')}</p>
                            <p className="text-on-surface-variant m3-body-small mt-2">
                              {t('match_list.no_rounds_hint')}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-surface-container-high rounded-m3-md p-8 text-center">
                        <TrendingUp size={48} className="mx-auto mb-3 text-on-surface-variant opacity-30" />
                        <p className="text-on-surface-variant m3-body-medium">{t('match_list.no_rounds')}</p>
                      </div>
                    )}
                  </Card>

                  <div className={`grid ${opponent ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                    {/* Player Stats */}
                    <div>
                      <h4 className="m3-title-medium m3-emphasized text-on-surface mb-3">
                        {player.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <StatBox label={t('match_list.average')} value={(player.matchAverage ?? 0).toFixed(2)} />
                        <StatBox label={t('match_list.highest_score')} value={player.matchHighestScore ?? 0} />
                        <StatBox label="180s" value={player.match180s ?? 0} />
                        <StatBox label="140+" value={player.match140Plus ?? 0} />
                        <StatBox label="100+" value={player.match100Plus ?? 0} />
                        <StatBox
                          label={t('match_list.checkout_rate')}
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
                        <h4 className="m3-title-medium m3-emphasized text-on-surface mb-3">
                          {opponent.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <StatBox label={t('match_list.average')} value={(opponent.matchAverage ?? 0).toFixed(2)} />
                          <StatBox label={t('match_list.highest_score')} value={opponent.matchHighestScore ?? 0} />
                          <StatBox label="180s" value={opponent.match180s ?? 0} />
                          <StatBox label="140+" value={opponent.match140Plus ?? 0} />
                          <StatBox label="100+" value={opponent.match100Plus ?? 0} />
                          <StatBox
                            label={t('match_list.checkout_rate')}
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
                    <div className="mt-4 pt-4 border-t border-outline-variant">
                      <h5 className="m3-label-large font-semibold text-on-surface-variant mb-2">
                        {t('match_list.leg_details')}
                      </h5>
                      <div className="flex gap-2 flex-wrap">
                        {match.legs.map((leg, index) => (
                          <div
                            key={leg.id}
                            className={`px-3 py-1 rounded-m3-sm m3-body-small ${
                              leg.winner === playerId
                                ? 'bg-success-container text-on-success-container'
                                : 'bg-error-container text-on-error-container'
                            }`}
                          >
                            {t('match_list.leg_label', { n: index + 1 })} <Icon name={leg.winner === playerId ? 'check' : 'close'} size={14} className={leg.winner === playerId ? 'text-success' : 'text-error'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-surface-container-highest rounded-m3-sm p-2">
    <div className="m3-body-small text-on-surface-variant">{label}</div>
    <div className="m3-title-medium m3-emphasized text-on-surface">{value}</div>
  </div>
);

export default MatchHistory;
