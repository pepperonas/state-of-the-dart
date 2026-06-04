import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { springSpatialDefault } from '../../utils/motion';

interface CheckoutSuggestionProps {
  suggestion: string[];
  alternatives?: string[][];
  remaining: number;
}

const CheckoutSuggestion: React.FC<CheckoutSuggestionProps> = ({ suggestion, alternatives, remaining }) => {
  const { t } = useTranslation();

  if (!suggestion || suggestion.length === 0) return null;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springSpatialDefault}
    >
      {/* Primary suggestion */}
      <div className="bg-tertiary-container text-on-tertiary-container rounded-m3-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="text-tertiary" size={18} />
          <span className="m3-title-small">
            Checkout: {remaining}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          {suggestion.map((dart, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-on-surface-variant m3-body-medium">&rarr;</span>
              )}
              <div className="px-3 py-1.5 bg-surface-container-high rounded-m3-sm shadow-m3-1">
                <span className="m3-title-medium text-on-surface">
                  {dart}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Alternative suggestions */}
      {alternatives && alternatives.length > 0 && alternatives.map((alt, altIndex) => (
        <div key={altIndex} className="bg-secondary-container text-on-secondary-container rounded-m3-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-primary" size={16} />
            <span className="m3-title-small">
              {t('game.alternative', 'Alternative')}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            {alt.map((dart, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-on-surface-variant m3-body-medium">&rarr;</span>
                )}
                <div className="px-3 py-1.5 bg-surface-container-high rounded-m3-sm shadow-m3-1">
                  <span className="m3-title-medium text-on-surface">
                    {dart}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
};

export default CheckoutSuggestion;
