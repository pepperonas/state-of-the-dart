import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, Trophy, Dumbbell, Settings, Play, LogOut } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useGame } from '../context/GameContext';

const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, storage } = useTenant();
  const { state } = useGame();
  const [hasSavedMatch, setHasSavedMatch] = useState(false);
  
  useEffect(() => {
    if (storage) {
      const savedMatch = storage.get<{status?: string} | null>('currentMatch', null);
      setHasSavedMatch(!!savedMatch && savedMatch.status === 'in-progress');
    }
  }, [storage, state.currentMatch]);
  
  const menuItems = [
    {
      title: 'Quick Game',
      icon: Target,
      description: 'Start a quick game of 501',
      onClick: () => navigate('/game'),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Players',
      icon: Users,
      description: 'Manage player profiles',
      onClick: () => navigate('/players'),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Statistics',
      icon: TrendingUp,
      description: 'View stats and history',
      onClick: () => navigate('/stats'),
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Tournament',
      icon: Trophy,
      description: 'Create or join tournaments',
      onClick: () => navigate('/tournament'),
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      title: 'Training',
      icon: Dumbbell,
      description: 'Practice and improve',
      onClick: () => navigate('/training'),
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      title: 'Settings',
      icon: Settings,
      description: 'Configure app settings',
      onClick: () => navigate('/settings'),
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ];
  
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-2xl">
                {currentTenant?.avatar}
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-400">Aktuelles Profil</p>
                <p className="text-lg font-bold text-white">{currentTenant?.name}</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentTenant(null)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-white transition-all"
            >
              <LogOut size={20} />
              Profil wechseln
            </button>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            DartCounter Pro
          </h1>
          <p className="text-xl text-gray-300">
            Triple-A Professional Dart Scoring System
          </p>
        </motion.div>
        
        {hasSavedMatch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => navigate('/game')}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all"
            >
              <Play size={24} />
              Match fortsetzen
            </button>
          </motion.div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, rotate: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={item.onClick}
                className="glass-card rounded-xl p-6 text-white shadow-lg transform transition-all duration-200 hover:shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex flex-col items-center space-y-4 relative z-10">
                  <div className={`p-4 rounded-full ${item.color} bg-opacity-20 backdrop-blur-sm`}>
                    <Icon size={48} className="drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold drop-shadow-md">{item.title}</h2>
                    <p className="text-sm opacity-90 mt-1">{item.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2026 Martin Pfeffer | celox.io
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;