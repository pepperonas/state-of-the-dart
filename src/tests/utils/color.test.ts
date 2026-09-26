import { describe, it, expect } from 'vitest';
import { luminance, readableTextOn } from '../../utils/color';

describe('readableTextOn', () => {
  it('dark text on light colours, light text on dark ones', () => {
    expect(readableTextOn('#ffeb3b')).toBe('#000000'); // yellow
    expect(readableTextOn('#ffffff')).toBe('#000000');
    expect(readableTextOn('#b71c1c')).toBe('#ffffff'); // dark red
    expect(readableTextOn('#000')).toBe('#ffffff');
  });
  it('falls back to white for anything it cannot parse', () => {
    expect(readableTextOn('rgb(1,2,3)')).toBe('#ffffff');
  });
  it('luminance follows WCAG', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1);
    expect(luminance('#000000')).toBeCloseTo(0);
    expect(luminance('nope')).toBeNull();
  });
});
