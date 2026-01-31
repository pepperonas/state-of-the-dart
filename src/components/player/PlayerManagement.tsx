import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, User, Eye, Crown, BarChart3, Smile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { api } from '../../services/api';
import PlayerAvatar from './PlayerAvatar';
import EmojiPicker from './EmojiPicker';

const PlayerManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players, loading, addPlayer, deletePlayer, updatePlayer } = usePlayer();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string | undefined>(undefined);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | undefined>(undefined);
  const [editingAvatar, setEditingAvatar] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // playerId or 'new'
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
        await addPlayer(newPlayerName.trim(), newPlayerAvatar);
        setNewPlayerName('');
        setNewPlayerAvatar(undefined);
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
        await updatePlayer(id, { name: editName.trim(), avatar: editAvatar });
        setEditingPlayer(null);
        setEditName('');
        setEditAvatar(undefined);
      } catch (error) {
        console.error('Failed to update player:', error);
        alert('Fehler beim Aktualisieren des Spielers');
      }
    }
  };

  const handleUpdateAvatar = async (id: string, avatar: string | undefined) => {
    try {
      await updatePlayer(id, { avatar });
      setEditingAvatar(null);
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Failed to update avatar:', error);
      alert('Fehler beim Aktualisieren des Avatars');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (showEmojiPicker === 'new') {
      setNewPlayerAvatar(emoji || undefined);
    } else if (showEmojiPicker) {
      handleUpdateAvatar(showEmojiPicker, emoji || undefined);
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
          {t('common.back')}
        </button>
        
        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">{t('players.title')}</h2>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold transition-all"
            >
              <Plus size={20} />
              {t('players.add_player')}
            </button>
          </div>
          
          {showAddPlayer && (
            <div className="mb-6 p-4 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Emoji auswählen (optional - lässt den Anfangsbuchstaben ersetzen)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {newPlayerAvatar ? (
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{newPlayerAvatar}</div>
                        <button
                          onClick={() => setNewPlayerAvatar(undefined)}
                          className="text-sm px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                        >
                          Entfernen
                        </button>
                      </div>
                    ) : (
                      <div className="text-dark-400 text-sm">Kein Emoji ausgewählt</div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowEmojiPicker('new')}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    <Smile size={18} />
                    Emoji wählen
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                  placeholder={t('players.enter_player_name')}
                  className="flex-1 px-3 py-2 rounded-lg border border-dark-700 bg-dark-800 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <button
                  onClick={handleAddPlayer}
                  className="px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold transition-all"
                >
                  {t('players.add')}
                </button>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName('');
                    setNewPlayerAvatar(undefined);
                  }}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-white text-lg font-semibold">{t('players.loading_players')}</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12">
                <User size={64} className="mx-auto text-dark-600 mb-4" />
                <p className="text-white text-lg font-semibold">{t('players.no_players_yet')}</p>
                <p className="text-sm text-dark-400 mt-2">
                  {t('players.add_first_player')}
                </p>
              </div>
            ) : (
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-dark-900/50 border border-dark-700 rounded-lg hover:border-dark-600 transition-all"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/players/${player.id}`)}
                    title="Zum Profil"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPicker(player.id);
                      }}
                      className="relative group"
                      title="Emoji ändern"
                    >
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="md" />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Smile size={16} className="text-white" />
                      </div>
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
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                          {player.name}
                          {mainPlayerId === player.id && (
                            <span title="Haupt-Profil">
                              <Crown size={18} className="text-amber-400" />
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {t('players.games')}: {player.stats.gamesPlayed} | {t('players.avg')}: {player.stats.averageOverall.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/players/${player.id}`);
                      }}
                      className="p-2 text-primary-400 hover:bg-primary-500/20 rounded-lg transition-colors"
                      title={t('players.view_profile')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Set player as selected and navigate to stats
                        localStorage.setItem('stats_selected_player_id', player.id);
                        navigate('/stats');
                      }}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Statistiken anzeigen"
                    >
                      <BarChart3 size={18} />
                    </button>
                    {mainPlayerId !== player.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMainPlayer(player.id);
                        }}
                        className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                        title="Als Haupt-Profil setzen"
                      >
                        <Crown size={18} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer(player.id);
                        setEditName(player.name);
                        setEditAvatar(player.avatar);
                      }}
                      className="p-2 text-accent-400 hover:bg-accent-500/20 rounded-lg transition-colors"
                      title={t('players.edit_name')}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`${t('players.delete_confirm')} "${player.name}"?`)) {
                          try {
                            await deletePlayer(player.id);
                          } catch (error) {
                            console.error('Failed to delete player:', error);
                            alert('Fehler beim Löschen des Spielers');
                          }
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title={t('players.delete_player')}
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

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(null)}
          currentEmoji={
            showEmojiPicker === 'new'
              ? newPlayerAvatar
              : players.find(p => p.id === showEmojiPicker)?.avatar
          }
        />
      )}
    </div>
  );
};

export default PlayerManagement;