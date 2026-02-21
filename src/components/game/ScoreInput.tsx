import React, { useState, useEffect } from 'react';
import { Check, X, Delete, Keyboard } from 'lucide-react';
import { Dart } from '../../types/index';
import { calculateThrowScore, convertScoreToDarts } from '../../utils/scoring';

interface ScoreInputProps {
  currentThrow: Dart[];
  onAddDart: (dart: Dart) => void;
  onRemoveDart: () => void;
  onClearThrow: () => void;
  onConfirm: () => void;
  onReplaceDart?: (index: number, dart: Dart) => void;
  remaining: number;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  currentThrow,
  onAddDart,
  onRemoveDart,
  onClearThrow,
  onConfirm,
  onReplaceDart,
  remaining,
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [inputMode, setInputMode] = useState<'quick' | 'numpad'>('numpad');
  const [editingDartIndex, setEditingDartIndex] = useState<number | null>(null);
  
  const currentScore = calculateThrowScore(currentThrow);
  
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
  }, [currentInput, currentThrow, inputMode, onConfirm, onRemoveDart, onClearThrow]);
  // Most common scores - prominently displayed
  const commonScores = [0, 26, 41, 45, 60, 81, 85, 100, 121, 140, 180];
  
  // All possible scores for dropdown
  const allScores = Array.from({ length: 181 }, (_, i) => i);
  
  const handleNumpadClick = (value: string) => {
    if (currentThrow.length >= 3) return;
    
    if (value === 'clear') {
      setCurrentInput('');
    } else if (value === 'enter') {
      // If no input, treat as 0 (no score)
      const score = currentInput ? parseInt(currentInput) : 0;
      if (score >= 0 && score <= 180) {
        addScore(score);
      }
    } else {
      const newInput = currentInput + value;
      const num = parseInt(newInput);
      if (num <= 180) {
        setCurrentInput(newInput);
      }
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
    <div className="glass-card rounded-xl shadow-lg p-4 md:p-6 w-full max-w-md">
      {/* Header with Remaining Score */}
      <div className="mb-4 text-center">
        <div className="text-sm text-dark-400 mb-1">Remaining</div>
        <div className={`text-5xl font-bold ${
          remaining <= 170 ? 'text-primary-400 neon-primary' : 'text-white'
        }`}>
          {remaining}
        </div>
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
            className={`flex-1 h-16 rounded-lg border-2 flex items-center justify-center transition-all ${
              editingDartIndex === index
                ? 'border-accent-500 bg-accent-500/20 ring-2 ring-accent-500/50'
                : currentThrow[index]
                ? 'border-primary-500 bg-primary-500/10 cursor-pointer hover:bg-primary-500/20'
                : 'border-dark-700 bg-dark-900/50'
            }`}
          >
            {currentThrow[index] ? (
              <span className="font-bold text-2xl text-white">
                {currentThrow[index].score}
              </span>
            ) : (
              <span className="text-dark-600 text-xl">-</span>
            )}
          </div>
        ))}
        <div className="flex flex-col justify-center items-center bg-accent-500/10 border-2 border-accent-500/30 rounded-lg px-3">
          <span className="text-xs text-dark-400">Total</span>
          <span className="text-2xl font-bold text-white">{currentScore}</span>
        </div>
      </div>
      
      {/* Mode Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setInputMode('numpad')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            inputMode === 'numpad'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
          }`}
        >
          <Keyboard size={16} />
          Numpad
        </button>
        <button
          onClick={() => setInputMode('quick')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
            inputMode === 'quick'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
          }`}
        >
          Quick Scores
        </button>
      </div>
      
      {inputMode === 'quick' ? (
        <>
          {/* Common Scores - Large Buttons */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            {commonScores.map((score) => (
              <button
                key={score}
                onClick={() => handleQuickScore(score)}
                disabled={currentThrow.length >= 3}
                className={`p-3 text-lg font-bold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  score === 180 
                    ? 'bg-accent-500/80 hover:bg-accent-600 text-white'
                    : score >= 100
                    ? 'bg-primary-500/60 hover:bg-primary-600 text-white'
                    : score === 0
                    ? 'bg-dark-700/60 hover:bg-dark-600 text-white'
                    : 'bg-success-500/60 hover:bg-success-600 text-white'
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
            className="w-full p-3 mb-4 rounded-lg bg-dark-800 border-2 border-dark-700 text-white font-semibold disabled:opacity-30"
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
                className="p-4 text-xl font-bold rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-all"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumpadClick('clear')}
              className="p-4 text-lg font-bold rounded-lg bg-red-600/40 hover:bg-red-600/60 text-white transition-all"
            >
              Clear
            </button>
            <button
              onClick={() => handleNumpadClick('0')}
              className="p-4 text-xl font-bold rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-all"
            >
              0
            </button>
            <button
              onClick={() => handleNumpadClick('enter')}
              className="p-4 text-lg font-bold rounded-lg bg-success-500/60 hover:bg-success-600 text-white transition-all"
            >
              Enter
            </button>
          </div>
          
          {/* Current Input Display */}
          <div className="mb-4 p-4 bg-dark-900/50 rounded-lg text-center border-2 border-dark-700">
            {currentInput ? (
              <span className="text-3xl font-bold text-white">{currentInput}</span>
            ) : (
              <span className="text-dark-600">Type score...</span>
            )}
          </div>
        </>
      )}
      
      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onRemoveDart}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-1 p-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
        >
          <Delete size={18} />
          <span className="hidden sm:inline">Undo</span>
        </button>
        
        <button
          onClick={onClearThrow}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-1 p-3 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
        >
          <X size={18} />
          <span className="hidden sm:inline">Clear</span>
        </button>
        
        <button
          onClick={onConfirm}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-1 p-3 rounded-lg bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-lg"
        >
          <Check size={20} />
          <span>OK</span>
        </button>
      </div>
      
      {/* Keyboard Shortcuts Hint */}
      <div className="mt-3 text-center text-xs text-dark-500">
        ⌨️ Keyboard: 0-9 to type, Enter to confirm, Backspace to undo, Esc to clear
      </div>
    </div>
  );
};

export default ScoreInput;