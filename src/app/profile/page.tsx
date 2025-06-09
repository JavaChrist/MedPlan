'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  onAuthChange,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getUserProfile
} from '@/lib/firebase';
import type { User } from 'firebase/auth';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('return');

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'profile'>('profile');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Observer l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setIsLoading(false);
      if (user) {
        setAuthMode('profile');
        if (user.email) {
          setFormData(prev => ({ ...prev, email: user.email || '' }));
        }

        // Rediriger vers la page d'origine si spécifiée
        if (returnUrl) {
          console.log('Redirection vers:', returnUrl);
          router.push(returnUrl);
        }
      }
    });

    return () => unsubscribe();
  }, [returnUrl, router]);



  // Connexion avec email
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await signInWithEmail(formData.email, formData.password);
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Création de compte
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await signUpWithEmail(formData.email, formData.password);
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Déconnexion
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setFormData({ email: '', password: '' });
      setAuthMode('signin');
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  };

  // Gestion des changements de formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={user ? "/dashboard" : "/"} className="text-blue-600 hover:text-blue-800">
                ← Retour {user ? "au tableau de bord" : "à l'accueil"}
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">👤</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user ? 'Mon Profil' : 'Connexion'}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          /* Profil connecté */
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 rounded-t-xl text-white text-center">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">👤</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {user.isAnonymous ? 'Utilisateur Anonyme' : 'Profil Utilisateur'}
              </h2>
              <p className="text-indigo-100">
                {user.email || 'Compte temporaire sans email'}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations du compte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de compte
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">
                      {user.isAnonymous ? '🔒' : '📧'}
                    </span>
                    <span className="text-gray-900">
                      {user.isAnonymous ? 'Compte anonyme' : 'Compte permanent'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <p className="text-gray-900">
                    {user.email || 'Aucune adresse email'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Identifiant
                  </label>
                  <p className="text-gray-500 text-sm font-mono">
                    {user.uid.substring(0, 12)}...
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Création du compte
                  </label>
                  <p className="text-gray-900">
                    {user.metadata.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR')
                      : 'Date inconnue'
                    }
                  </p>
                </div>
              </div>

              {/* Avantages du compte permanent */}
              {user.isAnonymous && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-800 mb-3">
                    💡 Pourquoi créer un compte permanent ?
                  </h3>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex items-center space-x-2">
                      <span>✅</span>
                      <span>Synchronisation sur tous vos appareils</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>✅</span>
                      <span>Sauvegarde sécurisée de vos données</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>✅</span>
                      <span>Récupération en cas de perte d'appareil</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>✅</span>
                      <span>Notifications par email</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuthMode('signup')}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📧 Créer un compte permanent
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/settings"
                    className="flex items-center justify-center p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <span className="text-2xl mr-3">⚙️</span>
                    <span className="font-medium text-orange-800">Paramètres</span>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <span className="text-2xl mr-3">🚪</span>
                    <span className="font-medium text-red-800">Se déconnecter</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Interface de connexion */
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-6 rounded-t-xl">
              <h2 className="text-2xl font-bold text-white text-center">
                {authMode === 'signup' ? '📧 Créer un compte' : '🔑 Se connecter'}
              </h2>
              <p className="text-indigo-100 text-center mt-2">
                {authMode === 'signup'
                  ? 'Créez votre compte avec email et mot de passe'
                  : returnUrl
                    ? 'Connectez-vous pour continuer'
                    : 'Connectez-vous à votre compte MedPlan'
                }
              </p>
            </div>

            <div className="p-6">
              {/* Messages d'erreur */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800">❌ {errors.submit}</p>
                </div>
              )}



              {/* Formulaire email/password */}
              <form onSubmit={authMode === 'signup' ? handleSignUp : handleEmailSignIn}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      placeholder="••••••••"
                    />
                    {authMode === 'signup' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum 6 caractères
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {authMode === 'signup' ? 'Création...' : 'Connexion...'}
                      </span>
                    ) : (
                      authMode === 'signup' ? '📧 Créer le compte' : '🔑 Se connecter'
                    )}
                  </button>
                </div>
              </form>

              {/* Basculer entre connexion et inscription */}
              <div className="text-center mt-6">
                <button
                  onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  {authMode === 'signup'
                    ? 'Déjà un compte ? Se connecter'
                    : 'Pas de compte ? Créer un compte'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sécurité et confidentialité */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-800 mb-3">🛡️ Sécurité et confidentialité</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
            <div className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <p>Vos données médicales sont chiffrées et sécurisées</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <p>Conformité RGPD et protection des données</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <p>Aucun partage avec des tiers sans votre accord</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <p>Vous gardez le contrôle total de vos informations</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 