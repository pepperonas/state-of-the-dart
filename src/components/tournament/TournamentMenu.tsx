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
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          Back to Menu
        </button>
        
        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-3xl font-bold mb-6 text-white">Tournament</h2>
          
          <div className="mb-6">
            <button className="w-full py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg">
              Create New Tournament
            </button>
          </div>
          
          <div className="space-y-4">
            {tournamentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className="border border-dark-700 rounded-lg p-4 bg-dark-900/30 hover:bg-dark-900/50 hover:border-dark-600 transition-all card-hover-effect cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg shadow-lg">
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white mb-1">{type.title}</h3>
                      <p className="text-sm text-dark-300 mb-2">{type.description}</p>
                      <p className="text-xs text-dark-400">{type.players}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 p-4 bg-accent-500/10 rounded-lg border border-accent-500/30">
            <h3 className="font-semibold mb-2 text-white">Active Tournaments</h3>
            <p className="text-sm text-dark-300">
              No active tournaments. Create one to get started!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentMenu;