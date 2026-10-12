import { useTranslation } from 'react-i18next';
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton, Chip, TextField, SegmentedButton } from '../common';
import {
  Icon, iconForEmoji, type IconName, AvatarGlyph, GAME_ICON_GROUPS, GAME_ICON_AUTHOR_NAMES,
  GAME_ICON_PREFIX, isGameIcon, useAvatarPaths,
  EMOJI_PREFIX, EMOJI_FONT, EMOJI_GROUP_KEYS, isEmojiAvatar, emojiOf, useEmojiData, type EmojiRow,
} from '../icons';

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
 *
 * Since 0.33.0 the picker also offers 165 glyphs from game-icons.net (CC BY 3.0,
 * credited at the bottom), stored as `gi:<name>`. They are single-colour like
 * the app's own set, so they follow the theme too; their path data is a lazy
 * chunk, loaded when the picker opens or such an avatar is drawn.
 *
 * Since 0.35.0 the picker offers every Unicode emoji as well (tab "Emojis",
 * nine groups, five skin tones), stored as `em:<emoji>` — the player asked
 * for exactly that picture, so it is drawn by the system's emoji font. The
 * catalogue with German and English names is a lazy chunk too.
 */
const OWN_GROUPS: { key: string; icons: IconName[] }[] = [
  { key: 'darts', icons: ['target', 'bullseye', 'board', 'dart', 'dice', 'slot', 'percent', 'hash'] },
  { key: 'awards', icons: ['trophy', 'medal', 'crown', 'ribbon', 'star', 'sparkle', 'gem', 'shield'] },
  { key: 'energy', icons: ['flame', 'bolt', 'rocket', 'party', 'heart', 'brain', 'wave', 'bulb'] },
  { key: 'figures', icons: ['user', 'users', 'robot', 'ghost', 'skull', 'eye', 'moon', 'sun'] },
  { key: 'other', icons: ['sprout', 'snow', 'globe', 'flag', 'music', 'gift', 'key', 'book', 'clock', 'calendar', 'home', 'phone', 'search', 'gear', 'scale', 'broom'] },
];

interface PickerGroup { key: string; values: string[] }

/** Darts first, then the game-icons.net groups, then the rest of the app's own set. */
const GROUPS: PickerGroup[] = [
  { key: OWN_GROUPS[0].key, values: OWN_GROUPS[0].icons },
  ...GAME_ICON_GROUPS.map(g => ({ key: g.key, values: g.names.map(n => GAME_ICON_PREFIX + n) })),
  ...OWN_GROUPS.slice(1).map(g => ({ key: g.key, values: g.icons as string[] })),
];
const ALL = GROUPS.flatMap((g) => g.values);

/** Neutral plus the five Fitzpatrick tones, shown as a raised hand. */
const SKIN_SWATCHES = ['\u270B', '\u270B\u{1F3FB}', '\u270B\u{1F3FC}', '\u270B\u{1F3FD}', '\u270B\u{1F3FE}', '\u270B\u{1F3FF}'];

