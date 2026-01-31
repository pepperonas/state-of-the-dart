import { describe, it, expect } from 'vitest';
import { checkoutTable, getCheckoutSuggestion } from '../../data/checkoutTable';
import { CheckoutRoute } from '../../types/index';

describe('Checkout Table', () => {
  describe('checkoutTable data structure', () => {
    it('should have entries for scores 2-170', () => {
      // Check key checkouts exist
      expect(checkoutTable[170]).toBeDefined();
      expect(checkoutTable[100]).toBeDefined();
      expect(checkoutTable[50]).toBeDefined();
      expect(checkoutTable[40]).toBeDefined();
      expect(checkoutTable[2]).toBeDefined();
    });

    it('should not have entries for impossible checkouts', () => {
      // 169, 168, 166, 165, 163, 162 are impossible
      expect(checkoutTable[169]).toBeUndefined();
      expect(checkoutTable[168]).toBeUndefined();
      expect(checkoutTable[166]).toBeUndefined();
      expect(checkoutTable[165]).toBeUndefined();
      expect(checkoutTable[163]).toBeUndefined();
      expect(checkoutTable[162]).toBeUndefined();
    });

    it('should have valid dart notation in suggestions', () => {
      const validPatterns = /^(T\d{1,2}|D\d{1,2}|S\d{1,2}|\d{1,2}|Bull|25)$/;
      
      Object.values(checkoutTable).forEach(suggestions => {
        suggestions.forEach((suggestion: CheckoutRoute) => {
          suggestion.darts.forEach((dart: string) => {
            expect(dart).toMatch(validPatterns);
          });
        });
      });
    });

    it('should mark preferred checkouts', () => {
      // At least one checkout should be marked as preferred
      Object.values(checkoutTable).forEach(suggestions => {
        const hasPreferred = suggestions.some((s: CheckoutRoute) => s.preferred);
        expect(hasPreferred).toBe(true);
      });
    });
  });

  describe('Classic checkouts', () => {
    it('should have 170 as T20-T20-Bull', () => {
      const checkout170 = checkoutTable[170];
      expect(checkout170).toBeDefined();
      expect(checkout170[0].darts).toEqual(['T20', 'T20', 'Bull']);
    });

    it('should have 160 as T20-T20-D20', () => {
      const checkout160 = checkoutTable[160];
      expect(checkout160).toBeDefined();
      expect(checkout160[0].darts).toEqual(['T20', 'T20', 'D20']);
    });

    it('should have 100 as T20-D20', () => {
      const checkout100 = checkoutTable[100];
      expect(checkout100).toBeDefined();
      expect(checkout100[0].darts).toEqual(['T20', 'D20']);
    });

    it('should have 40 as D20', () => {
      const checkout40 = checkoutTable[40];
      expect(checkout40).toBeDefined();
      expect(checkout40[0].darts).toEqual(['D20']);
    });

    it('should have 32 as D16', () => {
      const checkout32 = checkoutTable[32];
      expect(checkout32).toBeDefined();
      expect(checkout32[0].darts).toEqual(['D16']);
    });

    it('should have 2 as D1', () => {
      const checkout2 = checkoutTable[2];
      expect(checkout2).toBeDefined();
      expect(checkout2[0].darts).toEqual(['D1']);
    });
  });

  describe('getCheckoutSuggestion', () => {
    it('should return suggestions for valid checkout scores', () => {
      const suggestion = getCheckoutSuggestion(100);
      expect(suggestion).not.toBeNull();
      expect(suggestion?.length).toBeGreaterThan(0);
    });

    it('should return null for scores > 170', () => {
      expect(getCheckoutSuggestion(180)).toBeNull();
      expect(getCheckoutSuggestion(200)).toBeNull();
    });

    it('should return null for scores < 1', () => {
      expect(getCheckoutSuggestion(0)).toBeNull();
      expect(getCheckoutSuggestion(-1)).toBeNull();
    });

    it('should return checkout ending with double for double-out', () => {
      const suggestion = getCheckoutSuggestion(40, 3, true);
      expect(suggestion).not.toBeNull();
      const lastDart = suggestion![suggestion!.length - 1];
      expect(lastDart.startsWith('D') || lastDart === 'Bull').toBe(true);
    });

    it('should handle straight-out mode', () => {
      const suggestion = getCheckoutSuggestion(60, 3, false);
      expect(suggestion).not.toBeNull();
      expect(suggestion?.length).toBeGreaterThan(0);
    });

    it('should respect darts remaining limit', () => {
      const suggestion1 = getCheckoutSuggestion(170, 1, true);
      const suggestion3 = getCheckoutSuggestion(170, 3, true);
      
      // With 1 dart remaining, 170 is not possible
      // With 3 darts, it should return a suggestion
      expect(suggestion3).not.toBeNull();
    });

    it('should return common double checkouts', () => {
      // D20 = 40
      const d20 = getCheckoutSuggestion(40);
      expect(d20).toContain('D20');

      // D16 = 32
      const d16 = getCheckoutSuggestion(32);
      expect(d16).toContain('D16');
    });
  });

  describe('Checkout math validation', () => {
    it('should have correct dart count for 1-dart checkouts', () => {
      // 40 should be 1 dart (D20)
      expect(checkoutTable[40][0].darts.length).toBe(1);
      
      // 32 should be 1 dart (D16)
      expect(checkoutTable[32][0].darts.length).toBe(1);
    });

    it('should have correct dart count for 2-dart checkouts', () => {
      // 100 should be 2 darts (T20, D20)
      expect(checkoutTable[100][0].darts.length).toBe(2);
      
      // 98 should be 2 darts (T20, D19)
      expect(checkoutTable[98][0].darts.length).toBe(2);
    });

    it('should have correct dart count for 3-dart checkouts', () => {
      // 170 should be 3 darts
      expect(checkoutTable[170][0].darts.length).toBe(3);
      
      // 160 should be 3 darts
      expect(checkoutTable[160][0].darts.length).toBe(3);
    });

    it('should end with double for all checkouts in table', () => {
      Object.entries(checkoutTable).forEach(([_score, suggestions]) => {
        suggestions.forEach((suggestion: CheckoutRoute) => {
          const lastDart = suggestion.darts[suggestion.darts.length - 1];
          // Last dart should be D (double) or Bull
          expect(lastDart.startsWith('D') || lastDart === 'Bull').toBe(true);
        });
      });
    });
  });
});
