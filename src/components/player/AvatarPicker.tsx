import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton, Chip, TextField } from '../common';
import { Icon, iconForEmoji, type IconName } from '../icons';

interface AvatarPickerProps {
  /** Receives the chosen icon name. */
  onSelect: (icon: string) => void;
  onClose: () => void;
  /** Current value — an icon name, or a legacy emoji from an older profile. */
  currentEmoji?: string;
}

/**
 * Picks a player avatar from the app's own icon set.
 *
 * This replaced a ~1900-entry emoji palette. The palette looked like choice, but
 * every pick was drawn by the operating system: the same player showed up as
 * Apple's glossy 3-D art on a phone, Google's flat shapes on a tablet and a
 * monochrome outline on Windows, none of them in the app's colours. A smaller,
 * deliberately curated set that themes correctly is worth more than a large one
 * that cannot.
 *
 * Existing profiles keep working: `currentEmoji` may still hold an emoji, and
 * `iconForEmoji` resolves it to the equivalent glyph for the "currently selected"
 * state.
 */
const GROUPS: { name: string; icons: IconName[] }[] = [
  { name: 'Darts', icons: ['target', 'bullseye', 'board', 'dart', 'dice', 'slot', 'percent', 'hash'] },
  { name: 'Auszeichnungen', icons: ['trophy', 'medal', 'crown', 'ribbon', 'star', 'sparkle', 'gem', 'shield'] },
  { name: 'Energie', icons: ['flame', 'bolt', 'rocket', 'party', 'heart', 'brain', 'wave', 'bulb'] },
  { name: 'Figuren', icons: ['user', 'users', 'robot', 'ghost', 'skull', 'eye', 'moon', 'sun'] },
  { name: 'Sonstiges', icons: ['sprout', 'snow', 'globe', 'flag', 'music', 'gift', 'key', 'book', 'clock', 'calendar', 'home', 'phone', 'search', 'gear', 'scale', 'broom'] },
];

const ALL = GROUPS.flatMap((g) => g.icons);

const AvatarPicker: React.FC<AvatarPickerProps> = ({ onSelect, onClose, currentEmoji }) => {
  const [group, setGroup] = useState(0);
  const [query, setQuery] = useState('');
  const current = currentEmoji ? iconForEmoji(currentEmoji) : undefined;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS[group].icons;
    return ALL.filter((i) => i.toLowerCase().includes(q));
  }, [group, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm m3-scrim-enter p-4">
      <div className="bg-surface-container-high rounded-m3-xl border border-outline-variant shadow-m3-3 w-full max-w-md md:max-w-lg max-h-[80vh] flex flex-col m3-dialog-enter">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h3 className="m3-title-large text-on-surface">Avatar wählen</h3>
          <IconButton label="Schließen" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <div className="p-4 border-b border-outline-variant">
          <TextField
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen…"
            aria-label="Avatar suchen"
          />
        </div>

        {!query && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-outline-variant">
            {GROUPS.map((g, i) => (
              <Chip key={g.name} selected={i === group} onClick={() => setGroup(i)}>
                {g.name}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
            {shown.map((name) => {
              const selected = name === current;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelect(name)}
                  aria-label={name}
                  aria-pressed={selected}
                  className={`aspect-square rounded-m3-md flex items-center justify-center m3-state-layer transition-colors ${
                    selected
                      ? 'bg-primary-container text-on-primary-container ring-2 ring-[var(--m3-primary)]'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon name={name} size={26} />
                </button>
              );
            })}
          </div>
          {shown.length === 0 && (
            <p className="m3-body-medium text-on-surface-variant text-center py-8">Nichts gefunden</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarPicker;