const AvatarPicker: React.FC<AvatarPickerProps> = ({ onSelect, onClose, currentEmoji }) => {
  const { t, i18n } = useTranslation();
  const startsOnEmoji = isEmojiAvatar(currentEmoji);
  const [tab, setTab] = useState<'icons' | 'emoji'>(startsOnEmoji ? 'emoji' : 'icons');
  const [group, setGroup] = useState(0);
  const [emojiGroup, setEmojiGroup] = useState(0);
  const [tone, setTone] = useState(0);
  const [query, setQuery] = useState('');
  const current = currentEmoji
    ? (isGameIcon(currentEmoji) || isEmojiAvatar(currentEmoji) ? currentEmoji : iconForEmoji(currentEmoji))
    : undefined;
  // Start loading both lazy catalogues as soon as the picker opens.
  useAvatarPaths(true);
  const emojiRows = useEmojiData(true);

  /** The emoji a row stands for, in the chosen skin tone where it has one. */
  const emojiValue = (r: EmojiRow) => EMOJI_PREFIX + (tone > 0 && r[5] ? r[5][tone - 1] : r[0]);
  const emojiLabel = (r: EmojiRow) => (i18n.language.startsWith('de') ? r[2] : r[3]);

  const shownEmoji = useMemo(() => {
    if (!emojiRows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return tab === 'emoji' ? emojiRows.filter(r => r[1] === emojiGroup) : [];
    return emojiRows.filter(r => r[2].toLowerCase().includes(q) || r[3].toLowerCase().includes(q) || r[4].includes(q));
  }, [emojiRows, query, tab, emojiGroup]);

  /** The name shown and searched: a translated label for game icons, the icon name otherwise. */
  const labelOf = (value: string) =>
    isGameIcon(value) ? t(`avatar_picker.gi.${value.slice(GAME_ICON_PREFIX.length)}`) : value;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tab === 'icons' ? GROUPS[group].values : [];
    return ALL.filter((v) => labelOf(v).toLowerCase().includes(q) || v.toLowerCase().includes(q));
    // labelOf only depends on t, which changes with the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, query, t, tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--m3-scrim)_60%,transparent)] backdrop-blur-sm m3-scrim-enter p-4" onClick={onClose} data-backdrop>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className="bg-surface-container-high rounded-m3-xl border border-outline-variant shadow-m3-3 w-full max-w-md md:max-w-lg max-h-[80vh] flex flex-col m3-dialog-enter"
      >
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-outline-variant">
          <h3 id="avatar-picker-title" className="m3-title-large text-on-surface">{t('players.choose_avatar')}</h3>
          <IconButton label={t('common.close')} onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <div className="shrink-0 p-4 border-b border-outline-variant">
          <TextField
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search')}
            aria-label={t('players.search_avatar')}
            autoFocus
          />
        </div>

        {!query && (
          <div className="shrink-0 px-4 pt-3">
            <SegmentedButton
              value={tab}
              onChange={setTab}
              label={t('avatar_picker.kind')}
              options={[
                { value: 'icons', label: t('avatar_picker.tab_icons') },
                { value: 'emoji', label: t('avatar_picker.tab_emoji') },
              ]}
            />
          </div>
        )}
        {!query && tab === 'icons' && (
          <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-b border-outline-variant">
            {GROUPS.map((g, i) => (
              <Chip key={g.key} selected={i === group} onClick={() => setGroup(i)} className="shrink-0 whitespace-nowrap">
                {t(`avatar_picker.group_${g.key}`)}
              </Chip>
            ))}
          </div>
        )}
        {!query && tab === 'emoji' && (
          <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-b border-outline-variant">
            {EMOJI_GROUP_KEYS.map((key, i) => (
              <Chip key={key} selected={i === emojiGroup} onClick={() => setEmojiGroup(i)} className="shrink-0 whitespace-nowrap">
                {t(`avatar_picker.emoji_group_${key}`)}
              </Chip>
            ))}
          </div>
        )}
        {(tab === 'emoji' || query) && (
          <div role="radiogroup" aria-label={t('avatar_picker.skin_tone')} className="shrink-0 flex items-center gap-2 overflow-x-auto px-4 py-2 border-b border-outline-variant">
            <span className="m3-label-medium text-on-surface-variant mr-1">{t('avatar_picker.skin_tone')}</span>
            {SKIN_SWATCHES.map((hand, i) => (
              <button
                key={hand}
                type="button"
                role="radio"
                aria-checked={tone === i}
                aria-label={t(`avatar_picker.tone_${i}`)}
                title={t(`avatar_picker.tone_${i}`)}
                onClick={() => setTone(i)}
                className={`shrink-0 w-9 h-9 rounded-m3-full flex items-center justify-center m3-state-layer ${tone === i ? 'bg-primary-container ring-2 ring-[var(--m3-primary)]' : 'bg-surface-container'}`}
                style={{ fontFamily: EMOJI_FONT, fontSize: 20 }}
              >
                {hand}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2" data-testid="icon-grid">
            {shown.map((name) => {
              const selected = name === current;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelect(name)}
                  aria-label={labelOf(name)}
                  title={labelOf(name)}
                  aria-pressed={selected}
                  className={`aspect-square rounded-m3-md flex items-center justify-center m3-state-layer transition-colors ${
                    selected
                      ? 'bg-primary-container text-on-primary-container ring-2 ring-[var(--m3-primary)]'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {isGameIcon(name) ? <AvatarGlyph avatar={name} size={30} /> : <Icon name={name as IconName} size={26} />}
                </button>
              );
            })}
          </div>
          {(tab === 'emoji' || query) && !emojiRows && (
            <p className="m3-body-medium text-on-surface-variant text-center py-8">{t('common.loading')}</p>
          )}
          {shownEmoji.length > 0 && (
            <div className={`grid grid-cols-6 sm:grid-cols-8 gap-1.5 ${shown.length > 0 ? 'mt-4' : ''}`} data-testid="emoji-grid">
              {shownEmoji.map((r) => {
                const value = emojiValue(r);
                const selected = value === current;
                return (
                  <button
                    key={r[0]}
                    type="button"
                    onClick={() => onSelect(value)}
                    aria-label={emojiLabel(r)}
                    title={emojiLabel(r)}
                    aria-pressed={selected}
                    className={`aspect-square rounded-m3-md flex items-center justify-center m3-state-layer transition-colors ${
                      selected ? 'bg-primary-container ring-2 ring-[var(--m3-primary)]' : 'bg-surface-container'
                    }`}
                    style={{ fontFamily: EMOJI_FONT, fontSize: 26, lineHeight: 1 }}
                  >
                    {emojiOf(value)}
                  </button>
                );
              })}
            </div>
          )}
          {query && emojiRows && shown.length === 0 && shownEmoji.length === 0 && (
            <p className="m3-body-medium text-on-surface-variant text-center py-8">{t('avatar_picker.nothing_found')}</p>
          )}
        </div>
        {/* CC BY 3.0 asks for credit where the icons are used. */}
        <p className="shrink-0 px-4 py-3 border-t border-outline-variant m3-body-small text-on-surface-variant" data-testid="avatar-credit">
          <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer" className="underline">
            {t('avatar_picker.credit', { authors: GAME_ICON_AUTHOR_NAMES.join(', ') })}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AvatarPicker;
