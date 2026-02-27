import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    // Refresh user to get updated subscription status
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-20 h-20 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-success-400" size={48} />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Zahlung erfolgreich! 🎉
          </h1>
          
          <p className="text-dark-300 mb-8">
            Vielen Dank für dein Vertrauen! Dein Abo ist jetzt aktiv und du hast vollen Zugriff auf alle Features.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Home size={20} />
              Zur App
            </button>
            
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-3 text-primary-400 hover:text-primary-300 transition-colors"
            >
              Zu den Einstellungen
            </button>
          </div>

          <div className="mt-8 p-4 bg-primary-500/10 rounded-lg border border-primary-500/30">
            <p className="text-sm text-primary-400">
              💡 Tipp: Du kannst dein Abo jederzeit in den Einstellungen verwalten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
