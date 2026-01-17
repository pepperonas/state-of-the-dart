import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Calendar, Star, Construction } from 'lucide-react';

const TournamentMenu: React.FC = () => {
  const navigate = useNavigate();

  const tournamentTypes = [
    {
      title: 'Knockout',
      icon: Trophy,
      description: 'Single oder Double Elimination Bracket',
      players: '4, 8, 16 oder 32 Spieler',
    },
    {
      title: 'Round Robin',
      icon: Users,
      description: 'Jeder spielt gegen jeden',
      players: '3-8 Spieler',
    },
    {
      title: 'Liga',
      icon: Calendar,
      description: 'Langzeit-Wettbewerb mit Tabelle',
      players: '4-12 Spieler',
    },
    {
      title: 'Schweizer System',
      icon: Star,
      description: 'Paarungen basierend auf Leistung',
      players: '8+ Spieler',
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:bg-dark-700/50 transition-all"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>

        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8 border border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg">
              <Trophy size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Turniere</h2>
              <p className="text-dark-400">Organisiere Dart-Wettbewerbe</p>
            </div>
          </div>

          {/* Coming Soon Banner */}
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <Construction size={32} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-400 mb-1">Coming Soon</h3>
                <p className="text-dark-300">
                  Das Turnier-Feature ist noch in Entwicklung. Bald kannst du hier spannende Turniere mit deinen Freunden organisieren!
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white mb-4">Geplante Turnier-Modi</h3>

          <div className="space-y-4 opacity-60">
            {tournamentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className="border border-dark-700 rounded-lg p-4 bg-dark-900/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary-500/50 to-accent-500/50 rounded-lg">
                      <Icon size={24} className="text-white/70" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white/70 mb-1">{type.title}</h3>
                      <p className="text-sm text-dark-400 mb-2">{type.description}</p>
                      <p className="text-xs text-dark-500">{type.players}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentMenu;