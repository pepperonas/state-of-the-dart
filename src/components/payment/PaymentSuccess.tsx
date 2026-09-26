import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';
import { Card, Button } from '../common';
import { enterPop } from '../../utils/motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const PaymentSuccess: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    // Refresh user to get updated subscription status
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8 shadow-m3-3 text-center">
            <div className="w-20 h-20 bg-success-container rounded-m3-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-success" size={48} />
            </div>

            <h1 className="m3-headline-medium text-on-surface mb-4">
              {t('payment_success.title')}
            </h1>

            <p className="m3-body-medium text-on-surface-variant mb-8">
              {t('payment_success.body')}
            </p>

            <div className="space-y-3">
              <Button
                variant="filled"
                fullWidth
                icon={<Home size={20} />}
                onClick={() => navigate('/')}
              >
                {t('payment_success.to_app')}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => navigate('/settings')}
              >
                {t('payment_success.to_settings')}
              </Button>
            </div>

            <div className="mt-8 p-4 bg-primary-container text-on-primary-container rounded-m3-md">
              <p className="m3-body-small">
                {t('payment_success.tip')}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
