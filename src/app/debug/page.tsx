'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/Icons';

interface StoredTreatment {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export default function DebugPage() {
  const [treatments, setTreatments] = useState<StoredTreatment[]>([]);
  const [stableUserId, setStableUserId] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = () => {
    const storedTreatments = localStorage.getItem('treatments');
    const userId = localStorage.getItem('medplan_anonymous_user_id') || '';

    setStableUserId(userId);
    setTreatments(storedTreatments ? JSON.parse(storedTreatments) : []);
  };

  const migrateAllTreatments = () => {
    if (!stableUserId) {
      setMessage('❌ Aucun ID utilisateur stable trouvé');
      return;
    }

    const updatedTreatments = treatments.map(treatment => ({
      ...treatment,
      userId: stableUserId
    }));

    localStorage.setItem('treatments', JSON.stringify(updatedTreatments));
    setMessage('✅ Tous les traitements ont été migrés vers l\'ID utilisateur stable');
    loadDebugData();
  };

  const clearAllData = () => {
    if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les données ?')) {
      localStorage.removeItem('treatments');
      localStorage.removeItem('medplan_anonymous_user_id');
      setMessage('🗑️ Toutes les données ont été supprimées');
      loadDebugData();
    }
  };

  const createStableUserId = () => {
    const newId = 'anonymous-local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('medplan_anonymous_user_id', newId);
    setMessage('🆕 Nouvel ID utilisateur stable créé : ' + newId);
    loadDebugData();
  };

  const fixTreatmentDates = () => {
    if (!stableUserId) {
      setMessage('❌ Aucun ID utilisateur stable trouvé');
      return;
    }

    const updatedTreatments = treatments.map(treatment => {
      if (treatment.userId === stableUserId && treatment.startDate) {
        // Corriger les dates en retirant un jour si elles semblent avoir été créées avec un décalage UTC
        const startDate = new Date(treatment.createdAt);
        const treatmentStartDate = new Date(treatment.startDate);

        // Si la date de début du traitement est le lendemain de la création, la corriger
        const creationDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const treatmentDate = new Date(treatmentStartDate.getFullYear(), treatmentStartDate.getMonth(), treatmentStartDate.getDate());

        if (treatmentDate > creationDate && treatment.endDate) {
          // Reculer d'un jour
          const correctedStartDate = new Date(treatmentStartDate);
          correctedStartDate.setDate(correctedStartDate.getDate() - 1);

          const correctedEndDate = new Date(treatment.endDate);
          correctedEndDate.setDate(correctedEndDate.getDate() - 1);

          return {
            ...treatment,
            startDate: correctedStartDate.toISOString(),
            endDate: correctedEndDate.toISOString()
          };
        }
      }
      return treatment;
    });

    localStorage.setItem('treatments', JSON.stringify(updatedTreatments));
    setMessage('✅ Dates des traitements corrigées (décalage UTC)');
    loadDebugData();
  };

  const userGroups = treatments.reduce((groups, treatment) => {
    const userId = treatment.userId;
    if (!groups[userId]) groups[userId] = [];
    groups[userId].push(treatment);
    return groups;
  }, {} as Record<string, StoredTreatment[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <header className="bg-white shadow-sm border-b border-red-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-red-600 hover:text-red-800 flex items-center space-x-1">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Retour au dashboard</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">🛠️ Débogage localStorage</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">{message}</p>
          </div>
        )}

        {/* Informations générales */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Informations générales</h2>
          <div className="space-y-2">
            <p><strong>ID utilisateur stable :</strong> <code className="bg-gray-100 px-2 py-1 rounded">{stableUserId || 'Non défini'}</code></p>
            <p><strong>Nombre total de traitements :</strong> {treatments.length}</p>
            <p><strong>Traitements actifs :</strong> {treatments.filter(t => t.isActive !== false).length}</p>
            <p><strong>Groupes d&apos;utilisateurs :</strong> {Object.keys(userGroups).length}</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Actions rapides</h2>
          <div className="space-y-3">
            {!stableUserId && (
              <button
                onClick={createStableUserId}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🆕 Créer un ID utilisateur stable
              </button>
            )}

            {stableUserId && treatments.some(t => t.userId !== stableUserId) && (
              <button
                onClick={migrateAllTreatments}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                🔄 Migrer tous les traitements vers l&apos;ID stable
              </button>
            )}

            {stableUserId && treatments.some(t => t.userId === stableUserId && t.startDate) && (
              <button
                onClick={fixTreatmentDates}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                📅 Corriger les dates des traitements (décalage UTC)
              </button>
            )}

            <button
              onClick={clearAllData}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Supprimer toutes les données (DANGEREUX)
            </button>
          </div>
        </div>

        {/* Détail par utilisateur */}
        {Object.keys(userGroups).length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">👥 Traitements par utilisateur</h2>

            {Object.entries(userGroups).map(([userId, userTreatments]) => (
              <div key={userId} className="mb-6 p-4 border rounded-lg">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-800">
                    {userId === stableUserId ? '✅ ' : '⚠️ '}
                    ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{userId}</code>
                  </h3>
                  <p className="text-sm text-gray-600">
                    {userId === stableUserId ? 'ID utilisateur actuel (correct)' : 'ID utilisateur obsolète'}
                  </p>
                  <p className="text-sm text-gray-600">{userTreatments.length} traitement(s)</p>
                </div>

                <div className="space-y-2">
                  {userTreatments.map(treatment => (
                    <div key={treatment.id} className="p-3 bg-gray-50 rounded border-l-4 border-l-blue-400">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{treatment.name}</p>
                          <p className="text-xs text-gray-500">ID: {treatment.id}</p>
                          <p className="text-xs text-gray-500">Créé: {new Date(treatment.createdAt).toLocaleString('fr-FR')}</p>
                          {treatment.startDate && (
                            <p className="text-xs text-gray-500">
                              Début: {new Date(treatment.startDate).toLocaleDateString('fr-FR')}
                              {treatment.endDate && ` → Fin: ${new Date(treatment.endDate).toLocaleDateString('fr-FR')}`}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${treatment.isActive !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {treatment.isActive !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {treatments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune donnée trouvée</h2>
            <p className="text-gray-600">Le localStorage ne contient aucun traitement.</p>
          </div>
        )}
      </main>
    </div>
  );
} 