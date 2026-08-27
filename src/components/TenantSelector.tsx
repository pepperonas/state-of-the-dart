import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, LogIn, Trash2 } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { formatDate } from '../utils/dateUtils';
import { Icon, iconForEmoji } from './icons';

const TenantSelector: React.FC = () => {
  const { tenants, currentTenant, setCurrentTenant, addTenant, deleteTenant } = useTenant();
  const [showNewTenant, setShowNewTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantAvatar, setNewTenantAvatar] = useState('user');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const avatarOptions = ['user', 'target', 'trophy', 'crown', 'flame', 'star', 'wave', 'party', 'rocket', 'gem', 'sparkle', 'bolt'];

  const handleAddTenant = () => {
    if (newTenantName.trim()) {
      const tenant = addTenant(newTenantName.trim(), newTenantAvatar);
      setCurrentTenant(tenant);
      setNewTenantName('');
      setNewTenantAvatar('user');
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
    <div className="min-h-dvh flex items-center justify-center p-4 gradient-mesh">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full m3-card m3-elevated rounded-m3-xl shadow-m3-3 p-8 md:p-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ rotate: 0, scale: 0.8 }}
            animate={{ rotate: 360, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="inline-block mb-6"
          >
            <div className="p-4 bg-primary-container rounded-m3-lg shadow-m3-1">
              <Users size={64} className="text-on-primary-container" />
            </div>
          </motion.div>
          <h1
            className="m3-display-small font-extrabold mb-3"
            style={{
              background: 'linear-gradient(135deg, var(--m3-primary), var(--m3-tertiary))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Wähle dein Profil
          </h1>
          <p className="text-on-surface-variant m3-body-large">
            Deine Statistiken und Spiele werden separat gespeichert
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {tenants.length === 0 ? (
            <div className="text-center py-12 bg-surface-container rounded-m3-lg border border-outline-variant">
              <div className="inline-block p-4 bg-surface-container-high rounded-m3-full mb-4">
                <Users size={48} className="text-on-surface-variant" />
              </div>
              <p className="text-on-surface font-semibold m3-title-medium">Noch keine Profile vorhanden</p>
              <p className="text-on-surface-variant m3-body-small mt-2">Erstelle dein erstes Profil um zu starten</p>
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
                  className="w-full flex items-center gap-5 p-5 bg-surface-container hover:bg-surface-container-high rounded-m3-lg transition-all border border-outline-variant hover:border-[var(--m3-primary)] shadow-m3-1"
                >
                  <div className="w-20 h-20 bg-primary-container rounded-m3-full flex items-center justify-center text-4xl shadow-m3-1">
                    <Icon name={iconForEmoji(tenant.avatar)} size={26} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="m3-title-large font-bold text-on-surface mb-1">{tenant.name}</h3>
                    <p className="m3-body-small text-on-surface-variant flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                      Zuletzt aktiv: {formatDate(tenant.lastActive)}
                    </p>
                  </div>
                  <LogIn size={28} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(tenant.id);
                  }}
                  className="absolute top-3 right-3 p-2.5 bg-error-container hover:opacity-90 rounded-m3-md opacity-0 group-hover:opacity-100 transition-all"
                  title="Profil löschen"
                >
                  <Trash2 size={18} className="text-on-error-container" />
                </button>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {showDeleteConfirm === tenant.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-surface-container-highest rounded-m3-lg flex items-center justify-center p-6 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-center">
                        <div className="inline-block p-3 bg-error-container rounded-m3-full mb-4">
                          <Trash2 size={32} className="text-on-error-container" />
                        </div>
                        <p className="text-on-surface font-bold m3-title-medium mb-2">
                          Profil "{tenant.name}" wirklich löschen?
                        </p>
                        <p className="text-error m3-body-small mb-6">
                          Alle Daten gehen unwiderruflich verloren!
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="px-6 py-2.5 bg-error hover:opacity-90 text-on-error rounded-m3-full font-semibold transition-all shadow-m3-1"
                          >
                            Löschen
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-6 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-full font-semibold transition-all"
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
            className="w-full py-5 bg-primary hover:opacity-90 text-on-primary rounded-m3-full font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-m3-1"
          >
            <Plus size={28} />
            Neues Profil erstellen
          </motion.button>
        ) : (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-surface-container rounded-m3-lg p-6 space-y-5 border border-outline-variant"
          >
            <div className="flex items-center justify-between">
              <h3 className="m3-title-large font-bold text-on-surface">Neues Profil</h3>
              <button
                onClick={() => {
                  setShowNewTenant(false);
                  setNewTenantName('');
                  setNewTenantAvatar('user');
                }}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-m3-md transition-all"
              >
                <X size={22} />
              </button>
            </div>

            <div>
              <label className="block m3-label-large font-semibold text-on-surface mb-3">
                Avatar wählen
              </label>
              <div className="grid grid-cols-6 gap-3">
                {avatarOptions.map((avatar) => (
                  <motion.button
                    key={avatar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewTenantAvatar(avatar)}
                    className={`p-4 text-3xl rounded-m3-md transition-all ${
                      newTenantAvatar === avatar
                        ? 'bg-primary-container shadow-m3-1 ring-2 ring-[var(--m3-primary)]'
                        : 'bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant'
                    }`}
                  >
                    <Icon name={iconForEmoji(avatar)} size={24} />
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block m3-label-large font-semibold text-on-surface mb-3">
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
                className="w-full px-4 py-3 bg-surface-container-high border border-outline rounded-m3-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-[var(--m3-primary)] transition-all"
                autoFocus
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddTenant}
              disabled={!newTenantName.trim()}
              className="w-full py-4 bg-success hover:opacity-90 disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed text-on-success rounded-m3-full font-bold text-lg transition-all shadow-m3-1 disabled:shadow-none"
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
