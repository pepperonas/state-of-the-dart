import { describe, it, expect } from 'vitest';
import { isEmoji, getInitial } from '../../utils/avatar';

describe('Avatar Utils', () => {
  describe('isEmoji', () => {
    it('should return true for common emojis', () => {
      expect(isEmoji('🎯')).toBe(true);
      expect(isEmoji('😀')).toBe(true);
      expect(isEmoji('🏆')).toBe(true);
      expect(isEmoji('⭐')).toBe(true);
      expect(isEmoji('🎮')).toBe(true);
      expect(isEmoji('🚀')).toBe(true);
    });

    it('should return true for sports emojis', () => {
      expect(isEmoji('⚽')).toBe(true);
      expect(isEmoji('🏀')).toBe(true);
      expect(isEmoji('🎳')).toBe(true);
    });

    it('should return true for face emojis', () => {
      expect(isEmoji('😊')).toBe(true);
      expect(isEmoji('😎')).toBe(true);
      expect(isEmoji('🥳')).toBe(true);
    });

    it('should return true for animal emojis', () => {
      expect(isEmoji('🐶')).toBe(true);
      expect(isEmoji('🦁')).toBe(true);
      expect(isEmoji('🐱')).toBe(true);
    });

    it('should return false for regular letters', () => {
      expect(isEmoji('A')).toBe(false);
      expect(isEmoji('Z')).toBe(false);
      expect(isEmoji('m')).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isEmoji('1')).toBe(false);
      expect(isEmoji('42')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEmoji('')).toBe(false);
    });

    it('should return false for null/undefined-like values', () => {
      expect(isEmoji('')).toBe(false);
      expect(isEmoji('   ')).toBe(false);
    });

    it('should return false for regular text', () => {
      expect(isEmoji('Hello')).toBe(false);
      expect(isEmoji('Martin')).toBe(false);
    });

    it('should return false for special characters', () => {
      expect(isEmoji('@')).toBe(false);
      expect(isEmoji('#')).toBe(false);
      expect(isEmoji('$')).toBe(false);
    });

    it('should handle emoji with whitespace', () => {
      expect(isEmoji(' 🎯 ')).toBe(true);
      expect(isEmoji('  😀')).toBe(true);
    });
  });

  describe('getInitial', () => {
    it('should return first letter uppercase for normal names', () => {
      expect(getInitial('Martin')).toBe('M');
      expect(getInitial('anna')).toBe('A');
      expect(getInitial('john')).toBe('J');
    });

    it('should handle single character names', () => {
      expect(getInitial('A')).toBe('A');
      expect(getInitial('z')).toBe('Z');
    });

    it('should return "?" for empty string', () => {
      expect(getInitial('')).toBe('?');
    });

    it('should handle names starting with numbers', () => {
      expect(getInitial('123abc')).toBe('1');
    });

    it('should handle names with special characters', () => {
      expect(getInitial('@user')).toBe('@');
    });

    it('should return uppercase for lowercase first letter', () => {
      expect(getInitial('martin')).toBe('M');
      expect(getInitial('test')).toBe('T');
    });

    it('should handle names with spaces', () => {
      expect(getInitial('Martin Pfeffer')).toBe('M');
    });

    it('should handle German umlauts', () => {
      expect(getInitial('Ötzi')).toBe('Ö');
      expect(getInitial('über')).toBe('Ü');
    });
  });
});
