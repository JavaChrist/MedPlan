'use client';

import { useState } from 'react';
import { useNotificationManager } from './NotificationManager';
import { generateSchedule } from '@/lib/planner';

// Composant exemple pour programmer des rappels de médicaments
export default function MedicationScheduler() {
  const {
    scheduleMedicationReminder,
    cancelScheduledNotification,
    scheduledNotifications,
    hasPermission,
    isReady
  } = useNotificationManager();

  // États pour le formulaire
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [frequency, setFrequency] = useState(3);

  // Fonction pour programmer les rappels d'un traitement
  const scheduleAllReminders = () => {
    if (!medicationName.trim() || !isReady) return;

    // Générer les horaires avec la fonction de planification
    const times = generateSchedule(startHour, endHour, frequency);
    const today = new Date();

    // Programmer une notification pour chaque horaire
    times.forEach((time, index) => {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Si l'heure est passée, programmer pour demain
      if (scheduledTime <= new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      // Programmer le rappel
      const notificationId = scheduleMedicationReminder(
        medicationName,
        scheduledTime,
        dosage
      );

      console.log(`📅 Rappel programmé: ${medicationName} à ${time} (ID: ${notificationId})`);
    });

    // Réinitialiser le formulaire
    setMedicationName('');
    setDosage('');
  };

  // Fonction pour tester une notification immédiate
  const testImmediateNotification = () => {
    const testTime = new Date(Date.now() + 5000); // Dans 5 secondes
    scheduleMedicationReminder(
      medicationName || 'Médicament Test',
      testTime,
      dosage || '1 comprimé'
    );
  };

  if (!hasPermission) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600 text-center">
          🔔 Activez les notifications pour programmer vos rappels de médicaments
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        💊 Programmer un traitement
      </h2>

      {/* Formulaire de traitement */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du médicament
          </label>
          <input
            type="text"
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            placeholder="Ex: Paracétamol"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dosage (optionnel)
          </label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Ex: 1 comprimé, 500mg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure début
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={startHour}
              onChange={(e) => setStartHour(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure fin
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={endHour}
              onChange={(e) => setEndHour(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prises/jour
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Aperçu des horaires */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📅 Horaires calculés :</h4>
          <div className="flex flex-wrap gap-2">
            {generateSchedule(startHour, endHour, frequency).map((time, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {time}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={scheduleAllReminders}
          disabled={!medicationName.trim() || !isReady}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📅 Programmer les rappels
        </button>
        <button
          onClick={testImmediateNotification}
          disabled={!isReady}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🧪 Test (5s)
        </button>
      </div>

      {/* Liste des notifications programmées */}
      {scheduledNotifications.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-medium text-gray-900 mb-4">
            🔔 Rappels programmés ({scheduledNotifications.length})
          </h3>
          <div className="space-y-3">
            {scheduledNotifications.map((notification) => (
              <div key={notification.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.body}</p>
                  <p className="text-xs text-gray-500">
                    ⏰ {notification.scheduledTime.toLocaleString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => cancelScheduledNotification(notification.id)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                  title="Annuler le rappel"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/*
=== EXEMPLES D'UTILISATION DU HOOK ===

// Dans un composant React
const MyComponent = () => {
  const { 
    scheduleMedicationReminder, 
    hasPermission, 
    scheduledNotifications 
  } = useNotificationManager();

  // Programmer un rappel simple
  const scheduleReminder = () => {
    const tomorrow10AM = new Date();
    tomorrow10AM.setDate(tomorrow10AM.getDate() + 1);
    tomorrow10AM.setHours(10, 0, 0, 0);
    
    const id = scheduleMedicationReminder(
      'Paracétamol',
      tomorrow10AM,
      '500mg'
    );
    
    console.log('Rappel programmé avec ID:', id);
  };

  // Programmer plusieurs rappels
  const scheduleMultipleReminders = () => {
    const times = generateSchedule(8, 22, 3); // 8h, 15h, 22h
    const today = new Date();
    
    times.forEach(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      scheduleMedicationReminder('Vitamine D', scheduledTime, '1 comprimé');
    });
  };

  return (
    <div>
      {hasPermission ? (
        <button onClick={scheduleReminder}>
          Programmer rappel
        </button>
      ) : (
        <p>Activez les notifications d'abord</p>
      )}
    </div>
  );
};

=== FIN DES EXEMPLES ===
*/ 