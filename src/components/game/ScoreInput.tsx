import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Delete, Keyboard } from 'lucide-react';
import { Dart } from '../../types/index';
import { motion } from 'framer-motion';
import { calculateThrowScore, convertScoreToDarts } from '../../utils/scoring';
import AnimatedNumber from '../common/AnimatedNumber';
import { springSpatialFast } from '../../utils/motion';

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
  isCheckout?: boolean;
}

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
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [inputMode, setInputMode] = useState<'quick' | 'numpad'>('numpad');
  const setEditingDartIndex = onSetEditingDartIndex;
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Pending-confirm flag for "type total + Enter = commit throw" in numpad mode.
  // addScore dispatches ADD_DART asynchronously, so we can't call onConfirm directly
  // after it. Instead: arm the flag, then a useEffect watches currentThrow.length and
  // fires onConfirm once the dispatches have flushed.
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const prevLengthRef = useRef(currentThrow.length);

  const currentScore = calculateThrowScore(currentThrow);

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
      // Don't capture if user is typing in an input field or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      
      if (e.key >= '0' && e.key <= '9') {
        handleNumpadClick(e.key);
      } else if (e.key === 'Enter') {
        if (inputMode === 'numpad' && currentThrow.length < 3) {
          // In numpad mode, Enter adds the score (or 0 if empty)
          handleNumpadClick('enter');
        } else if (currentThrow.length > 0) {
          // If throw is complete, confirm it
          onConfirm();
        }
      } else if (e.key === 'Backspace') {
        if (currentInput) {
          setCurrentInput(currentInput.slice(0, -1));
        } else {
          onRemoveDart();
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
  }, [currentInput, currentThrow, inputMode, editingDartIndex, onConfirm, onRemoveDart, onClearThrow]);
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

    // Convert score to plausible darts
    const darts = convertScoreToDarts(score);
    // Add darts one by one, respecting the 3-dart limit
    const dartsToAdd = darts.slice(0, 3 - currentThrow.length);
    dartsToAdd.forEach(dart => onAddDart(dart));
    setCurrentInput('');
  };
  
  const handleQuickScore = (score: number) => {
    addScore(score);
  };
  
  return (
    <div className="m3-card m3-elevated rounded-m3-lg p-4 md:p-6 w-full max-w-md">
      {/* Header with Remaining Score */}
      <div className="mb-4 text-center">
        <div className="m3-label-medium text-on-surface-variant mb-1 uppercase tracking-wide">Remaining</div>
        <AnimatedNumber
          value={remaining}
          className="block text-5xl font-bold"
          style={{ color: remaining <= 170 ? 'var(--m3-primary)' : 'var(--m3-on-surface)' }}
        />
      </div>

      {/* Current Throw Display */}
      <div className="flex gap-2 mb-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            onClick={() => {
              if (currentThrow[index] && onReplaceDart) {
                setEditingDartIndex(editingDartIndex === index ? null : index);
              }
            }}
            className={`flex-1 h-16 rounded-m3-md border flex items-center justify-center transition-all ${
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
          </div>
        ))}
        <div className="flex flex-col justify-center items-center bg-tertiary-container rounded-m3-md px-3">
          <span className="m3-label-small text-on-tertiary-container opacity-80">Total</span>
          <span className="text-2xl font-bold text-on-tertiary-container">{currentScore}</span>
        </div>
      </div>

      {/* Mode Switcher (M3 segmented) */}
      <div className="flex gap-1 mb-4 p-1 bg-surface-container rounded-m3-full">
        <button
          onClick={() => setInputMode('numpad')}
          className={`flex-1 py-2 rounded-m3-full m3-label-large transition-all flex items-center justify-center gap-2 ${
            inputMode === 'numpad'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <Keyboard size={16} />
          Numpad
        </button>
        <button
          onClick={() => setInputMode('quick')}
          className={`flex-1 py-2 rounded-m3-full m3-label-large transition-all ${
            inputMode === 'quick'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Quick Scores
        </button>
      </div>

      {inputMode === 'quick' ? (
        <>
          {/* Common Scores - Large Buttons */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3">
            {commonScores.map((score) => (
              <button
                key={score}
                onClick={() => handleQuickScore(score)}
                disabled={currentThrow.length >= 3}
                className={`p-2 sm:p-3 text-lg font-bold rounded-m3-md transition-all min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed ${
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
          <select
            onChange={(e) => {
              const score = parseInt(e.target.value);
              if (!isNaN(score)) {
                handleQuickScore(score);
                e.target.value = '';
              }
            }}
            disabled={currentThrow.length >= 3}
            className="w-full p-3 mb-4 rounded-m3-sm bg-surface-container border border-outline-variant text-on-surface font-semibold disabled:opacity-30"
            value=""
          >
            <option value="">More Scores (0-180)...</option>
            {allScores.map(score => (
              <option key={score} value={score}>{score}</option>
            ))}
          </select>
        </>
      ) : (
        <>
          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleNumpadClick(num.toString())}
                className="p-4 text-xl font-bold rounded-m3-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumpadClick('clear')}
              className="p-4 text-lg font-bold rounded-m3-md bg-error-container text-on-error-container transition-all active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={() => handleNumpadClick('0')}
              className="p-4 text-xl font-bold rounded-m3-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => handleNumpadClick('enter')}
              className="p-4 text-lg font-bold rounded-m3-md bg-primary-container text-on-primary-container transition-all active:scale-95"
              title={editingDartIndex !== null ? 'Dart ersetzen' : 'Wurf-Summe übernehmen und bestätigen'}
            >
              {editingDartIndex !== null ? 'Set' : 'OK'}
            </button>
          </div>

          {/* Current Input Display */}
          <div className="mb-4 p-4 bg-surface-container rounded-m3-md text-center border border-outline-variant">
            {currentInput ? (
              <span className="text-3xl font-bold text-on-surface">{currentInput}</span>
            ) : (
              <span className="text-on-surface-variant opacity-70">
                {editingDartIndex !== null
                  ? 'Neuer Dart-Wert...'
                  : 'Wurf-Summe (0–180) eintippen und OK'}
              </span>
            )}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onRemoveDart}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-1 p-3 rounded-m3-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
        >
          <Delete size={18} />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={onClearThrow}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-1 p-3 rounded-m3-full bg-error-container text-on-error-container disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
        >
          <X size={18} />
          <span className="hidden sm:inline">Clear</span>
        </button>

        <button
          ref={confirmBtnRef}
          onClick={onConfirm}
          disabled={currentThrow.length === 0}
          className={`flex items-center justify-center gap-1 p-3 rounded-m3-full disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-m3-1 ${
            isCheckout
              ? 'bg-success text-on-success animate-pulse ring-2 ring-[var(--m3-success)] ring-offset-2 ring-offset-surface'
              : isEditingThrow
                ? 'bg-tertiary text-on-tertiary col-span-1'
                : 'bg-primary text-on-primary'
          }`}
        >
          <Check size={20} />
          <span>{isCheckout ? 'Checkout!' : isEditingThrow ? 'Korrektur' : 'OK'}</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-3 text-center m3-body-small text-on-surface-variant">
        ⌨️ Keyboard: 0-9 to type, Enter to confirm, Backspace to undo, Esc to clear
      </div>
    </div>
  );
};

export default ScoreInput;