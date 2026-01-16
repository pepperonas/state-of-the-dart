import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, LogIn, Trash2 } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { formatDate } from '../utils/dateUtils';

const TenantSelector: React.FC = () => {
  const { tenants, currentTenant, setCurrentTenant, addTenant, deleteTenant } = useTenant();
  const [showNewTenant, setShowNewTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantAvatar, setNewTenantAvatar] = useState('👤');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const avatarOptions = ['👤', '🎯', '🏆', '👑', '🔥', '⭐', '💪', '🎪', '🦅', '🚀', '💎', '🎨'];
  
  const handleAddTenant = () => {
    if (newTenantName.trim()) {
      const tenant = addTenant(newTenantName.trim(), newTenantAvatar);
      setCurrentTenant(tenant);
      setNewTenantName('');
      setNewTenantAvatar('👤');
      setShowNewTenant(false);
    }
  };
  
  const handleDeleteTenant = (id: string) => {
    deleteTenant(id);
    setShowDeleteConfirm(null);
  };
  
  if (currentTenant) {
    return null; // Don't show selector when a tenant is active
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-mesh">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full glass-card rounded-xl shadow-2xl p-8 md:p-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ rotate: 0, scale: 0.8 }}
            animate={{ rotate: 360, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="inline-block mb-6"
          >
            <div className="p-4 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl shadow-lg">
              <Users size={64} className="text-white" />
            </div>
          </motion.div>
          <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Wähle dein Profil
          </h1>
          <p className="text-dark-300 text-lg">
            Deine Statistiken und Spiele werden separat gespeichert
          </p>
        </div>
        
        <div className="space-y-4 mb-8">
          {tenants.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-xl border border-dark-700">
              <div className="inline-block p-4 bg-dark-800 rounded-full mb-4">
                <Users size={48} className="text-dark-600" />
              </div>
              <p className="text-white font-semibold text-lg">Noch keine Profile vorhanden</p>
              <p className="text-dark-400 text-sm mt-2">Erstelle dein erstes Profil um zu starten</p>
            </div>
          ) : (
            tenants.map((tenant) => (
              <motion.div
                key={tenant.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative group"
              >
                <button
                  onClick={() => setCurrentTenant(tenant)}
                  className="w-full flex items-center gap-5 p-5 glass-card hover:glass-card-hover rounded-xl transition-all border-2 border-dark-700 hover:border-primary-500 shadow-lg"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-4xl shadow-lg">
                    {tenant.avatar}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-2xl font-bold text-white mb-1">{tenant.name}</h3>
                    <p className="text-sm text-dark-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
                      Zuletzt aktiv: {formatDate(tenant.lastActive)}
                    </p>
                  </div>
                  <LogIn size={28} className="text-dark-500 group-hover:text-primary-400 transition-colors" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(tenant.id);
                  }}
                  className="absolute top-3 right-3 p-2.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-red-500/30 hover:border-red-500/50"
                  title="Profil löschen"
                >
                  <Trash2 size={18} className="text-red-400" />
                </button>
                
                {/* Delete Confirmation */}
                <AnimatePresence>
                  {showDeleteConfirm === tenant.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-dark-900/95 backdrop-blur-md rounded-xl flex items-center justify-center p-6 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-center">
                        <div className="inline-block p-3 bg-red-500/20 rounded-full mb-4">
                          <Trash2 size={32} className="text-red-400" />
                        </div>
                        <p className="text-white font-bold text-lg mb-2">
                          Profil "{tenant.name}" wirklich löschen?
                        </p>
                        <p className="text-red-400 text-sm mb-6">
                          ⚠️ Alle Daten gehen unwiderruflich verloren!
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold transition-all shadow-lg"
                          >
                            Löschen
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-6 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-all"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
        
        {!showNewTenant ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewTenant(true)}
            className="w-full py-5 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg"
          >
            <Plus size={28} />
            Neues Profil erstellen
          </motion.button>
        ) : (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="glass-card rounded-xl p-6 space-y-5 border border-dark-700"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Neues Profil</h3>
              <button
                onClick={() => {
                  setShowNewTenant(false);
                  setNewTenantName('');
                  setNewTenantAvatar('👤');
                }}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
              >
                <X size={22} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Avatar wählen
              </label>
              <div className="grid grid-cols-6 gap-3">
                {avatarOptions.map((avatar) => (
                  <motion.button
                    key={avatar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewTenantAvatar(avatar)}
                    className={`p-4 text-3xl rounded-xl transition-all ${
                      newTenantAvatar === avatar
                        ? 'bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg ring-2 ring-primary-400'
                        : 'bg-dark-800 hover:bg-dark-700 border border-dark-700'
                    }`}
                  >
                    {avatar}
                  </motion.button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Profilname
              </label>
              <input
                type="text"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddTenant();
                }}
                placeholder="Dein Name..."
                className="w-full px-4 py-3 bg-dark-800 border-2 border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                autoFocus
              />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddTenant}
              disabled={!newTenantName.trim()}
              className="w-full py-4 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 disabled:from-dark-700 disabled:to-dark-800 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all shadow-lg disabled:shadow-none"
            >
              Profil erstellen
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default TenantSelector;
