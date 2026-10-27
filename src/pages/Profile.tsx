import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TabBar from '../components/layout/TabBar';
import { getUserProfile, upsertUserProfile } from '../services/userService';
import { updateProfile } from 'firebase/auth';
import { User, Phone, Mail, LogOut, Save, X } from 'lucide-react';

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setDisplayName(currentUser.displayName || '');
    (async () => {
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile?.phone) {
          setPhone(profile.phone);
          setOriginalPhone(profile.phone);
        }
      } catch { }
    })();
  }, [currentUser?.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      setSaving(true);
      if (displayName !== (currentUser.displayName || '')) {
        await updateProfile(currentUser, { displayName });
      }
      await upsertUserProfile(currentUser.uid, { displayName, phone });
      setOriginalPhone(phone);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-28 pt-6">
      <h1 className="text-xl font-bold text-white mb-6">Compte</h1>

      {/* Avatar / nom */}
      <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-900 rounded-2xl border border-gray-800">
        <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{displayName || 'Sans nom'}</p>
          <p className="text-sm text-gray-400 truncate">{currentUser?.email}</p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSave} className="space-y-4 mb-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Nom */}
          <div className="px-4 py-3 border-b border-gray-800">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nom complet</label>
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom complet"
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm py-1"
              />
            </div>
          </div>
          {/* Email (lecture seule) */}
          <div className="px-4 py-3 border-b border-gray-800">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Email</label>
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400 text-sm">{currentUser?.email}</span>
            </div>
          </div>
          {/* Téléphone */}
          <div className="px-4 py-3">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Téléphone</label>
            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+32 470 00 00 00"
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm py-1"
              />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl font-medium text-sm min-h-[44px] transition-colors bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setDisplayName(currentUser?.displayName || ''); setPhone(originalPhone); }}
            className="px-4 py-3.5 rounded-xl font-medium text-sm min-h-[44px] transition-colors bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Infos compte */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Statut</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Actif
          </span>
        </div>
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Membre depuis</p>
          <p className="text-sm text-white">
            {currentUser?.metadata?.creationTime
              ? new Date(currentUser.metadata.creationTime).toLocaleDateString('fr-FR')
              : 'Non disponible'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Dernière connexion</p>
          <p className="text-sm text-white">
            {currentUser?.metadata?.lastSignInTime
              ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('fr-FR')
              : 'Non disponible'}
          </p>
        </div>
      </div>

      {/* Déconnexion */}
      <button
        onClick={async () => { await logout(); navigate('/login'); }}
        className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-medium text-sm min-h-[44px] transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Se déconnecter</span>
      </button>

      <TabBar active="account" />
    </div>
  );
}
