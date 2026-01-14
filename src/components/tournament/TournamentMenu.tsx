import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Calendar, Star } from 'lucide-react';

const TournamentMenu: React.FC = () => {
  const navigate = useNavigate();
  
  const tournamentTypes = [
    {
      title: 'Knockout',
      icon: Trophy,
      description: 'Single or double elimination bracket',
      players: '4, 8, 16, or 32 players',
    },
    {
      title: 'Round Robin',
      icon: Users,
      description: 'Everyone plays everyone',
      players: '3-8 players',
    },
    {
      title: 'League',
      icon: Calendar,
      description: 'Extended competition with standings',
      players: '4-12 players',
    },
    {
      title: 'Swiss System',
      icon: Star,
      description: 'Paired rounds based on performance',
      players: '8+ players',
    },
  ];
  
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft size={20} />
          Back to Menu
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Tournament</h2>
          
          <div className="mb-6">
            <button className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg font-bold text-lg hover:from-yellow-500 hover:to-yellow-700 transition-all">
              Create New Tournament
            </button>
          </div>
          
          <div className="space-y-4">
            {tournamentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                      <Icon size={24} className="text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 dark:text-white mb-1">{type.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{type.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{type.players}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-200">Active Tournaments</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              No active tournaments. Create one to get started!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentMenu;