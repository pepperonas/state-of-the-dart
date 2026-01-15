import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, PlayerStats, PlayerPreferences, HeatmapData, Dart } from '../types/index';
import { useTenant } from './TenantContext';
import { createEmptyHeatmapData, updateHeatmapData } from '../utils/heatmap';

interface PlayerContextType {
  players: Player[];
  currentPlayer: Player | null;
  addPlayer: (name: string, avatar?: string) => Player;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
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
  
  const [players, setPlayers] = useState<Player[]>(() => {
    if (!storage) return [];
    const saved = storage.get<any[]>('players', []);
    return saved.map(reviveDates);
  });
  
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(() => {
    if (!storage) return null;
    const saved = storage.get<any>('currentPlayer', null);
    return saved ? reviveDates(saved) : null;
  });
  
  // Reload players when tenant changes
  useEffect(() => {
    if (storage) {
      const saved = storage.get<any[]>('players', []);
      setPlayers(saved.map(reviveDates));
      
      const savedCurrent = storage.get<any>('currentPlayer', null);
      setCurrentPlayer(savedCurrent ? reviveDates(savedCurrent) : null);
    } else {
      setPlayers([]);
      setCurrentPlayer(null);
    }
  }, [storage]);
  
  useEffect(() => {
    if (storage) {
      storage.set('players', players);
    }
  }, [players, storage]);
  
  useEffect(() => {
    if (storage) {
      if (currentPlayer) {
        storage.set('currentPlayer', currentPlayer);
      } else {
        storage.remove('currentPlayer');
      }
    }
  }, [currentPlayer, storage]);
  
  const addPlayer = (name: string, avatar?: string): Player => {
    const newPlayer: Player = {
      id: uuidv4(),
      name,
      avatar: avatar || name.charAt(0).toUpperCase(),
      createdAt: new Date(),
      stats: createDefaultStats(),
      preferences: createDefaultPreferences(),
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    return newPlayer;
  };
  
  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(player => 
      player.id === id ? { ...player, ...updates } : player
    ));
    
    if (currentPlayer?.id === id) {
      setCurrentPlayer({ ...currentPlayer, ...updates });
    }
  };
  
  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(player => player.id !== id));
    
    if (currentPlayer?.id === id) {
      setCurrentPlayer(null);
    }
  };
  
  const getPlayer = (id: string) => {
    return players.find(player => player.id === id);
  };
  
  const getPlayerHeatmap = (playerId: string): HeatmapData => {
    if (!storage) return createEmptyHeatmapData(playerId);
    
    const key = `heatmap-${playerId}`;
    const saved = storage.get<any>(key, null);
    
    if (saved) {
      // Revive Date objects
      return {
        ...saved,
        lastUpdated: new Date(saved.lastUpdated)
      };
    }
    
    return createEmptyHeatmapData(playerId);
  };
  
  const updatePlayerHeatmap = (playerId: string, newDarts: Dart[]) => {
    if (!storage) return;
    
    const currentHeatmap = getPlayerHeatmap(playerId);
    const updatedHeatmap = updateHeatmapData(currentHeatmap, newDarts);
    
    const key = `heatmap-${playerId}`;
    storage.set(key, updatedHeatmap);
  };
  
  return (
    <PlayerContext.Provider value={{
      players,
      currentPlayer,
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