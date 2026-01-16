import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, PlayerStats, PlayerPreferences, HeatmapData, Dart } from '../types/index';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { createEmptyHeatmapData, updateHeatmapData } from '../utils/heatmap';
import { api } from '../services/api';

interface PlayerContextType {
  players: Player[];
  currentPlayer: Player | null;
  loading: boolean;
  addPlayer: (name: string, avatar?: string) => Promise<Player>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  setCurrentPlayer: (player: Player | null) => void;
  getPlayer: (id: string) => Player | undefined;
  getPlayerHeatmap: (playerId: string) => HeatmapData;
  updatePlayerHeatmap: (playerId: string, newDarts: Dart[]) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const createDefaultStats = (): PlayerStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  totalLegsPlayed: 0,
  totalLegsWon: 0,
  highestCheckout: 0,
  total180s: 0,
  total171Plus: 0,
  total140Plus: 0,
  total100Plus: 0,
  total60Plus: 0,
  bestAverage: 0,
  averageOverall: 0,
  checkoutPercentage: 0,
  checkoutsByDouble: {},
  scoreDistribution: {},
  bestLeg: 999,
  nineDartFinishes: 0,
});

const createDefaultPreferences = (): PlayerPreferences => ({
  preferredCheckouts: {},
  soundEnabled: true,
  callerLanguage: 'en',
  callerVoice: 'male',
  vibrationEnabled: true,
});

const reviveDates = (player: Player): Player => {
  return {
    ...player,
    createdAt: player.createdAt ? new Date(player.createdAt) : new Date(),
  };
};

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { storage } = useTenant();
  const { user } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load players from API when user is authenticated
  useEffect(() => {
    const loadPlayers = async () => {
      if (!user) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.players.getAll();
        console.log('🔍 PlayerContext: API Response:', response);
        console.log('🔍 PlayerContext: Players count:', response.players?.length);
        if (response.players?.[0]) {
          console.log('🔍 PlayerContext: First player:', response.players[0]);
          console.log('🔍 PlayerContext: First player stats:', response.players[0].stats);
        }
        const loadedPlayers = response.players.map(reviveDates);
        console.log('🔍 PlayerContext: Loaded players:', loadedPlayers);
        setPlayers(loadedPlayers);
        
        // Load heatmap data for each player and cache in localStorage
        if (storage) {
          for (const player of loadedPlayers) {
            try {
              const heatmapResponse = await api.players.getHeatmap(player.id);
              console.log(`🗺️ Loaded heatmap for ${player.name}:`, heatmapResponse);
              
              if (heatmapResponse && heatmapResponse.total_darts > 0) {
                // Store in localStorage for offline access
                const heatmapData = {
                  playerId: player.id,
                  segments: heatmapResponse.segments,
                  totalDarts: heatmapResponse.total_darts,
                  lastUpdated: new Date(heatmapResponse.last_updated || Date.now())
                };
                storage.set(`heatmap-${player.id}`, heatmapData);
              }
            } catch (error) {
              console.error(`❌ Failed to load heatmap for ${player.name}:`, error);
            }
          }
        }
        
        // Restore current player from localStorage (UI state only)
        if (storage) {
          const savedCurrentId = storage.get<string>('currentPlayerId', '');
          const current = loadedPlayers.find((p: Player) => p.id === savedCurrentId);
          setCurrentPlayer(current || null);
        }
      } catch (error) {
        console.error('❌ Failed to load players:', error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [user, storage]);
  
  // Save current player ID to localStorage (UI state only)
  useEffect(() => {
    if (storage) {
      if (currentPlayer) {
        storage.set('currentPlayerId', currentPlayer.id);
      } else {
        storage.remove('currentPlayerId');
      }
    }
  }, [currentPlayer, storage]);
  
  const addPlayer = async (name: string, avatar?: string): Promise<Player> => {
    const newPlayer: Player = {
      id: uuidv4(),
      name,
      avatar: avatar || name.charAt(0).toUpperCase(),
      createdAt: new Date(),
      stats: createDefaultStats(),
      preferences: createDefaultPreferences(),
    };
    
    try {
      const response = await api.players.create(newPlayer);
      const createdPlayer = reviveDates(response.player);
      setPlayers(prev => [...prev, createdPlayer]);
      return createdPlayer;
    } catch (error) {
      console.error('Failed to create player:', error);
      throw error;
    }
  };
  
  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    try {
      await api.players.update(id, updates);
      
      setPlayers(prev => prev.map(player => 
        player.id === id ? { ...player, ...updates } : player
      ));
      
      if (currentPlayer?.id === id) {
        setCurrentPlayer({ ...currentPlayer, ...updates });
      }
    } catch (error) {
      console.error('Failed to update player:', error);
      throw error;
    }
  };
  
  const deletePlayer = async (id: string) => {
    try {
      await api.players.delete(id);
      
      setPlayers(prev => prev.filter(player => player.id !== id));
      
      if (currentPlayer?.id === id) {
        setCurrentPlayer(null);
      }
    } catch (error) {
      console.error('Failed to delete player:', error);
      throw error;
    }
  };
  
  const getPlayer = (id: string) => {
    return players.find(player => player.id === id);
  };
  
  const getPlayerHeatmap = (playerId: string): HeatmapData => {
    if (!storage) return createEmptyHeatmapData(playerId);
    
    // Try to load from localStorage first (for offline support)
    const key = `heatmap-${playerId}`;
    const saved = storage.get<any>(key, null);
    
    if (saved) {
      // Revive Date objects
      return {
        ...saved,
        lastUpdated: new Date(saved.lastUpdated)
      };
    }
    
    // Fallback: try to load from API (will be handled by separate useEffect)
    return createEmptyHeatmapData(playerId);
  };
  
  const updatePlayerHeatmap = (playerId: string, newDarts: Dart[]) => {
    if (!storage) return;
    
    const currentHeatmap = getPlayerHeatmap(playerId);
    const updatedHeatmap = updateHeatmapData(currentHeatmap, newDarts);
    
    const key = `heatmap-${playerId}`;
    storage.set(key, updatedHeatmap);
    
    // Sync to API in background
    if (user) {
      const apiData = {
        segments: updatedHeatmap.segments,
        total_darts: updatedHeatmap.totalDarts,
        last_updated: updatedHeatmap.lastUpdated.toISOString()
      };
      
      api.players.updateHeatmap(playerId, apiData)
        .then(() => console.log('✅ Heatmap synced to API'))
        .catch(err => console.error('❌ Failed to sync heatmap to API:', err));
    }
  };
  
  return (
    <PlayerContext.Provider value={{
      players,
      currentPlayer,
      loading,
      addPlayer,
      updatePlayer,
      deletePlayer,
      setCurrentPlayer,
      getPlayer,
      getPlayerHeatmap,
      updatePlayerHeatmap,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};