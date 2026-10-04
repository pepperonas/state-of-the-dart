import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Delete, Keyboard, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dart } from '../../types/index';
import { motion } from 'framer-motion';
import { calculateThrowScore, convertScoreToDarts, numpadDarts } from '../../utils/scoring';
import AnimatedNumber from '../common/AnimatedNumber';
import Select from '../common/Select';
import SegmentedButton from '../common/SegmentedButton';
import { springSpatialFast } from '../../utils/motion';
import { shouldHandleGameKey } from '../../utils/gameKeys';

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
  /** Double-out: a numpad total equal to the remaining score is entered along a checkout route. */
  doubleOut?: boolean;
  isCheckout?: boolean;
  /** Take back the last CONFIRMED throw (loads its darts back for correction). */
  onUndoThrow?: () => void;
  /** The throw `onUndoThrow` would take back — shown on the button so the player
   *  can see what they are about to undo. `null` = nothing to undo. */
  lastThrow?: { playerName: string; score: number; isBust?: boolean } | null;
}

const INPUT_MODE_KEY = 'sotd-input-mode';
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
  doubleOut = true,
  onUndoThrow,
  lastThrow = null,
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
    setInputModeState(mode);
    try { localStorage.setItem(INPUT_MODE_KEY, mode); } catch { /* storage unavailable */ }
  };
  const setEditingDartIndex = onSetEditingDartIndex;
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Pending-confirm flag for "type total + Enter = commit throw" in numpad mode.
  // addScore dispatches ADD_DART asynchronously, so we can't call onConfirm directly
  // after it. Instead: arm the flag, then a useEffect watches currentThrow.length and
  // fires onConfirm once the dispatches have flushed.
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const prevLengthRef = useRef(currentThrow.length);

  const currentScore = calculateThrowScore(currentThrow);

  // Taking back a confirmed throw reloads its darts into the input, so it would
  // silently overwrite darts that are already sitting there — only offer it on an
  // empty visit.
  const canUndoThrow = Boolean(onUndoThrow && lastThrow && currentThrow.length === 0);

  // Auto-scroll confirm button into view on early checkout
  useEffect(() => {
    if (isCheckout && confirmBtnRef.current) {
      confirmBtnRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  
  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e)) return;
      
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
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // editingDartIndex must be a dep: it changes when a dart slot is clicked WITHOUT
    // currentThrow/currentInput changing, so the listener would otherwise close over a
    // stale value and route keyboard-Enter to the wrong branch (commit vs. replace-dart).
  }, [currentInput, currentThrow, inputMode, editingDartIndex, onConfirm, onRemoveDart, onClearThrow, canUndoThrow, onUndoThrow]);
  // Most common scores - prominently displayed
  const commonScores = [0, 26, 41, 45, 60, 81, 85, 100, 121, 140, 180];
  
  // All possible scores for dropdown
  const allScores = Array.from({ length: 181 }, (_, i) => i);
  
  const handleNumpadClick = (value: string) => {
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
    // If editing a specific dart, replace it
    if (editingDartIndex !== null && onReplaceDart) {
      const darts = convertScoreToDarts(score);
      if (darts.length > 0) {
        onReplaceDart(editingDartIndex, darts[0]);
      }
      setEditingDartIndex(null);
      setCurrentInput('');
      return;
    }

    if (currentThrow.length >= 3) return;

    // Convert score to plausible darts — along a checkout route when it finishes.
    const darts = numpadDarts(score, remaining, 3 - currentThrow.length, doubleOut);
    // Add darts one by one, respecting the 3-dart limit
    const dartsToAdd = darts.slice(0, 3 - currentThrow.length);
    dartsToAdd.forEach(dart => onAddDart(dart));
    setCurrentInput('');
  };
  
  /** One dart from the S/D/T grid: exact bed, no reconstruction needed. */
  const addGridDart = (segment: number) => {
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
    <div className="m3-card m3-elevated rounded-m3-lg p-3 sm:p-4 md:p-5 w-full max-w-md phoneland:max-w-none phoneland:p-2 phoneland:grid phoneland:grid-cols-2 phoneland:gap-x-3 phoneland:items-start">
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

      {/* Current Throw Display */}
      <div className="flex gap-2 mb-3 lg:mb-4 phoneland:mb-2 phoneland:col-start-1">
        {[0, 1, 2].map((index) => (
          <button
            type="button"
            key={index}
            data-testid={`dart-slot-${index}`}
            disabled={!currentThrow[index] || !onReplaceDart}
            aria-pressed={editingDartIndex === index}
            aria-label={currentThrow[index] ? t('game.edit_dart', { n: index + 1, score: currentThrow[index].score }) : t('game.empty_dart', { n: index + 1 })}
            onClick={() => {
              if (currentThrow[index] && onReplaceDart) {
                setEditingDartIndex(editingDartIndex === index ? null : index);
              }
            }}
            className={`flex-1 h-14 lg:h-16 phoneland:h-11 rounded-m3-md border flex items-center justify-center transition ${
              editingDartIndex === index
                ? 'border-tertiary bg-tertiary-container ring-2 ring-[var(--m3-tertiary)]'
                : currentThrow[index]
                ? 'bg-secondary-container cursor-pointer ring-1 ring-[var(--m3-primary)]'
                : 'border-outline-variant bg-surface-container'
            }`}
          >
            {currentThrow[index] ? (
              <motion.span
                key={currentThrow[index].score}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springSpatialFast}
                className="font-bold text-2xl text-on-secondary-container"
              >
                {currentThrow[index].score}
              </motion.span>
            ) : (
              <span className="text-on-surface-variant text-xl opacity-50">-</span>
            )}
          </button>
        ))}
        <div className="flex flex-col justify-center items-center bg-tertiary-container rounded-m3-md px-3">
          <span className="m3-label-small text-on-tertiary-container opacity-80">{t('score_input.total')}</span>
          <span className="text-2xl font-bold text-on-tertiary-container">{currentScore}</span>
        </div>
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
          <div className="grid grid-cols-5 gap-1.5 mb-1.5 phoneland:col-start-2 phoneland:row-start-1 phoneland:row-span-6 phoneland:mb-0">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => addGridDart(n)}
                disabled={currentThrow.length >= 3 && editingDartIndex === null}
                aria-label={`${multiplier === '3' ? t('game.triple') : multiplier === '2' ? t('game.double') : t('game.single')} ${n}`}
                className="m3-state-layer min-h-[44px] rounded-m3-md bg-surface-container-high text-on-surface text-lg font-bold disabled:opacity-30"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-4 phoneland:mb-2 phoneland:col-start-1">
            <button type="button" onClick={() => addGridDart(25)} disabled={currentThrow.length >= 3 && editingDartIndex === null}
              className="m3-state-layer min-h-[44px] rounded-m3-md bg-surface-container-high text-on-surface font-bold disabled:opacity-30">25</button>
            <button type="button" onClick={() => addGridDart(50)} disabled={currentThrow.length >= 3 && editingDartIndex === null}
              className="m3-state-layer min-h-[44px] rounded-m3-md bg-primary-container text-on-primary-container font-bold disabled:opacity-30">Bull</button>
            <button type="button" onClick={() => addGridDart(0)} disabled={currentThrow.length >= 3 && editingDartIndex === null}
              className="m3-state-layer min-h-[44px] rounded-m3-md bg-surface-container text-on-surface-variant font-bold disabled:opacity-30">{t('game.miss')}</button>
          </div>
        </>
      ) : inputMode === 'quick' ? (
        <>
          {/* Common Scores - Large Buttons */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3 phoneland:col-start-2 phoneland:row-start-1 phoneland:row-span-6 phoneland:mb-0">
            {commonScores.map((score) => (
              <button
                key={score}
                onClick={() => handleQuickScore(score)}
                disabled={currentThrow.length >= 3}
                className={`p-2 sm:p-3 text-lg font-bold rounded-m3-md transition min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed ${
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
          </div>

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
          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-3 lg:mb-4 phoneland:gap-1.5 phoneland:col-start-2 phoneland:row-start-1 phoneland:row-span-6 phoneland:mb-0">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleNumpadClick(num.toString())}
                className="p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-xl font-bold rounded-m3-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumpadClick('clear')}
              aria-label={t('game.clear_input')}
              title={t('game.clear_input')}
              className="p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-lg font-bold rounded-m3-md bg-surface-container-highest text-on-surface transition active:scale-95"
            >
              C
            </button>
            <button
              onClick={() => handleNumpadClick('0')}
              className="p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-xl font-bold rounded-m3-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => handleNumpadClick('enter')}
              className="p-3 lg:p-4 phoneland:p-2 min-h-[48px] text-lg font-bold rounded-m3-md bg-primary-container text-on-primary-container transition active:scale-95"
              title={editingDartIndex !== null ? t('score_input.replace_dart') : t('score_input.submit_total')}
            >
              {editingDartIndex !== null ? t('game.set_dart') : '↵'}
            </button>
          </div>

          {/* Current Input Display */}
          <div className="mb-3 lg:mb-4 phoneland:mb-2 phoneland:p-1 phoneland:min-h-[40px] p-2 lg:p-4 min-h-[48px] flex items-center justify-center bg-surface-container rounded-m3-md text-center border border-outline-variant phoneland:col-start-1">
            {currentInput ? (
              <span className="text-3xl font-bold text-on-surface">{currentInput}</span>
            ) : (
              <span className="text-on-surface-variant">
                {editingDartIndex !== null
                  ? t('game.new_dart_value')
                  : t('game.numpad_hint')}
              </span>
            )}
          </div>
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

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 phoneland:col-start-1">
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
          onClick={onConfirm}
          disabled={currentThrow.length === 0}
          className={`flex items-center justify-center gap-1 p-3 rounded-m3-full disabled:opacity-30 disabled:cursor-not-allowed transition font-bold shadow-m3-1 ${
            isCheckout
              ? 'bg-success text-on-success animate-pulse ring-2 ring-[var(--m3-success)] ring-offset-2 ring-offset-surface'
              : isEditingThrow
                ? 'bg-tertiary text-on-tertiary col-span-1'
                : 'bg-primary text-on-primary'
          }`}
        >
          <Check size={20} />
          <span>{isCheckout ? t('score_input.checkout') : isEditingThrow ? t('game.confirm_correction') : t('game.confirm_visit')}</span>
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