'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function EditTreatmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const treatmentId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si un ID de traitement est fourni
    if (!treatmentId) {
      router.push('/dashboard');
      return;
    }

    setIsLoading(false);
  }, [treatmentId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
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
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Retour au tableau de bord
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">✏️</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Modifier le traitement</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 rounded-t-xl">
            <h2 className="text-xl font-bold text-white">🚧 Fonctionnalité en développement</h2>
            <p className="text-purple-100">Cette page sera bientôt disponible</p>
          </div>

          <div className="p-8 text-center space-y-6">
            <div className="text-6xl mb-4">🔧</div>

            <h3 className="text-2xl font-bold text-gray-900">
              Modification de traitement
            </h3>

            <p className="text-gray-600 max-w-2xl mx-auto">
              La fonctionnalité de modification des traitements existants est en cours de développement.
              En attendant, vous pouvez créer un nouveau traitement et supprimer l&apos;ancien.
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">✨ Fonctionnalités à venir :</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span>📝</span>
                    <span>Modification des détails du médicament</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>⏰</span>
                    <span>Ajustement des horaires de prise</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>Modification de la durée du traitement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🗑️</span>
                    <span>Suppression sécurisée du traitement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Historique des modifications</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <Link
                href="/add-treatment"
                className="flex items-center justify-center p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="text-2xl mr-3">➕</span>
                <span className="font-medium text-green-800">Nouveau traitement</span>
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center justify-center p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl mr-3">📊</span>
                <span className="font-medium text-blue-800">Retour au dashboard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Conseils temporaires */}
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="font-semibold text-orange-800 mb-3">💡 En attendant cette fonctionnalité</h3>
          <div className="space-y-3 text-sm text-orange-700">
            <div className="flex items-start space-x-2">
              <span className="text-orange-600">•</span>
              <p>Pour modifier un traitement, créez-en un nouveau avec les bonnes informations</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-600">•</span>
              <p>Utilisez les paramètres pour ajuster vos préférences de notifications</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-600">•</span>
              <p>Consultez l&apos;historique pour voir vos statistiques d&apos;adhérence</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-600">•</span>
              <p>Contactez le support si vous avez besoin d&apos;aide pour gérer vos traitements</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EditTreatmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <EditTreatmentContent />
    </Suspense>
  );
} 