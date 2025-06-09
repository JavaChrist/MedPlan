'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signInAnon, getUserProfile, addTreatment, getUserTreatments, auth, testFirebaseConnection } from '@/lib/firebase';
import { useToast } from '@/components/Toast';
import { ArrowLeftIcon, CheckIcon, XIcon, SpinnerIcon } from '@/components/Icons';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function FirebaseTestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const { success: showSuccess, error: showError, ToastContainer } = useToast();

  // Configuration Firebase actuelle
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: string) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, status, message, details } : t);
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Vérification des variables d'environnement
      updateTest('config', 'pending', 'Vérification de la configuration...');
      const missingVars = Object.entries(firebaseConfig)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        updateTest('config', 'error', 'Variables d\'environnement manquantes',
          `Manquant: ${missingVars.join(', ')}`);
        showError('Configuration incomplète', 'Vérifiez votre fichier .env.local');
        setIsRunning(false);
        return;
      } else {
        updateTest('config', 'success', 'Configuration Firebase détectée',
          `Projet: ${firebaseConfig.projectId}`);
      }

      // Test 2: Connexion anonyme
      updateTest('auth', 'pending', 'Test de connexion...');
      try {
        const user = await signInAnon();
        setCurrentUser(user);
        updateTest('auth', 'success', 'Connexion anonyme réussie',
          `UID: ${user.uid.substring(0, 20)}...`);
      } catch (error) {
        updateTest('auth', 'error', 'Échec de la connexion anonyme',
          error instanceof Error ? error.message : 'Erreur inconnue');
        setIsRunning(false);
        return;
      }

      // Test 3: Profil utilisateur
      updateTest('profile', 'pending', 'Test du profil utilisateur...');
      try {
        const profile = await getUserProfile(currentUser?.uid || '');
        updateTest('profile', 'success', 'Profil utilisateur accessible',
          profile ? 'Profil trouvé' : 'Nouveau profil créé');
      } catch (error) {
        updateTest('profile', 'error', 'Erreur profil utilisateur',
          error instanceof Error ? error.message : 'Erreur inconnue');
      }

      // Test 4: Écriture dans Firestore (traitement test)
      updateTest('firestore-write', 'pending', 'Test d\'écriture Firestore...');
      try {
        const testTreatmentId = await addTreatment({
          name: '🧪 Test Firebase',
          dosage: '1 test',
          frequency: 1,
          duration: 1,
          startTime: '12:00',
          endTime: '12:00',
          startDate: new Date(),
          endDate: new Date(),
          isActive: true,
          notes: 'Traitement de test automatique',
          userId: '' // sera rempli automatiquement
        });

        updateTest('firestore-write', 'success', 'Écriture Firestore réussie',
          `ID: ${testTreatmentId.substring(0, 20)}...`);
      } catch (error) {
        updateTest('firestore-write', 'error', 'Échec écriture Firestore',
          error instanceof Error ? error.message : 'Erreur inconnue');
      }

      // Test 5: Lecture depuis Firestore
      updateTest('firestore-read', 'pending', 'Test de lecture Firestore...');
      try {
        const treatments = await getUserTreatments();
        const testTreatments = treatments.filter(t => t.name.includes('🧪 Test Firebase'));

        updateTest('firestore-read', 'success', 'Lecture Firestore réussie',
          `${treatments.length} traitement(s) trouvé(s), ${testTreatments.length} test(s)`);
      } catch (error) {
        updateTest('firestore-read', 'error', 'Échec lecture Firestore',
          error instanceof Error ? error.message : 'Erreur inconnue');
      }

      // Résultat final
      const successCount = tests.filter(t => t.status === 'success').length;
      const totalTests = 5;

      if (successCount === totalTests) {
        showSuccess('Tests Firebase réussis !', 'Votre configuration fonctionne parfaitement.');
      } else {
        showError('Certains tests ont échoué', 'Vérifiez la configuration et consultez le guide.');
      }

    } catch (error) {
      console.error('Erreur globale des tests:', error);
      showError('Erreur durant les tests', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsRunning(false);
    }
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setTests([]);
    setMessage('🔍 Diagnostic Firebase en cours...');

    try {
      updateTest('diagnostic-init', 'pending', 'Initialisation du diagnostic...');

      // Utiliser la nouvelle fonction de diagnostic
      const result = await testFirebaseConnection();

      if (result.configured && result.connected) {
        updateTest('diagnostic-init', 'success', 'Firebase entièrement fonctionnel !',
          `Projet: ${result.details.projectId}, User: ${result.details.userId?.substring(0, 20)}...`);

        showSuccess('Firebase fonctionne parfaitement !', 'Toutes les fonctionnalités sont disponibles.');
        setMessage('✅ Firebase est correctement configuré et connecté ! Vos données sont sauvegardées dans le cloud.');

      } else if (result.configured && !result.connected) {
        updateTest('diagnostic-init', 'error', 'Firebase configuré mais connexion échouée',
          `Erreur: ${result.error} (Code: ${result.details.errorCode})`);

        showError('Problème de connexion Firebase', result.error || 'Erreur inconnue');
        setMessage(`❌ Firebase configuré mais inaccessible: ${result.error}`);

      } else {
        updateTest('diagnostic-init', 'error', 'Firebase non configuré',
          result.error || 'Variables d\'environnement manquantes');

        showError('Firebase non configuré', 'Vérifiez votre fichier .env.local');
        setMessage('⚠️ Firebase non configuré - Application en mode local uniquement.');
      }

      // Afficher les détails techniques
      console.log('🔍 Détails du diagnostic Firebase:', result);

    } catch (error) {
      updateTest('diagnostic-init', 'error', 'Erreur durant le diagnostic',
        error instanceof Error ? error.message : 'Erreur inconnue');

      showError('Erreur de diagnostic', 'Impossible de tester Firebase');
      setMessage('❌ Erreur durant le diagnostic Firebase');
      console.error('Erreur diagnostic:', error);

    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <ToastContainer />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-purple-600 hover:text-purple-800 flex items-center space-x-1">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Retour au dashboard</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">🔥 Test Firebase</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration actuelle */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Configuration détectée</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Projet ID:</span>
              <p className="text-gray-600">{firebaseConfig.projectId || '❌ Non configuré'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Auth Domain:</span>
              <p className="text-gray-600">{firebaseConfig.authDomain || '❌ Non configuré'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">API Key:</span>
              <p className="text-gray-600">
                {firebaseConfig.apiKey ?
                  `${firebaseConfig.apiKey.substring(0, 10)}...` :
                  '❌ Non configuré'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">App ID:</span>
              <p className="text-gray-600">
                {firebaseConfig.appId ?
                  `${firebaseConfig.appId.substring(0, 20)}...` :
                  '❌ Non configuré'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Bouton de test */}
        <div className="text-center mb-8">
          <div className="space-y-4">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              {isRunning ? (
                <span className="flex items-center space-x-3">
                  <SpinnerIcon className="w-6 h-6" />
                  <span>Tests en cours...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-3">
                  <span>🚀</span>
                  <span>Lancer les tests Firebase</span>
                </span>
              )}
            </button>

            <button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <span className="flex items-center space-x-2">
                  <SpinnerIcon className="w-5 h-5" />
                  <span>Diagnostic...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Diagnostic Firebase complet</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Résultats des tests */}
        {tests.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Résultats des tests</h2>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={test.name} className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 mt-1">
                    {test.status === 'pending' && <SpinnerIcon className="w-5 h-5 text-blue-600" />}
                    {test.status === 'success' && <CheckIcon className="w-5 h-5 text-green-600" />}
                    {test.status === 'error' && <XIcon className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {index + 1}. {test.name === 'config' && 'Configuration'}
                      {test.name === 'auth' && 'Authentification'}
                      {test.name === 'profile' && 'Profil utilisateur'}
                      {test.name === 'firestore-write' && 'Écriture Firestore'}
                      {test.name === 'firestore-read' && 'Lecture Firestore'}
                    </h3>
                    <p className={`text-sm ${test.status === 'success' ? 'text-green-600' :
                      test.status === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                      {test.message}
                    </p>
                    {test.details && (
                      <p className="text-xs text-gray-500 mt-1">{test.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guides d'aide */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3">📚 Guides et ressources</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <p>• <strong>Guide complet :</strong> Voir <code>FIREBASE_SETUP.md</code></p>
            <p>• <strong>Template de config :</strong> Voir <code>env-template.txt</code></p>
            <p>• <strong>Console Firebase :</strong> <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline">console.firebase.google.com</a></p>
            <p>• <strong>En cas d'échec :</strong> L'application continue de fonctionner en mode local !</p>
          </div>
        </div>

        {/* Message de diagnostic */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📋 Message de diagnostic</h3>
          <p className="text-sm text-gray-700">{message}</p>
        </div>
      </main>
    </div>
  );
} 