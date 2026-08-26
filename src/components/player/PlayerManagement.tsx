import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, User, Eye, Crown, BarChart3, Smile, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { api } from '../../services/api';
import PlayerAvatar from './PlayerAvatar';
import AvatarPicker from './AvatarPicker';
import { BackButton, Button, TextField, Card, IconButton, PageShell } from '../common';
import { staggerChild } from '../../utils/motion';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(player => 
      player.name.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  return (
    <PageShell
      width="md"
      back={false}
    >
        <BackButton onClick={() => navigate('/')} />
        
        <Card variant="elevated" className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="m3-headline-medium text-on-surface">{t('players.title')}</h1>
            <Button
              variant="filled"
              icon={<Plus size={20} />}
              onClick={() => setShowAddPlayer(true)}
            >
              {t('players.add_player')}
            </Button>
          </div>
          
          {showAddPlayer && (
            <Card variant="filled" className="mb-6 p-4">
              <div className="mb-4">
                <label className="block m3-label-large text-on-surface mb-2">
                  Emoji auswählen (optional - lässt den Anfangsbuchstaben ersetzen)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {newPlayerAvatar ? (
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{newPlayerAvatar}</div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setNewPlayerAvatar(undefined)}
                        >
                          Entfernen
                        </Button>
                      </div>
                    ) : (
                      <div className="text-on-surface-variant m3-body-medium">Kein Emoji ausgewählt</div>
                    )}
                  </div>
                  <Button
                    variant="tonal"
                    icon={<Smile size={18} />}
                    onClick={() => setShowEmojiPicker('new')}
                  >
                    Emoji wählen
                  </Button>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <TextField
                  className="flex-1"
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                  placeholder={t('players.enter_player_name')}
                  autoFocus
                />
                <Button variant="filled" onClick={handleAddPlayer}>
                  {t('players.add')}
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName('');
                    setNewPlayerAvatar(undefined);
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </Card>
          )}
          
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-on-surface m3-title-medium">{t('players.loading_players')}</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <User size={64} className="mx-auto text-on-surface-variant mb-4" />
                <p className="text-on-surface m3-title-medium">
                  {searchQuery ? 'Keine Spieler gefunden' : t('players.no_players_yet')}
                </p>
                <p className="m3-body-medium text-on-surface-variant mt-2">
                  {searchQuery
                    ? `Keine Spieler gefunden für "${searchQuery}"`
                    : t('players.add_first_player')
                  }
                </p>
              </div>
            ) : (
              paginatedPlayers.map((player, index) => (
                <motion.div key={player.id} {...staggerChild(Math.min(index, 10))}>
                <Card
                  variant="filled"
                  className="flex items-center justify-between p-4"
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
                        <Smile size={16} className="text-on-surface" />
                      </div>
                    </div>
                    {editingPlayer === player.id ? (
                      <TextField
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEditPlayer(player.id);
                        }}
                        onBlur={() => handleEditPlayer(player.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 className="m3-title-medium text-on-surface flex items-center gap-2">
                          <span className="truncate">{player.name}</span>
                          {mainPlayerId === player.id && (
                            <span title="Haupt-Profil">
                              <Crown size={18} className="text-tertiary" />
                            </span>
                          )}
                        </h3>
                        <p className="m3-body-medium text-on-surface-variant">
                          {t('players.games')}: {player.stats.gamesPlayed} | {t('players.avg')}: {player.stats.averageOverall.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    <IconButton
                      label={t('players.view_profile')}
                      className="text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/players/${player.id}`);
                      }}
                    >
                      <Eye size={18} />
                    </IconButton>
                    <IconButton
                      label="Statistiken anzeigen"
                      className="text-success-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Set player as selected and navigate to stats
                        localStorage.setItem('stats_selected_player_id', player.id);
                        navigate('/stats');
                      }}
                    >
                      <BarChart3 size={18} />
                    </IconButton>
                    {mainPlayerId !== player.id && (
                      <IconButton
                        label="Als Haupt-Profil setzen"
                        className="text-tertiary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMainPlayer(player.id);
                        }}
                      >
                        <Crown size={18} />
                      </IconButton>
                    )}
                    <IconButton
                      label={t('players.edit_name')}
                      className="text-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer(player.id);
                        setEditName(player.name);
                        setEditAvatar(player.avatar);
                      }}
                    >
                      <Edit2 size={18} />
                    </IconButton>
                    <IconButton
                      label={t('players.delete_player')}
                      className="text-error"
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
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                </Card>
                </motion.div>
              ))
            )}
          </div>
        </Card>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <AvatarPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(null)}
          currentEmoji={
            showEmojiPicker === 'new'
              ? newPlayerAvatar
              : players.find(p => p.id === showEmojiPicker)?.avatar
          }
        />
      )}
        </PageShell>
  );
};

export default PlayerManagement;