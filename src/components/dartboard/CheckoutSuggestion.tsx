import React from 'react';
import { Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CheckoutSuggestionProps {
  suggestion: string[];
  alternatives?: string[][];
  remaining: number;
}

const CheckoutSuggestion: React.FC<CheckoutSuggestionProps> = ({ suggestion, alternatives, remaining }) => {
  const { t } = useTranslation();

  if (!suggestion || suggestion.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Primary suggestion (green) */}
      <div className="bg-green-900/20 border-2 border-green-500 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="text-green-400" size={18} />
          <span className="font-semibold text-green-200 text-sm">
            Checkout: {remaining}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          {suggestion.map((dart, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-gray-400 text-sm">&rarr;</span>
              )}
              <div className="px-3 py-1.5 bg-gray-800 rounded-lg shadow-md">
                <span className="text-lg font-bold text-white">
                  {dart}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Alternative suggestions (blue) */}
      {alternatives && alternatives.length > 0 && alternatives.map((alt, altIndex) => (
        <div key={altIndex} className="bg-blue-900/20 border-2 border-blue-500 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-blue-400" size={16} />
            <span className="font-semibold text-blue-200 text-sm">
              {t('game.alternative', 'Alternative')}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            {alt.map((dart, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-gray-400 text-sm">&rarr;</span>
                )}
                <div className="px-3 py-1.5 bg-gray-800/80 rounded-lg shadow-md border border-blue-500/30">
                  <span className="text-lg font-bold text-blue-200">
                    {dart}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CheckoutSuggestion;
