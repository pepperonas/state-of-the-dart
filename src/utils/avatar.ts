/**
 * Avatar Utilities
 * Helper functions for displaying player avatars
 */

/**
 * Check if a string is an emoji
 * Emojis are typically single characters with Unicode ranges:
 * - Basic emojis: U+1F300 - U+1F9FF
 * - Emoticons: U+1F600 - U+1F64F
 * - Symbols: U+2600 - U+26FF
 * - Misc: U+2700 - U+27BF
 */
export const isEmoji = (str: string): boolean => {
  if (!str || str.length === 0) return false;
  
  // Remove whitespace
  const trimmed = str.trim();
  if (trimmed.length === 0) return false;
  
  // Check if it's a single character emoji
  // Modern emojis can be 2-4 code units (surrogate pairs)
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{1F680}-\u{1F6FF}\u{24C2}-\u{1F251}]+$/u;
  
  // Also check for common emoji patterns
  if (emojiRegex.test(trimmed)) return true;
  
  // Check if it's a single emoji character (handles surrogate pairs)
  const codePoint = trimmed.codePointAt(0);
  if (codePoint) {
    // Emoji ranges
    if (
      (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) || // Misc Symbols and Pictographs
      (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
      (codePoint >= 0x2600 && codePoint <= 0x26FF) ||  // Misc Symbols
      (codePoint >= 0x2700 && codePoint <= 0x27BF) ||  // Dingbats
      (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) || // Supplemental Symbols and Pictographs
      (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF) || // Chess Symbols
      (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport and Map Symbols
      (codePoint >= 0x24C2 && codePoint <= 0x1F251)     // Enclosed characters
    ) {
      return true;
    }
  }
  
  return false;
};

/**
 * Get the first letter of a name for avatar display
 */
export const getInitial = (name: string): string => {
  if (!name || name.length === 0) return '?';
  return name.charAt(0).toUpperCase();
};
