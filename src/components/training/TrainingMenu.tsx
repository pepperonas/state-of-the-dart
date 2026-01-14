import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Crosshair, Clock, TrendingUp, Award, Zap } from 'lucide-react';

const TrainingMenu: React.FC = () => {
  const navigate = useNavigate();
  
  const trainingModes = [
    {
      title: 'Doubles Practice',
      icon: Target,
      description: 'Focus on hitting doubles',
      color: 'bg-blue-500',
    },
    {
      title: 'Triples Practice',
      icon: Crosshair,
      description: 'Master the triple ring',
      color: 'bg-purple-500',
    },
    {
      title: 'Around the Clock',
      icon: Clock,
      description: 'Hit every number in sequence',
      color: 'bg-green-500',
    },
    {
      title: 'Checkout Training',
      icon: Award,
      description: 'Practice finishing combinations',
      color: 'bg-yellow-500',
    },
    {
      title: "Bob's 27",
      icon: TrendingUp,
      description: 'Classic pressure training',
      color: 'bg-red-500',
    },
    {
      title: 'Score Training',
      icon: Zap,
      description: 'Improve your scoring power',
      color: 'bg-indigo-500',
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
          <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Training Modes</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {trainingModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.title}
                  className={`${mode.color} rounded-lg p-6 text-white hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-4">
                    <Icon size={32} />
                    <div className="text-left">
                      <h3 className="text-lg font-bold">{mode.title}</h3>
                      <p className="text-sm opacity-90">{mode.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">Training Benefits</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Track your progress over time</li>
              <li>• Improve specific areas of your game</li>
              <li>• Compare your scores with personal bests</li>
              <li>• Build consistency and confidence</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingMenu;