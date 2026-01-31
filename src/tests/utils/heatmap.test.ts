import { describe, it, expect } from 'vitest';
import { HeatmapData, Dart } from '../../types/index';

/**
 * Tests for heatmap data generation logic
 * This tests the logic used in GameScreen for generating live heatmap data
 */
describe('Heatmap Data Generation', () => {
  // Helper function that mimics the GameScreen logic
  const generateHeatmapFromDarts = (darts: Dart[]): Record<string, number> => {
    const segments: Record<string, number> = {};
    
    darts.forEach(dart => {
      if (dart.segment > 0 && dart.multiplier > 0) {
        const key = `${dart.multiplier}x${dart.segment}`;
        segments[key] = (segments[key] || 0) + 1;
      }
    });
    
    return segments;
  };

  describe('generateHeatmapFromDarts', () => {
    it('should generate correct segment keys for triple 20', () => {
      const darts: Dart[] = [
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ];
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['3x20']).toBe(3);
    });

    it('should generate correct segment keys for double 16', () => {
      const darts: Dart[] = [
        { segment: 16, multiplier: 2, score: 32 },
      ];
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['2x16']).toBe(1);
    });

    it('should generate correct segment keys for single', () => {
      const darts: Dart[] = [
        { segment: 5, multiplier: 1, score: 5 },
        { segment: 5, multiplier: 1, score: 5 },
      ];
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['1x5']).toBe(2);
    });

    it('should handle mixed darts correctly', () => {
      const darts: Dart[] = [
        { segment: 20, multiplier: 3, score: 60 },  // T20
        { segment: 19, multiplier: 3, score: 57 },  // T19
        { segment: 16, multiplier: 2, score: 32 },  // D16
      ];
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['3x20']).toBe(1);
      expect(segments['3x19']).toBe(1);
      expect(segments['2x16']).toBe(1);
    });

    it('should ignore misses (multiplier 0)', () => {
      const darts: Dart[] = [
        { segment: 0, multiplier: 0, score: 0 },
        { segment: 20, multiplier: 3, score: 60 },
      ];
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['0x0']).toBeUndefined();
      expect(segments['3x20']).toBe(1);
    });

    it('should handle empty darts array', () => {
      const segments = generateHeatmapFromDarts([]);
      expect(Object.keys(segments).length).toBe(0);
    });

    it('should count multiple hits on same segment', () => {
      const darts: Dart[] = Array(10).fill(null).map(() => ({
        segment: 20,
        multiplier: 3,
        score: 60,
      }));
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['3x20']).toBe(10);
    });

    it('should handle bullseye (segment 25 and 50)', () => {
      const darts: Dart[] = [
        { segment: 25, multiplier: 1, score: 25 },  // Outer bull
        { segment: 50, multiplier: 2, score: 50 },  // Bull (inner)
      ];
      
      const segments = generateHeatmapFromDarts(darts);
      expect(segments['1x25']).toBe(1);
      expect(segments['2x50']).toBe(1);
    });
  });

  describe('HeatmapData structure', () => {
    it('should have correct structure', () => {
      const heatmapData: HeatmapData = {
        playerId: 'player-123',
        segments: { '3x20': 50, '2x16': 10 },
        totalDarts: 60,
        lastUpdated: new Date(),
      };

      expect(heatmapData.playerId).toBe('player-123');
      expect(heatmapData.segments['3x20']).toBe(50);
      expect(heatmapData.totalDarts).toBe(60);
      expect(heatmapData.lastUpdated).toBeInstanceOf(Date);
    });

    it('should calculate total darts from segments', () => {
      const segments = { '3x20': 50, '2x16': 10, '1x5': 5 };
      const totalDarts = Object.values(segments).reduce((sum, count) => sum + count, 0);
      
      expect(totalDarts).toBe(65);
    });
  });

  describe('Segment key parsing', () => {
    // Helper to parse segment keys
    const parseSegmentKey = (key: string): { multiplier: number; segment: number } | null => {
      // Support formats: "3x20", "20-3", "20x3"
      let match = key.match(/^(\d)x(\d+)$/);
      if (match) {
        return { multiplier: parseInt(match[1]), segment: parseInt(match[2]) };
      }
      
      match = key.match(/^(\d+)-(\d)$/);
      if (match) {
        return { segment: parseInt(match[1]), multiplier: parseInt(match[2]) };
      }
      
      match = key.match(/^(\d+)x(\d)$/);
      if (match) {
        return { segment: parseInt(match[1]), multiplier: parseInt(match[2]) };
      }
      
      return null;
    };

    it('should parse "3x20" format', () => {
      const result = parseSegmentKey('3x20');
      expect(result).toEqual({ multiplier: 3, segment: 20 });
    });

    it('should parse "20-3" format', () => {
      const result = parseSegmentKey('20-3');
      expect(result).toEqual({ multiplier: 3, segment: 20 });
    });

    it('should parse "20x3" format', () => {
      const result = parseSegmentKey('20x3');
      expect(result).toEqual({ multiplier: 3, segment: 20 });
    });

    it('should return null for invalid format', () => {
      expect(parseSegmentKey('invalid')).toBeNull();
      expect(parseSegmentKey('')).toBeNull();
    });
  });
});
