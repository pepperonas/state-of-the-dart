import React, { useState } from 'react';
import { Match } from '../../types';
import { Calendar, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';

interface MatchHistoryProps {
  matches: Match[];
  playerId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, playerId }) => {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  
  // Sort matches by date (newest first)
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  
  const toggleMatch = (matchId: string) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };
  
  return (
    <div className="space-y-3">
      {sortedMatches.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Target size={48} className="mx-auto mb-2 opacity-50" />
          <p>Noch keine Spiele gespielt</p>
        </div>
      ) : (
        sortedMatches.map((match) => {
          const player = match.players.find(p => p.playerId === playerId);
          const opponent = match.players.find(p => p.playerId !== playerId);
          const isWin = match.winner === playerId;
          const isExpanded = expandedMatch === match.id;
          
          if (!player || !opponent) return null;
          
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
                      {player.name} vs {opponent.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(match.startedAt).toLocaleDateString('de-DE')}
                      </span>
                      <span>Score: {player.legsWon} - {opponent.legsWon}</span>
                      <span>Avg: {player.matchAverage.toFixed(2)}</span>
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
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white/50 dark:bg-gray-800/50">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Player Stats */}
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                        {player.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <StatBox label="Average" value={player.matchAverage.toFixed(2)} />
                        <StatBox label="Highest Score" value={player.matchHighestScore} />
                        <StatBox label="180s" value={player.match180s} />
                        <StatBox label="140+" value={player.match140Plus} />
                        <StatBox label="100+" value={player.match100Plus} />
                        <StatBox 
                          label="Checkout %" 
                          value={
                            player.checkoutAttempts > 0
                              ? `${((player.checkoutsHit / player.checkoutAttempts) * 100).toFixed(1)}%`
                              : '0%'
                          } 
                        />
                      </div>
                    </div>
                    
                    {/* Opponent Stats */}
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                        {opponent.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <StatBox label="Average" value={opponent.matchAverage.toFixed(2)} />
                        <StatBox label="Highest Score" value={opponent.matchHighestScore} />
                        <StatBox label="180s" value={opponent.match180s} />
                        <StatBox label="140+" value={opponent.match140Plus} />
                        <StatBox label="100+" value={opponent.match100Plus} />
                        <StatBox 
                          label="Checkout %" 
                          value={
                            opponent.checkoutAttempts > 0
                              ? `${((opponent.checkoutsHit / opponent.checkoutAttempts) * 100).toFixed(1)}%`
                              : '0%'
                          } 
                        />
                      </div>
                    </div>
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
