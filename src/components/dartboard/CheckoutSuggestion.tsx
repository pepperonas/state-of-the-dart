import React from 'react';
import { Target } from 'lucide-react';

interface CheckoutSuggestionProps {
  suggestion: string[];
  alternatives?: string[][];
  remaining: number;
}

const CheckoutSuggestion: React.FC<CheckoutSuggestionProps> = ({ suggestion, alternatives, remaining }) => {
  if (!suggestion || suggestion.length === 0) return null;

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="text-green-600 dark:text-green-400" size={20} />
        <span className="font-semibold text-green-800 dark:text-green-200">
          Checkout: {remaining}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3">
        {suggestion.map((dart, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-gray-500 dark:text-gray-400">→</span>
            )}
            <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                {dart}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Alternative routes */}
      {alternatives && alternatives.length > 0 && (
        <div className="mt-2 pt-2 border-t border-green-500/30">
          {alternatives.map((alt, altIndex) => (
            <div key={altIndex} className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-green-600/60 dark:text-green-400/60 mr-1">oder</span>
              {alt.map((dart, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className="text-gray-500/50 text-xs">→</span>
                  )}
                  <span className="text-sm font-semibold text-green-600/70 dark:text-green-400/70">
                    {dart}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CheckoutSuggestion;