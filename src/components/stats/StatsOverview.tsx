import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Award, Target, Activity } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

const StatsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { players } = usePlayer();
  
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft size={20} />
          Back to Menu
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Statistics Overview</h2>
          
          {players.length === 0 ? (
            <div className="text-center py-12">
              <Activity size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Play some games to see your statistics
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {players.map((player) => (
                <div key={player.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xl font-bold">
                        {player.avatar}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">{player.name}</h3>
                    </div>
                    
                    {player.stats.gamesWon > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Award size={20} />
                        <span className="font-semibold">{player.stats.gamesWon}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Games Played</div>
                      <div className="text-2xl font-bold">{player.stats.gamesPlayed}</div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
                      <div className="text-2xl font-bold">{player.stats.averageOverall.toFixed(2)}</div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Best Average</div>
                      <div className="text-2xl font-bold">{player.stats.bestAverage.toFixed(2)}</div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">180s</div>
                      <div className="text-2xl font-bold">{player.stats.total180s}</div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">High Checkout</div>
                      <div className="text-2xl font-bold">{player.stats.highestCheckout || '-'}</div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Checkout %</div>
                      <div className="text-2xl font-bold">{player.stats.checkoutPercentage.toFixed(1)}%</div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
                      <div className="text-2xl font-bold">
                        {player.stats.gamesPlayed > 0
                          ? ((player.stats.gamesWon / player.stats.gamesPlayed) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">9-Darters</div>
                      <div className="text-2xl font-bold">{player.stats.nineDartFinishes}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;