import { describe, it, expect } from 'vitest';
import { 
  createAdaptiveBotPlayer, 
  getAdaptiveBotConfigs,
  AdaptiveBotCategory,
  BOT_PRESETS,
  ADAPTIVE_BOT_CONFIGS,
} from '../../utils/botLogic';

describe('Bot Logic', () => {
  describe('BOT_PRESETS', () => {
    it('should have 10 bot presets', () => {
      expect(BOT_PRESETS.length).toBe(10);
    });

    it('should have increasing PPD for higher levels', () => {
      for (let i = 1; i < BOT_PRESETS.length; i++) {
        expect(BOT_PRESETS[i].ppd).toBeGreaterThan(BOT_PRESETS[i - 1].ppd);
      }
    });

    it('should have levels from 1 to 10', () => {
      expect(BOT_PRESETS[0].level).toBe(1);
      expect(BOT_PRESETS[9].level).toBe(10);
    });

    it('each preset should have required properties', () => {
      BOT_PRESETS.forEach(preset => {
        expect(preset.level).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.nameDE).toBeDefined();
        expect(typeof preset.ppd).toBe('number');
        expect(typeof preset.accuracy).toBe('number');
        expect(typeof preset.checkoutAccuracy).toBe('number');
        expect(typeof preset.tripleAccuracy).toBe('number');
      });
    });

    it('all presets should have accuracy values between 0 and 1', () => {
      BOT_PRESETS.forEach(preset => {
        expect(preset.accuracy).toBeGreaterThanOrEqual(0);
        expect(preset.accuracy).toBeLessThanOrEqual(1);
        expect(preset.checkoutAccuracy).toBeGreaterThanOrEqual(0);
        expect(preset.checkoutAccuracy).toBeLessThanOrEqual(1);
        expect(preset.tripleAccuracy).toBeGreaterThanOrEqual(0);
        expect(preset.tripleAccuracy).toBeLessThanOrEqual(1);
      });
    });

    it('higher levels should have higher accuracy', () => {
      const beginnerPreset = BOT_PRESETS.find(p => p.level === 1)!;
      const worldClassPreset = BOT_PRESETS.find(p => p.level === 10)!;
      
      expect(worldClassPreset.accuracy).toBeGreaterThan(beginnerPreset.accuracy);
      expect(worldClassPreset.checkoutAccuracy).toBeGreaterThan(beginnerPreset.checkoutAccuracy);
      expect(worldClassPreset.tripleAccuracy).toBeGreaterThan(beginnerPreset.tripleAccuracy);
    });
  });

  describe('ADAPTIVE_BOT_CONFIGS', () => {
    it('should have 3 adaptive bot categories', () => {
      expect(ADAPTIVE_BOT_CONFIGS.length).toBe(3);
    });

    it('should have all required categories', () => {
      const categories = ADAPTIVE_BOT_CONFIGS.map(c => c.category);
      expect(categories).toContain('beginner');
      expect(categories).toContain('regular');
      expect(categories).toContain('pro');
    });

    it('each config should have required properties', () => {
      ADAPTIVE_BOT_CONFIGS.forEach(config => {
        expect(config.category).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.nameDE).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.descriptionDE).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(typeof config.difficultyOffset).toBe('number');
        expect(typeof config.minLevel).toBe('number');
        expect(typeof config.maxLevel).toBe('number');
      });
    });

    it('beginner should have negative difficulty offset', () => {
      const beginnerConfig = ADAPTIVE_BOT_CONFIGS.find(c => c.category === 'beginner')!;
      expect(beginnerConfig.difficultyOffset).toBeLessThan(0);
    });

    it('pro should have positive difficulty offset', () => {
      const proConfig = ADAPTIVE_BOT_CONFIGS.find(c => c.category === 'pro')!;
      expect(proConfig.difficultyOffset).toBeGreaterThan(0);
    });

    it('regular should have zero difficulty offset', () => {
      const regularConfig = ADAPTIVE_BOT_CONFIGS.find(c => c.category === 'regular')!;
      expect(regularConfig.difficultyOffset).toBe(0);
    });
  });

  describe('getAdaptiveBotConfigs', () => {
    it('should return adaptive bot configurations', () => {
      const configs = getAdaptiveBotConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs).toEqual(ADAPTIVE_BOT_CONFIGS);
    });
  });

  describe('createAdaptiveBotPlayer', () => {
    // Mock player stats for testing
    const mockPlayerStats = {
      gamesPlayed: 10,
      gamesWon: 5,
      totalLegsPlayed: 30,
      totalLegsWon: 15,
      highestCheckout: 120,
      total180s: 5,
      total171Plus: 10,
      total140Plus: 30,
      total100Plus: 50,
      total60Plus: 80,
      bestAverage: 60,
      averageOverall: 45,
      checkoutPercentage: 30,
      totalCheckoutAttempts: 100,
      totalCheckoutHits: 30,
      checkoutsByDouble: {},
      scoreDistribution: {},
      bestLeg: 15,
      nineDartFinishes: 0,
    };

    it('should create a bot player with isBot flag', () => {
      const botPlayer = createAdaptiveBotPlayer('beginner', mockPlayerStats);
      expect(botPlayer.isBot).toBe(true);
    });

    it('should create bot player with stats initialized to zero', () => {
      const botPlayer = createAdaptiveBotPlayer('regular', mockPlayerStats);
      
      expect(botPlayer.stats.gamesPlayed).toBe(0);
      expect(botPlayer.stats.gamesWon).toBe(0);
      expect(botPlayer.stats.total180s).toBe(0);
    });

    it('should create unique IDs for different bot instances', () => {
      const bot1 = createAdaptiveBotPlayer('beginner', mockPlayerStats, 0);
      const bot2 = createAdaptiveBotPlayer('beginner', mockPlayerStats, 1);
      
      expect(bot1.id).not.toBe(bot2.id);
    });

    it('should have a valid bot level', () => {
      const botPlayer = createAdaptiveBotPlayer('pro', mockPlayerStats);
      
      expect(botPlayer.botLevel).toBeDefined();
      expect(botPlayer.botLevel).toBeGreaterThanOrEqual(1);
      expect(botPlayer.botLevel).toBeLessThanOrEqual(10);
    });

    it('beginner bot should have lower level than pro bot', () => {
      const beginnerBot = createAdaptiveBotPlayer('beginner', mockPlayerStats);
      const proBot = createAdaptiveBotPlayer('pro', mockPlayerStats);
      
      expect(proBot.botLevel!).toBeGreaterThan(beginnerBot.botLevel!);
    });
  });

  describe('Bot categories type', () => {
    const validCategories: AdaptiveBotCategory[] = [
      'beginner',
      'regular',
      'pro',
    ];

    it('should have exactly 3 categories', () => {
      expect(validCategories.length).toBe(3);
    });

    it('each category should have one config', () => {
      validCategories.forEach(category => {
        const categoryConfigs = ADAPTIVE_BOT_CONFIGS.filter(c => c.category === category);
        expect(categoryConfigs.length).toBe(1);
      });
    });
  });

  describe('Bot PPD ranges', () => {
    it('beginner level (1) should have PPD of 20', () => {
      const beginnerPreset = BOT_PRESETS.find(p => p.level === 1)!;
      expect(beginnerPreset.ppd).toBe(20);
    });

    it('world class level (10) should have PPD of 120', () => {
      const worldClassPreset = BOT_PRESETS.find(p => p.level === 10)!;
      expect(worldClassPreset.ppd).toBe(120);
    });

    it('PPD should range from 20 to 120 across all levels', () => {
      const ppds = BOT_PRESETS.map(p => p.ppd);
      expect(Math.min(...ppds)).toBe(20);
      expect(Math.max(...ppds)).toBe(120);
    });
  });
});
