import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, LogIn, Trash2 } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

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
        className="max-w-2xl w-full glass-card rounded-xl shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="inline-block"
          >
            <Users size={64} className="text-green-400 mb-4" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Wähle dein Profil
          </h1>
          <p className="text-gray-300">
            Deine Statistiken und Spiele werden separat gespeichert
          </p>
        </div>
        
        <div className="space-y-3 mb-6">
          {tenants.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Noch keine Profile vorhanden</p>
              <p className="text-sm mt-2">Erstelle dein erstes Profil um zu starten</p>
            </div>
          ) : (
            tenants.map((tenant) => (
              <motion.div
                key={tenant.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="relative group"
              >
                <button
                  onClick={() => setCurrentTenant(tenant)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all border-2 border-transparent hover:border-green-500"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-3xl">
                    {tenant.avatar}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-white">{tenant.name}</h3>
                    <p className="text-sm text-gray-400">
                      Zuletzt aktiv: {new Date(tenant.lastActive).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <LogIn size={24} className="text-gray-400 group-hover:text-green-400 transition-colors" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(tenant.id);
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Profil löschen"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
                
                {/* Delete Confirmation */}
                <AnimatePresence>
                  {showDeleteConfirm === tenant.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center p-4 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-center">
                        <p className="text-white mb-4">
                          Profil "{tenant.name}" wirklich löschen?<br />
                          <span className="text-sm text-red-400">Alle Daten gehen verloren!</span>
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                          >
                            Löschen
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
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
          <button
            onClick={() => setShowNewTenant(true)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={24} />
            Neues Profil erstellen
          </button>
        ) : (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-gray-800/50 rounded-lg p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Neues Profil</h3>
              <button
                onClick={() => {
                  setShowNewTenant(false);
                  setNewTenantName('');
                  setNewTenantAvatar('👤');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar wählen
              </label>
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => setNewTenantAvatar(avatar)}
                    className={`p-3 text-2xl rounded-lg transition-all ${
                      newTenantAvatar === avatar
                        ? 'bg-green-500 scale-110'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddTenant();
                }}
                placeholder="Dein Name..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            
            <button
              onClick={handleAddTenant}
              disabled={!newTenantName.trim()}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
            >
              Profil erstellen
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default TenantSelector;
