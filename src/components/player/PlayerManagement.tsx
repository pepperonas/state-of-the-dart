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
import LoadingIndicator from '../common/LoadingIndicator';
import { useFeedback } from '../common/feedbackContext';

const PlayerManagement: React.FC = () => {
  const { notify, confirm } = useFeedback();
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
        notify(t('players.error_create'));
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
        notify(t('players.error_update'));
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
      notify(t('players.error_avatar'));
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
      notify(t('players.error_main'));
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
                  {t('player_management.avatar_label')}
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
                          {t('player_management.remove')}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-on-surface-variant m3-body-medium">{t('player_management.no_avatar')}</div>
                    )}
                  </div>
                  <Button
                    variant="tonal"
                    icon={<Smile size={18} />}
                    onClick={() => setShowEmojiPicker('new')}
                  >
                    {t('player_management.choose_avatar')}
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
                <LoadingIndicator size={56} className="mb-4" />
                <p className="text-on-surface m3-title-medium">{t('players.loading_players')}</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <User size={64} className="mx-auto text-on-surface-variant mb-4" />
                <p className="text-on-surface m3-title-medium">
                  {searchQuery ? t('player_management.no_results') : t('players.no_players_yet')}
                </p>
                <p className="m3-body-medium text-on-surface-variant mt-2">
                  {searchQuery
                    ? t('player_management.no_results_for', { query: searchQuery })
                    : t('players.add_first_player')
                  }
                </p>
              </div>
            ) : (
              paginatedPlayers.map((player, index) => (
                <motion.div key={player.id} {...staggerChild(Math.min(index, 10))}>
                <Card
                  variant="filled"
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(player.id)}
                      className="relative group rounded-full"
                      title={t('player_management.change_avatar')}
                      aria-label={t('player_management.change_avatar')}
                    >
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="md" />
                      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--m3-scrim)_50%,transparent)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Smile size={16} className="text-on-surface" />
                      </div>
                    </button>
                    {editingPlayer === player.id ? (
                      <TextField
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEditPlayer(player.id);
                        }}
                        onBlur={() => handleEditPlayer(player.id)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/players/${player.id}`)}
                        title={t('player_management.to_profile')}
                        className="flex-1 min-w-0 text-left rounded-m3-sm"
                      >
                        <h3 className="m3-title-medium text-on-surface flex items-center gap-2">
                          <span className="truncate">{player.name}</span>
                          {mainPlayerId === player.id && (
                            <span title={t('player_management.main_profile')}>
                              <Crown size={18} className="text-tertiary" />
                            </span>
                          )}
                        </h3>
                        <p className="m3-body-medium text-on-surface-variant">
                          {t('player_management.stats_line', { games: player.stats.gamesPlayed, avg: player.stats.averageOverall.toFixed(2) })}
                        </p>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end gap-1 sm:gap-2 self-end sm:self-auto">
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
                      label={t('player_management.show_stats')}
                      className="text-success"
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
                        label={t('player_management.set_main_profile')}
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
                        if (await confirm({ title: t('player_management.delete_confirm', { name: player.name }), danger: true, confirmLabel: t('common.delete') })) {
                          try {
                            await deletePlayer(player.id);
                          } catch (error) {
                            console.error('Failed to delete player:', error);
                            notify(t('players.error_delete'));
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