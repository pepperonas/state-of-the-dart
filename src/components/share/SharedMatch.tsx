import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Loader, Share2 } from 'lucide-react';

interface MatchData {
  id: string;
  gameType: string;
  winner: string;
  players: any[];
  startedAt: number;
  completedAt: number;
}

const SharedMatch: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    if (!matchId) {
      setError('Invalid match ID');
      setLoading(false);
      return;
    }

    try {
      // Try to load from API (wenn eingeloggt) oder zeige Hinweis
      setError('Match Sharing wird bald verfügbar sein!');
    } catch (err) {
      setError('Match nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out my Darts Match!',
        text: `I just played a game of darts!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link kopiert!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <Loader className="animate-spin text-primary-400" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-4">{error}</h2>
          <p className="text-dark-300 mb-6">
            Dieses Feature wird bald verfügbar sein! Stay tuned 🚀
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all"
          >
            Zur App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>

        <div className="glass-card p-8 rounded-2xl">
          <div className="text-center">
            <Trophy className="text-amber-400 mx-auto mb-4" size={64} />
            <h1 className="text-3xl font-bold text-white mb-2">Match Details</h1>
            <p className="text-dark-300 mb-6">Coming Soon! 🚀</p>
            
            <button
              onClick={handleShare}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto transition-all"
            >
              <Share2 size={20} />
              Match teilen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedMatch;
