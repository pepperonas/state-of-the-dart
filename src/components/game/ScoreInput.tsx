import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, X, Delete, Keyboard, RotateCcw, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dart } from '../../types/index';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateThrowScore, convertScoreToDarts, numpadDarts } from '../../utils/scoring';
import AnimatedNumber from '../common/AnimatedNumber';
import Select from '../common/Select';
import SegmentedButton from '../common/SegmentedButton';
import { springSpatialFast, springSpatialDefault, effectsFast, enterRise } from '../../utils/motion';
import { shouldHandleGameKey } from '../../utils/gameKeys';
import type { Handoff } from '../../utils/handoff';
import type { CheckRule } from '../../utils/checkRules';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface ScoreInputProps {
  currentThrow: Dart[];
  onAddDart: (dart: Dart) => void;
  onRemoveDart: () => void;
  onClearThrow: () => void;
  onConfirm: () => void;
  onReplaceDart?: (index: number, dart: Dart) => void;
  editingDartIndex: number | null;
  onSetEditingDartIndex: (index: number | null) => void;
  isEditingThrow?: boolean;
  remaining: number;
  /** Out rule: a numpad total equal to the remaining score is entered along a checkout route. */
  outRule?: CheckRule;
  isCheckout?: boolean;
  /** Take back the last CONFIRMED throw (loads its darts back for correction). */
  onUndoThrow?: () => void;
  /** The throw `onUndoThrow` would take back — shown on the button so the player
   *  can see what they are about to undo. `null` = nothing to undo. */
  lastThrow?: { playerName: string; score: number; isBust?: boolean } | null;
  /** Several darts at once (a numpad total) — one sound and one haptic, not three. */
  onAddDarts?: (darts: Dart[]) => void;
  /** Adds the darts AND confirms the visit in one go (numpad total + Enter).
   *  Without it the confirm waited for an effect, and keys typed in between
   *  saw "three darts already" and were dropped. */
  onCommitDarts?: (darts: Dart[]) => void;
  /** The suggested checkout for the darts left, shown inside the card. */
  checkoutRoute?: string[] | null;
  /** The visit that was just handed over, shown briefly above the card. */
  handoff?: Handoff | null;
  /** "Auto next player" is off and a visit is confirmed: the name of who is next. */
  awaitingNextPlayer?: string | null;
  onNextPlayer?: () => void;
  /** The darts entered so far bust the visit (shake + BUST in the total box). */
  bust?: boolean;
}

/** Delay between darts that land together, from the stagger token (45 ms). */
const STAGGER_S = 0.045;

/** Numpad keys must not take focus on a click — a later Enter would click them again. */
const keepFocus = { onPointerDown: (e: React.PointerEvent) => e.preventDefault() };

const INPUT_MODE_KEY = 'sotd-input-mode';
/** Whether the on-screen numpad is unfolded where it starts folded (per device). */
const NUMPAD_OPEN_KEY = 'sotd-numpad-open';
/** Mouse and keyboard on a desktop-sized screen. Phones report a coarse pointer. */
const KEYBOARD_FIRST_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';
type InputMode = 'numpad' | 'darts' | 'quick';


