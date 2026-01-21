import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, User, Eye, Crown } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { api } from '../../services/api';

const PlayerManagement: React.FC = () => {
  const navigate = useNavigate();
  const { players, loading, addPlayer, deletePlayer, updatePlayer } = usePlayer();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [mainPlayerId, setMainPlayerId] = useState<string | null>(null);

  // Load main player on mount
  useEffect(() => {
    const loadMainPlayer = async () => {
      try {
        const response = await api.auth.getMainPlayer();
        setMainPlayerId(response.mainPlayerId);
      } catch (error) {
        console.error('Failed to load main player:', error);
      }
    };
    loadMainPlayer();
  }, []);
  
  const handleAddPlayer = async () => {
    if (newPlayerName.trim()) {
      try {
        await addPlayer(newPlayerName.trim());
        setNewPlayerName('');
        setShowAddPlayer(false);
      } catch (error) {
        console.error('Failed to add player:', error);
        alert('Fehler beim Erstellen des Spielers');
      }
    }
  };
  
  const handleEditPlayer = async (id: string) => {
    if (editName.trim()) {
      try {
        await updatePlayer(id, { name: editName.trim() });
        setEditingPlayer(null);
        setEditName('');
      } catch (error) {
        console.error('Failed to update player:', error);
        alert('Fehler beim Aktualisieren des Spielers');
      }
    }
  };

  const handleSetMainPlayer = async (playerId: string) => {
    try {
      await api.auth.setMainPlayer(playerId);
      setMainPlayerId(playerId);
    } catch (error) {
      console.error('Failed to set main player:', error);
      alert('Fehler beim Setzen des Haupt-Profils');
    }
  };
  
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Players</h2>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold transition-all"
            >
              <Plus size={20} />
              Add Player
            </button>
          </div>
          
          {showAddPlayer && (
            <div className="mb-6 p-4 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                  placeholder="Enter player name"
                  className="flex-1 px-3 py-2 rounded-lg border border-dark-700 bg-dark-800 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <button
                  onClick={handleAddPlayer}
                  className="px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold transition-all"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName('');
                  }}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-white text-lg font-semibold">Loading players...</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12">
                <User size={64} className="mx-auto text-dark-600 mb-4" />
                <p className="text-white text-lg font-semibold">No players yet</p>
                <p className="text-sm text-dark-400 mt-2">
                  Add your first player to get started
                </p>
              </div>
            ) : (
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-dark-900/50 border border-dark-700 rounded-lg hover:border-dark-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      {player.avatar}
                    </div>
                    {editingPlayer === player.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEditPlayer(player.id);
                        }}
                        onBlur={() => handleEditPlayer(player.id)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        autoFocus
                      />
                    ) : (
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                          {player.name}
                          {mainPlayerId === player.id && (
                            <span title="Haupt-Profil">
                              <Crown size={18} className="text-amber-400" />
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Games: {player.stats.gamesPlayed} | Avg: {player.stats.averageOverall.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/players/${player.id}`)}
                      className="p-2 text-primary-400 hover:bg-primary-500/20 rounded-lg transition-colors"
                      title="View Profile"
                    >
                      <Eye size={18} />
                    </button>
                    {mainPlayerId !== player.id && (
                      <button
                        onClick={() => handleSetMainPlayer(player.id)}
                        className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                        title="Als Haupt-Profil setzen"
                      >
                        <Crown size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingPlayer(player.id);
                        setEditName(player.name);
                      }}
                      className="p-2 text-accent-400 hover:bg-accent-500/20 rounded-lg transition-colors"
                      title="Edit Name"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete player "${player.name}"?`)) {
                          try {
                            await deletePlayer(player.id);
                          } catch (error) {
                            console.error('Failed to delete player:', error);
                            alert('Fehler beim Löschen des Spielers');
                          }
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete Player"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerManagement;