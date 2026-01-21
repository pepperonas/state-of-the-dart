import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, PlayerStats, PlayerPreferences, HeatmapData, Dart } from '../types/index';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { createEmptyHeatmapData, updateHeatmapData } from '../utils/heatmap';
import { api } from '../services/api';
import logger from '../utils/logger';

interface PlayerContextType {
  players: Player[];
  currentPlayer: Player | null;
  loading: boolean;
  addPlayer: (name: string, avatar?: string, isBot?: boolean, botLevel?: number, customId?: string) => Promise<Player>;
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
  totalCheckoutAttempts: 0,
  totalCheckoutHits: 0,
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
        const loadedPlayers = response.players.map(reviveDates);
        
        // Load all heatmaps in one batch request (much faster!)
        try {
          const heatmapsResponse = await api.players.getHeatmapsBatch();
          const heatmaps = heatmapsResponse.heatmaps;
          // Merge heatmaps with players
          const playersWithHeatmaps = loadedPlayers.map((player: Player) => {
            const heatmapData = heatmaps[player.id];
            
            if (heatmapData && heatmapData.total_darts > 0) {
              return {
                ...player,
                heatmapData: {
                  playerId: player.id,
                  segments: heatmapData.segments,
                  totalDarts: heatmapData.total_darts,
                  lastUpdated: new Date(heatmapData.last_updated || Date.now())
                }
              };
            }
            return player;
          });

          setPlayers(playersWithHeatmaps);
        } catch (error) {
          logger.error('Failed to load heatmaps:', error);
          setPlayers(loadedPlayers);
        }
      } catch (error) {
        logger.error('Failed to load players:', error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [user]);
  
  const addPlayer = async (name: string, avatar?: string, isBot?: boolean, botLevel?: number, customId?: string): Promise<Player> => {
    const newPlayer: Player = {
      id: customId || uuidv4(),
      name,
      avatar: avatar || name.charAt(0).toUpperCase(),
      createdAt: new Date(),
      stats: createDefaultStats(),
      preferences: createDefaultPreferences(),
      isBot,
      botLevel,
    };
    
    try {
      const response = await api.players.create(newPlayer);
      const createdPlayer = reviveDates(response.player);
      setPlayers(prev => [...prev, createdPlayer]);
      return createdPlayer;
    } catch (error) {
      logger.error('Failed to create player:', error);
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
      logger.error('Failed to update player:', error);
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
      logger.error('Failed to delete player:', error);
      throw error;
    }
  };
  
  const getPlayer = (id: string) => {
    return players.find(player => player.id === id);
  };
  
  const getPlayerHeatmap = (playerId: string): HeatmapData => {
    // Heatmap data is loaded via useEffect and stored in player object
    // This function returns from memory, not storage
    const player = players.find(p => p.id === playerId);
    if (player && (player as any).heatmapData) {
      console.log(`🎯 Heatmap for ${player.name}:`, (player as any).heatmapData);
      return (player as any).heatmapData;
    }
    console.log(`⚠️ No heatmap found for player ${playerId}`);
    return createEmptyHeatmapData(playerId);
  };
  
  const updatePlayerHeatmap = async (playerId: string, newDarts: Dart[]) => {
    if (!user) return;

    // Skip heatmap updates for bots (their throws are simulated, not real)
    const player = players.find(p => p.id === playerId);
    if (player?.isBot) {
      return;
    }

    const currentHeatmap = getPlayerHeatmap(playerId);
    const updatedHeatmap = updateHeatmapData(currentHeatmap, newDarts);
    
    // Update in memory immediately
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, heatmapData: updatedHeatmap } : p
    ));
    
    // Sync to API (Database)
    try {
      const apiData = {
        segments: updatedHeatmap.segments,
        total_darts: updatedHeatmap.totalDarts,
        last_updated: updatedHeatmap.lastUpdated.toISOString()
      };
      
      await api.players.updateHeatmap(playerId, apiData);
    } catch (err) {
      logger.error('Failed to sync heatmap:', err);
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