const ScoreInput: React.FC<ScoreInputProps> = ({
  currentThrow,
  onAddDart,
  onRemoveDart,
  onClearThrow,
  onConfirm,
  onReplaceDart,
  editingDartIndex,
  onSetEditingDartIndex,
  isCheckout = false,
  isEditingThrow,
  remaining,
  outRule = 'double',
  onUndoThrow,
  lastThrow = null,
  onAddDarts,
  onCommitDarts,
  checkoutRoute = null,
  handoff = null,
  awaitingNextPlayer = null,
  onNextPlayer,
  bust = false,
}) => {
  const { t } = useTranslation();
  const [currentInput, setCurrentInput] = useState('');
  // Remembered per device — it used to reset to numpad on every visit.
  const [inputMode, setInputModeState] = useState<InputMode>(() => {
    try {
      const saved = localStorage.getItem(INPUT_MODE_KEY);
      return saved === 'quick' || saved === 'darts' ? saved : 'numpad';
    } catch { return 'numpad'; }
  });
  // Multiplier for the dart grid; falls back to single after every dart, the
  // way a player calls them ("treble 20, 5, 1").
  const [multiplier, setMultiplier] = useState<'1' | '2' | '3'>('1');
  const setInputMode = (mode: InputMode) => {
    const order: InputMode[] = ['numpad', 'darts', 'quick'];
    setModeDir(Math.sign(order.indexOf(mode) - order.indexOf(inputMode)));
    setInputModeState(mode);
    try { localStorage.setItem(INPUT_MODE_KEY, mode); } catch { /* storage unavailable */ }
  };
  const setEditingDartIndex = onSetEditingDartIndex;
  const keyboardFirst = useMediaQuery(KEYBOARD_FIRST_QUERY);
  const [numpadPref, setNumpadPref] = useState<boolean | null>(() => {
    try {
      const v = localStorage.getItem(NUMPAD_OPEN_KEY);
      return v === '1' ? true : v === '0' ? false : null;
    } catch { return null; }
  });
  const numpadOpen = !keyboardFirst || (numpadPref ?? false);
  const toggleNumpad = () => {
    const next = !numpadOpen;
    setNumpadPref(next);
    try { localStorage.setItem(NUMPAD_OPEN_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
  };
  // Shared-axis X between the input modes: the new pad slides in from the side
  // of the tab that was picked (left tab → from the left).
  const [modeDir, setModeDir] = useState(0);
  const modeEnter = {
    initial: modeDir === 0 ? false : { opacity: 0, x: 28 * modeDir },
    animate: { opacity: 1, x: 0 },
    transition: springSpatialDefault,
  } as const;
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Pending-confirm flag for "type total + Enter = commit throw" in numpad mode.
  // addScore dispatches ADD_DART asynchronously, so we can't call onConfirm directly
  // after it. Instead: arm the flag, then a useEffect watches currentThrow.length and
  // fires onConfirm once the dispatches have flushed.
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const prevLengthRef = useRef(currentThrow.length);

  const currentScore = calculateThrowScore(currentThrow);
  // How many darts the slots showed on the previous render — the new ones stagger.
  const [seenDarts, setSeenDarts] = useState(currentThrow.length);
  if (seenDarts !== currentThrow.length && currentThrow.length < seenDarts) setSeenDarts(currentThrow.length);
  useEffect(() => { setSeenDarts(currentThrow.length); }, [currentThrow.length]);
  // A typed total (or the dart being edited) owns the total box for now.
  const typing = inputMode === 'numpad' && (currentInput !== '' || editingDartIndex !== null);
  // "Bestätigen" with a typed total takes it, like Enter — it used to stay
  // disabled until darts existed, so the labelled button was a dead end.
  const commitsTyped = inputMode === 'numpad' && currentInput !== '' && editingDartIndex === null && currentThrow.length < 3;

  // Taking back a confirmed throw reloads its darts into the input, so it would
  // silently overwrite darts that are already sitting there — only offer it on an
  // empty visit.
  const canUndoThrow = Boolean(onUndoThrow && lastThrow && currentThrow.length === 0);

  // Bring the checkout button into view on an early checkout — 'nearest', so a
  // button that is already on screen does not make the page jump.
  useEffect(() => {
    if (isCheckout && confirmBtnRef.current) {
      confirmBtnRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isCheckout]);

  // Auto-confirm once the dispatched darts have landed in currentThrow
  useEffect(() => {
    if (pendingConfirm && currentThrow.length > prevLengthRef.current) {
      setPendingConfirm(false);
      onConfirm();
    }
    prevLengthRef.current = currentThrow.length;
  }, [currentThrow.length, pendingConfirm, onConfirm]);
  
  // Keyboard support. The listener is bound once and always calls the handler
  // of the latest render: re-binding it in an effect left a gap in which fast
  // typing hit a closure with stale input and dropped digits.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  useLayoutEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e)) return;

      // A confirmed visit waits for "next player": Enter passes the turn, and
      // nothing else may start the next visit for the wrong player.
      if (awaitingNextPlayer) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onNextPlayer?.();
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleNumpadClick(e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (inputMode === 'numpad' && currentThrow.length < 3) {
          // In numpad mode, Enter adds the score (or 0 if empty)
          handleNumpadClick('enter');
        } else if (currentThrow.length > 0) {
          // If throw is complete, confirm it
          onConfirm();
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (currentInput) {
          setCurrentInput(currentInput.slice(0, -1));
        } else if (currentThrow.length > 0) {
          onRemoveDart();
        } else if (canUndoThrow) {
          // Nothing left to delete in this visit — walk back one confirmed throw.
          onUndoThrow?.();
        }
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        if (canUndoThrow) {
          e.preventDefault();
          onUndoThrow?.();
        }
      } else if (e.key === 'Escape') {
        if (currentInput) {
          setCurrentInput('');
        } else {
          onClearThrow();
        }
      }
    };
    
    keyHandlerRef.current = handleKeyPress;
    // No deps on purpose: every render installs the handler it just built.
  });
  // Most common scores - prominently displayed
  const commonScores = [0, 26, 41, 45, 60, 81, 85, 100, 121, 140, 180];
  
  // All possible scores for dropdown
  const allScores = Array.from({ length: 181 }, (_, i) => i);
  
  const handleNumpadClick = (value: string) => {
    if (awaitingNextPlayer) return;
    if (value === 'clear') {
      setCurrentInput('');
      return;
    }

    if (value === 'enter') {
      // Edit mode: replace the selected dart, do NOT commit the whole throw
      if (editingDartIndex !== null) {
        const score = currentInput ? parseInt(currentInput) : 0;
        if (score >= 0 && score <= 180) addScore(score);
        return;
      }

      // Already 3 darts entered? Just commit.
      if (currentThrow.length >= 3) {
        onConfirm();
        return;
      }

      // Empty input + Enter = treat as 0 (miss / no score) and commit
      const score = currentInput ? parseInt(currentInput) : 0;
      if (score < 0 || score > 180) return;

      if (onCommitDarts) {
        const darts = numpadDarts(score, remaining, 3 - currentThrow.length, outRule)
          .slice(0, 3 - currentThrow.length);
        setCurrentInput('');
        onCommitDarts(darts);
        return;
      }
      addScore(score);
      setPendingConfirm(true);
      return;
    }

    if (currentThrow.length >= 3) return;

    const newInput = currentInput + value;
    const num = parseInt(newInput);
    if (num <= 180) {
      setCurrentInput(newInput);
    }
  };
  
  const addScore = (score: number) => {
    if (awaitingNextPlayer) return;
    // If editing a specific dart, replace it
    if (editingDartIndex !== null && onReplaceDart) {
      const darts = convertScoreToDarts(score);
      if (darts.length > 0) {
        onReplaceDart(editingDartIndex, { ...darts[0], estimated: true });
      }
      setEditingDartIndex(null);
      setCurrentInput('');
      return;
    }

    if (currentThrow.length >= 3) return;

    // Convert score to plausible darts — along a checkout route when it finishes.
    const darts = numpadDarts(score, remaining, 3 - currentThrow.length, outRule);
    // Add darts one by one, respecting the 3-dart limit
    const dartsToAdd = darts.slice(0, 3 - currentThrow.length);
    if (onAddDarts) onAddDarts(dartsToAdd);
    else dartsToAdd.forEach(dart => onAddDart(dart));
    setCurrentInput('');
  };
  
  /** One dart from the S/D/T grid: exact bed, no reconstruction needed. */
  const addGridDart = (segment: number) => {
    if (awaitingNextPlayer) return;
    const m = Number(multiplier) as 1 | 2 | 3;
    const dart: Dart =
      segment === 0 ? { segment: 0, multiplier: 0, score: 0, bed: 'miss' }
      : segment === 25 ? { segment: 25, multiplier: 1, score: 25, bed: 'outer-bull' }
      : segment === 50 ? { segment: 50, multiplier: 2, score: 50, bed: 'bull' }
      : { segment, multiplier: m, score: segment * m, bed: m === 3 ? 'triple' : m === 2 ? 'double' : 'single' };
    if (editingDartIndex !== null && onReplaceDart) {
      onReplaceDart(editingDartIndex, dart);
      setEditingDartIndex(null);
    } else if (currentThrow.length < 3) {
      onAddDart(dart);
    }
    setMultiplier('1');
  };

  const handleQuickScore = (score: number) => {
    addScore(score);
  };
  
  return (
    // Phone landscape: two columns — numpad right, everything else left — so a
    // whole turn fits into ~390px of height.
    <div className="relative m3-card m3-elevated rounded-m3-lg p-3 sm:p-4 md:p-5 w-full max-w-md phoneland:max-w-none phoneland:p-2 phoneland:grid phoneland:grid-cols-2 phoneland:gap-x-3 phoneland:items-start">
      {/* The visit just handed over — floats over the card edge, so it costs no
          height. The live region announces it; this is for the eyes. */}
      {handoff && (
        <div
          key={handoff.key}
          data-testid="handoff-chip"
          aria-hidden="true"
          className="absolute left-1/2 phoneland:left-3/4 -top-3 -translate-x-1/2 z-10 whitespace-nowrap px-3 py-1 rounded-m3-full m3-label-large shadow-m3-2 animate-fade-in bg-secondary-container text-on-secondary-container"
        >
          {handoff.bust
            ? t('game_screen.handoff_bust', { name: handoff.name, remaining: handoff.remaining })
            : t('game_screen.handoff', { name: handoff.name, score: handoff.score, remaining: handoff.remaining })}
        </div>
      )}
      {/* Header with Remaining Score */}
      {/* On phones the score strip above already shows the remaining score. */}
      <div className="mb-3 text-center hidden lg:block">
        <div className="m3-label-medium text-on-surface-variant mb-1 uppercase tracking-wide">{t('game.remaining')}</div>
        <AnimatedNumber
          value={remaining}
          className="block text-5xl font-bold"
          style={{ color: remaining <= 170 ? 'var(--m3-primary)' : 'var(--m3-on-surface)' }}
        />
      </div>

      {/* Current Throw Display — shakes once when the visit busts. */}
      <motion.div
        data-testid="dart-slots"
        data-bust={bust ? 'true' : undefined}
        animate={bust ? { x: [0, -9, 8, -6, 4, -2, 0] } : { x: 0 }}
        transition={bust ? { duration: 0.45, ease: 'easeOut' } : springSpatialFast}
        className="flex gap-2 mb-3 lg:mb-4 phoneland:mb-2 phoneland:col-start-1"
      >
        {[0, 1, 2].map((index) => {
          const dart = currentThrow[index];
          // Darts that land together (a quick score) arrive one after another.
          const delay = dart && index >= seenDarts ? (index - seenDarts) * STAGGER_S : 0;
          return (
          <button
            type="button"
            key={index}
            data-testid={`dart-slot-${index}`}
            disabled={!dart || !onReplaceDart}
            aria-pressed={editingDartIndex === index}
            aria-label={dart ? t('game.edit_dart', { n: index + 1, score: dart.score }) : t('game.empty_dart', { n: index + 1 })}
            onClick={() => {
              if (dart && onReplaceDart) {
                setEditingDartIndex(editingDartIndex === index ? null : index);
              }
            }}
            className={`relative overflow-hidden flex-1 h-14 lg:h-16 phoneland:h-11 rounded-m3-md border flex items-center justify-center transition ${
              editingDartIndex === index
                ? 'border-tertiary bg-tertiary-container ring-2 ring-[var(--m3-tertiary)]'
                : bust && dart
                ? 'bg-error-container ring-1 ring-[var(--m3-error)]'
                : dart
                ? 'bg-secondary-container cursor-pointer ring-1 ring-[var(--m3-primary)]'
                : 'border-outline-variant bg-surface-container'
            }`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {dart ? (
                <motion.span
                  key={`dart-${dart.segment}-${dart.multiplier}-${dart.score}`}
                  initial={{ scale: 0.3, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.5, opacity: 0, y: 8 }}
                  transition={{ ...springSpatialFast, delay }}
                  className={`font-bold text-2xl ${bust ? 'text-on-error-container' : 'text-on-secondary-container'}`}
                >
                  {dart.score}
                </motion.span>
              ) : (
                <motion.span
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={effectsFast}
                  className="text-on-surface-variant text-xl"
                  aria-hidden="true"
                >
                  -
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          );
        })}
        {/* While a total is typed it shows here, next to the slots, instead of
            below the numpad where the eye never was. A bust takes it over. */}
        <div
          data-testid="visit-total"
          className={`flex flex-col justify-center items-center rounded-m3-md px-3 min-w-[4.5rem] transition-colors ${
            typing ? 'bg-primary-container ring-2 ring-[var(--m3-primary)]'
              : bust ? 'bg-error-container ring-2 ring-[var(--m3-error)]'
              : 'bg-tertiary-container'
          }`}
        >
          <span className={`m3-label-small ${typing ? 'text-on-primary-container' : bust ? 'text-on-error-container' : 'text-on-tertiary-container'}`}>
            {typing ? (editingDartIndex !== null ? t('game.new_dart_value') : t('score_input.typed')) : t('score_input.total')}
          </span>
          {typing ? (
            <span className="text-2xl font-bold tabular-nums text-on-primary-container">{currentInput || '…'}</span>
          ) : bust ? (
            <motion.span
              key="bust"
              data-testid="bust-chip"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSpatialFast}
              className="text-xl font-bold text-on-error-container"
            >
              {t('game.bust')}
            </motion.span>
          ) : (
            <AnimatedNumber value={currentScore} className="text-2xl font-bold tabular-nums text-on-tertiary-container" />
          )}
        </div>
      </motion.div>

      {/* Checkout route for the darts left — inside the card, so it is on
          screen while typing. Its height is ALWAYS reserved: appearing and
          vanishing on every turn change made the numpad jump under the thumb. */}
      <div data-testid="checkout-slot" className="relative h-10 mb-3 phoneland:mb-2 phoneland:col-start-1">
        <AnimatePresence initial={false}>
          {checkoutRoute && checkoutRoute.length > 0 && (
            <motion.div
              key="route"
              data-testid="checkout-route"
              aria-label={`${t('score_input.checkout')}: ${checkoutRoute.join(' ')}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={springSpatialDefault}
              className="absolute inset-0 flex items-center gap-2 px-3 rounded-m3-md bg-success-container text-on-success-container"
            >
              <span className="m3-label-medium uppercase tracking-wide">{t('score_input.checkout')}</span>
              <span className="flex gap-1.5 ml-auto">
                <AnimatePresence mode="popLayout" initial={false}>
                  {checkoutRoute.map((d, i) => (
                    <motion.span
                      layout
                      key={`${i}-${d}`}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={springSpatialFast}
                      className="px-2 py-0.5 rounded-m3-sm bg-surface text-on-surface m3-label-large tabular-nums"
                    >
                      {d}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode switcher */}
      <SegmentedButton<InputMode>
        className="mb-4 phoneland:mb-2 phoneland:col-start-1"
        label={t('game.input_mode')}
        value={inputMode}
        onChange={setInputMode}
        options={[
          { value: 'numpad', label: t('game.mode_numpad'), icon: <Keyboard size={16} /> },
          { value: 'darts', label: t('game.mode_darts') },
          { value: 'quick', label: t('game.mode_quick') },
        ]}
      />

      {inputMode === 'darts' ? (
        <>
          {/* S/D/T grid: one tap per dart, exact beds — more accurate than
              tapping a phone-sized dartboard, and reachable by keyboard. */}
          <SegmentedButton<'1' | '2' | '3'>
            className="mb-3 phoneland:mb-2 phoneland:col-start-1"
            size="sm"
            label={t('game.multiplier')}
            value={multiplier}
            onChange={setMultiplier}
            options={[
              { value: '1', label: 'S', ariaLabel: t('game.single') },
              { value: '2', label: 'D', ariaLabel: t('game.double') },
              { value: '3', label: 'T', ariaLabel: t('game.triple') },
            ]}
          />
          <motion.div key={inputMode} {...modeEnter} className="grid grid-cols-5 gap-1.5 mb-1.5 phoneland:col-start-2 phoneland:row-start-1 phoneland:row-span-6 phoneland:mb-0">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => addGridDart(n)}
                disabled={currentThrow.length >= 3 && editingDartIndex === null}
                aria-label={`${multiplier === '3' ? t('game.triple') : multiplier === '2' ? t('game.double') : t('game.single')} ${n}`}
                className="sotd-key m3-state-layer m3-ripple min-h-[44px] bg-surface-container-high text-on-surface text-lg font-bold disabled:opacity-30"
              >
                {n}
              </button>
            ))}
          </motion.div>
          <div className="grid grid-cols-3 gap-1.5 mb-4 phoneland:mb-2 phoneland:col-start-1">
            <button type="button" onClick={() => addGridDart(25)} disabled={currentThrow.length >= 3 && editingDartIndex === null}
              className="sotd-key m3-state-layer m3-ripple min-h-[44px] bg-surface-container-high text-on-surface font-bold disabled:opacity-30">25</button>
            <button type="button" onClick={() => addGridDart(50)} disabled={currentThrow.length >= 3 && editingDartIndex === null}
              className="sotd-key m3-state-layer m3-ripple min-h-[44px] bg-primary-container text-on-primary-container font-bold disabled:opacity-30">Bull</button>
            <button type="button" onClick={() => addGridDart(0)} disabled={currentThrow.length >= 3 && editingDartIndex === null}
              className="sotd-key m3-state-layer m3-ripple min-h-[44px] bg-surface-container text-on-surface-variant font-bold disabled:opacity-30">{t('game.miss')}</button>
          </div>
        </>
      ) : inputMode === 'quick' ? (
        <>
          {/* Common Scores - Large Buttons */}
          <motion.div key={inputMode} {...modeEnter} className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3 phoneland:col-start-2 phoneland:row-start-1 phoneland:row-span-6 phoneland:mb-0">
            {commonScores.map((score) => (
              <button
                key={score}
                onClick={() => handleQuickScore(score)}
                disabled={currentThrow.length >= 3}
                className={`sotd-key m3-state-layer m3-ripple p-2 sm:p-3 text-lg font-bold min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed ${
                  score === 180
                    ? 'bg-tertiary-container text-on-tertiary-container'
                    : score >= 100
                    ? 'bg-primary-container text-on-primary-container'
                    : score === 0
                    ? 'bg-surface-container-high text-on-surface'
                    : 'bg-success-container text-on-success-container'
                }`}
              >
                {score}
              </button>
            ))}
          </motion.div>

          {/* All Scores Dropdown */}
          <Select<number>
            value={null}
            onChange={handleQuickScore}
            disabled={currentThrow.length >= 3}
            size="lg"
            className="mb-4 phoneland:mb-2 font-semibold phoneland:col-start-1"
            placeholder={t('game.more_scores', 'More Scores (0-180)...')}
            aria-label={t('game.more_scores', 'More Scores (0-180)...')}
            options={allScores.map(score => ({ value: score, label: String(score) }))}
          />
        </>
      ) : (
        <>
          {/* Mouse + keyboard on a desktop: the keyboard IS the numpad, so the
              on-screen one starts folded (per device). Touch keeps it open —
              there it is the fastest way in. */}
          {keyboardFirst && (
            <div className="flex items-center justify-between gap-2 mb-3 phoneland:col-start-1">
              {!numpadOpen && (
                <span data-testid="numpad-collapsed" className="m3-body-medium text-on-surface-variant flex items-center gap-2">
                  <Keyboard size={18} aria-hidden="true" />
                  {t('score_input.keyboard_entry')}
                </span>
              )}
              <button
                type="button"
                onClick={toggleNumpad}
                aria-expanded={numpadOpen}
                className="m3-state-layer ml-auto inline-flex items-center gap-1 px-3 min-h-[40px] rounded-m3-full m3-label-large text-primary"
              >
                <ChevronDown size={18} aria-hidden="true" className={`m3-chevron ${numpadOpen ? 'm3-open' : ''}`} />
                {numpadOpen ? t('score_input.hide_numpad') : t('score_input.show_numpad')}
              </button>
            </div>
          )}
          {/* Numpad */}
          {numpadOpen && (
          <motion.div key={inputMode} {...modeEnter} className="grid grid-cols-3 gap-2 mb-3 lg:mb-4 phoneland:gap-1.5 phoneland:col-start-2 phoneland:row-start-1 phoneland:row-span-6 phoneland:mb-0">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                {...keepFocus}
                onClick={() => handleNumpadClick(num.toString())}
                className="sotd-key m3-state-layer m3-ripple p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-xl font-bold bg-surface-container-high text-on-surface"
              >
                {num}
              </button>
            ))}
            <button
              {...keepFocus}
              onClick={() => handleNumpadClick('clear')}
              aria-label={t('game.clear_input')}
              title={t('game.clear_input')}
              className="sotd-key m3-state-layer m3-ripple p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-lg font-bold bg-surface-container-highest text-on-surface"
            >
              C
            </button>
            <button
              {...keepFocus}
              onClick={() => handleNumpadClick('0')}
              className="sotd-key m3-state-layer m3-ripple p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-xl font-bold bg-surface-container-high text-on-surface"
            >
              0
            </button>
            <button
              {...keepFocus}
              onClick={() => handleNumpadClick('enter')}
              className="sotd-key m3-state-layer m3-ripple p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-2xl font-bold bg-primary text-on-primary shadow-m3-1"
              title={editingDartIndex !== null ? t('score_input.replace_dart') : t('score_input.submit_total')}
            >
              {editingDartIndex !== null ? t('game.set_dart') : '↵'}
            </button>
          </motion.div>
          )}

        </>
      )}

      {/* Take back the last CONFIRMED throw. Sits with the other actions instead of
          hiding in a header icon — it is the correction players reach for most. */}
      {onUndoThrow && (
        <button
          onClick={() => canUndoThrow && onUndoThrow()}
          disabled={!canUndoThrow}
          aria-label={t('game.undo_last_throw')}
          title={
            !lastThrow
              ? t('game.no_throw_to_undo')
              : currentThrow.length > 0
                ? t('game.undo_throw_blocked')
                : t('game.undo_last_throw')
          }
          className="w-full mb-2 min-h-[52px] phoneland:min-h-[44px] phoneland:py-2 phoneland:mb-1.5 phoneland:col-start-1 flex items-center justify-center gap-2 px-4 py-3 rounded-m3-full bg-tertiary-container text-on-tertiary-container m3-state-layer disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
        >
          <RotateCcw size={18} />
          <span>{t('game.undo_last_throw')}</span>
          {lastThrow && (
            <span className="m3-label-large px-2 py-0.5 rounded-m3-full bg-[color-mix(in_srgb,var(--m3-on-tertiary-container)_14%,transparent)] max-w-[45%] truncate">
              {lastThrow.playerName} · {lastThrow.isBust ? t('game.bust') : lastThrow.score}
            </span>
          )}
        </button>
      )}

      {/* Action Buttons — confirm gets the most room, it is the one used every visit. */}
      <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-2 phoneland:col-start-1">
        <button
          onClick={onRemoveDart}
          disabled={currentThrow.length === 0}
          aria-label={t('game.remove_dart')}
          title={t('game.remove_dart')}
          className="flex items-center justify-center gap-1 p-3 rounded-m3-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
        >
          <Delete size={18} />
          <span className="hidden sm:inline">{t('game.dart')}</span>
        </button>

        <button
          onClick={onClearThrow}
          disabled={currentThrow.length === 0}
          aria-label={t('game.clear_visit_long')}
          title={t('game.clear_visit_long')}
          className="flex items-center justify-center gap-1 p-3 rounded-m3-full bg-error-container text-on-error-container disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
        >
          <X size={18} />
          <span>{t('game.clear_visit')}</span>
        </button>

        <button
          ref={confirmBtnRef}
          onClick={awaitingNextPlayer ? onNextPlayer : commitsTyped ? () => handleNumpadClick('enter') : onConfirm}
          disabled={!awaitingNextPlayer && !commitsTyped && currentThrow.length === 0}
          className={`flex items-center justify-center gap-1 p-3 rounded-m3-full disabled:opacity-30 disabled:cursor-not-allowed transition font-bold shadow-m3-1 ${
            isCheckout
              ? 'bg-success text-on-success sotd-ring-pulse'
              : isEditingThrow
                ? 'bg-tertiary text-on-tertiary col-span-1'
                : 'bg-primary text-on-primary'
          }`}
        >
          <Check size={20} />
          <span className="truncate">{awaitingNextPlayer
            ? t('game_screen.next_player', { name: awaitingNextPlayer })
            : isCheckout ? t('score_input.checkout') : isEditingThrow ? t('game.confirm_correction') : t('game.confirm_visit')}</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-3 text-center m3-body-small text-on-surface-variant hidden lg:block">
        {t('game.keyboard_hint')}
      </div>
    </div>
  );
};

export default ScoreInput;