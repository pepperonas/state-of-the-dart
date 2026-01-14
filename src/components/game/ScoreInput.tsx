import React, { useState } from 'react';
import { Check, X, Delete } from 'lucide-react';
import { Dart } from '../../types/index';
import { parseDartNotation, formatDartNotation, calculateThrowScore, getQuickScoreButtons } from '../../utils/scoring';

interface ScoreInputProps {
  currentThrow: Dart[];
  onAddDart: (dart: Dart) => void;
  onRemoveDart: () => void;
  onClearThrow: () => void;
  onConfirm: () => void;
  remaining: number;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  currentThrow,
  onAddDart,
  onRemoveDart,
  onClearThrow,
  onConfirm,
  remaining,
}) => {
  const [inputMode, setInputMode] = useState<'numpad' | 'dartboard'>('numpad');
  const [currentInput, setCurrentInput] = useState('');
  
  const currentScore = calculateThrowScore(currentThrow);
  const quickButtons = getQuickScoreButtons();
  
  const handleNumpadClick = (value: string) => {
    if (currentThrow.length >= 3) return;
    
    if (value === 'clear') {
      setCurrentInput('');
    } else if (value === 'enter') {
      if (currentInput) {
        const score = parseInt(currentInput);
        if (score >= 0 && score <= 180) {
          // For simple score entry, we don't know the exact darts
          // So we'll add a placeholder dart
          onAddDart({
            segment: score,
            multiplier: 1,
            score: score,
            bed: 'single'
          });
          setCurrentInput('');
        }
      }
    } else {
      const newInput = currentInput + value;
      const num = parseInt(newInput);
      if (num <= 180) {
        setCurrentInput(newInput);
      }
    }
  };
  
  const handleQuickScore = (score: number) => {
    if (currentThrow.length >= 3) return;
    
    // Add the score as a single "throw" for simplicity
    // In a real implementation, you might want to break down common scores
    onAddDart({
      segment: score,
      multiplier: 1,
      score: score,
      bed: 'single'
    });
  };
  
  const handleDartNotation = (notation: string) => {
    if (currentThrow.length >= 3) return;
    
    try {
      const dart = parseDartNotation(notation);
      onAddDart(dart);
    } catch (error) {
      // Handle invalid notation
      console.error('Invalid dart notation:', notation);
    }
  };
  
  return (
    <div className="glass-card rounded-xl shadow-lg p-6 w-full max-w-md">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white">Score Input</h3>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {remaining}
          </span>
        </div>
        
        <div className="flex gap-2 mb-4">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex-1 h-12 rounded-lg border-2 border-gray-600 bg-gray-800/50 flex items-center justify-center"
            >
              {currentThrow[index] ? (
                <span className="font-bold text-lg text-white">
                  {currentThrow[index].score}
                </span>
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">Current Throw:</span>
          <span className="text-2xl font-bold text-white">{currentScore}</span>
        </div>
      </div>
      
      {/* Quick Score Buttons */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {quickButtons.map((score) => (
          <button
            key={score}
            onClick={() => handleQuickScore(score)}
            disabled={currentThrow.length >= 3}
            className="p-2 text-sm font-semibold rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {score}
          </button>
        ))}
      </div>
      
      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumpadClick(num.toString())}
            className="p-4 text-lg font-semibold rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-white transition-all"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleNumpadClick('clear')}
          className="p-4 text-lg font-semibold rounded-lg bg-red-900/30 hover:bg-red-900/40 text-red-400 transition-all"
        >
          C
        </button>
        <button
          onClick={() => handleNumpadClick('0')}
          className="p-4 text-lg font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          0
        </button>
        <button
          onClick={() => handleNumpadClick('enter')}
          className="p-4 text-lg font-semibold rounded-lg bg-green-900/30 hover:bg-green-900/40 text-green-400 transition-all"
        >
          ↵
        </button>
      </div>
      
      {/* Current Input Display */}
      {currentInput && (
        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg text-center text-2xl font-bold text-white">
          {currentInput}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onRemoveDart}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Delete size={20} />
          Undo
        </button>
        
        <button
          onClick={onClearThrow}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <X size={20} />
          Clear
        </button>
        
        <button
          onClick={onConfirm}
          disabled={currentThrow.length === 0}
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Check size={20} />
          OK
        </button>
      </div>
    </div>
  );
};

export default ScoreInput;