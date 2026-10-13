/** Opens the global keyboard-shortcuts dialog (`ShortcutsDialog`, mounted in App). */
export const SHORTCUTS_EVENT = 'sotd:shortcuts';

export const openShortcuts = (): void => {
  window.dispatchEvent(new Event(SHORTCUTS_EVENT));
};
