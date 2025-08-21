import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { updateTreatment } from '../services/treatmentService';
import {
  requestNotificationPermission,
  scheduleMultipleNotifications,
  areNotificationsEnabled,
  testNotification,
  notificationService
} from '../services/notificationService';
import { Treatment } from '../types';
import { Plus, Check, Clock, Pill, Circle, Droplets, Syringe, Tablets, Beaker, Zap, Eye, Headphones, Package, Star, Square, Wind, Bell, BellOff } from 'lucide-react';
import Toast from '../components/ui/Toast';

export default function Home() {
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // États pour les toasts
  const [toast, setToast] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: ''
  });

  // Demander les permissions de notifications au montage
  useEffect(() => {
    const initializeNotifications = async () => {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);

      if (granted) {
        showToast('success', 'Notifications activées', 'Vous recevrez des rappels pour vos traitements');
      }
    };

    initializeNotifications();
  }, []);

  // Écouter les messages du service worker pour le marquage depuis les notifications
  useEffect(() => {
    const handleTreatmentTakenFromNotification = async (event: CustomEvent) => {
      const { treatmentId, treatmentName, notificationId } = event.detail;

      try {
        const user = getAuth().currentUser;
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const treatment = treatments.find(t => t.id === treatmentId);

        if (treatment) {
          const newTaken = {
            ...treatment.taken,
            [today]: true
          };

          await updateTreatment(user.uid, treatment.id!, {
            taken: newTaken
          });

          // Marquer la notification comme traitée
          await notificationService.markNotificationTaken(notificationId);

          showToast('success', 'Traitement pris !', `${treatmentName} marqué depuis la notification`);
        }
      } catch (error) {
        console.error('Erreur marquage depuis notification:', error);
        showToast('error', 'Erreur', 'Impossible de marquer le traitement comme pris');
      }
    };

    window.addEventListener('treatment-taken-from-notification', handleTreatmentTakenFromNotification as EventListener);

    return () => {
      window.removeEventListener('treatment-taken-from-notification', handleTreatmentTakenFromNotification as EventListener);
    };
  }, [treatments]);

  // Récupération en temps réel depuis Firestore
  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/treatments`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Treatment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          dosage: data.dosage,
          unit: data.unit,
          color: data.color || '#1DA1F2',
          icon: data.icon,
          schedules: data.schedules || [],
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate(),
          isActive: data.isActive !== false,
          createdAt: (data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())),
          taken: data.taken || {}
        } as Treatment);
      });
      setTreatments(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Planifier les notifications quand les traitements changent
  useEffect(() => {
    if (treatments.length > 0 && notificationsEnabled) {
      const scheduleTreatmentNotifications = async () => {
        try {
          await scheduleMultipleNotifications(treatments);
          console.log('Notifications planifiées pour tous les traitements');
        } catch (error) {
          console.error('Erreur planification notifications:', error);
        }
      };

      scheduleTreatmentNotifications();
    }
  }, [treatments, notificationsEnabled]);

  // Obtenir la date d'aujourd'hui au format ISO
  const today = new Date().toISOString().split('T')[0];

  // Filtrer les traitements pour aujourd'hui
  const getTreatmentsForToday = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return treatments.filter(treatment => {
      if (!treatment.isActive) return false;

      const startDate = new Date(treatment.startDate);
      const endDate = treatment.endDate ? new Date(treatment.endDate) : null;

      // Vérifier si le traitement est dans la période
      if (startDate > todayStart) return false;
      if (endDate && endDate < todayStart) return false;

      // Vérifier selon la fréquence
      if (!treatment.schedules || treatment.schedules.length === 0) return false;

      const schedule = treatment.schedules[0]; // Prendre le premier schedule pour la logique

      switch (schedule.frequency) {
        case 'daily':
          return true;
        case 'specific_days':
          const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
          const todayName = dayNames[now.getDay()];
          return schedule.days?.includes(todayName) || false;
        case 'every_x_days':
          const daysDiff = Math.floor((todayStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff % (schedule.intervalDays || 1) === 0;
        case 'cycle':
          const totalDays = (schedule.cycleConfig?.on || 0) + (schedule.cycleConfig?.off || 0);
          if (totalDays === 0) return false;
          const cycleDay = Math.floor((todayStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) % totalDays;
          return cycleDay < (schedule.cycleConfig?.on || 0);
        case 'as_needed':
          return false; // Les traitements "au besoin" ne s'affichent pas automatiquement
        default:
          return false;
      }
    });
  };

  // Obtenir les prochaines prises pour aujourd'hui
  const getNextTimes = (treatment: Treatment) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return treatment.schedules
      .map(schedule => schedule.time)
      .filter(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        return timeInMinutes >= currentTime;
      })
      .sort();
  };

  // Fonction helper pour afficher les toasts
  const showToast = (type: 'success' | 'error' | 'warning', title: string, message?: string) => {
    setToast({
      isOpen: true,
      type,
      title,
      message: message || ''
    });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  // Marquer un traitement comme pris
  const markAsTaken = async (treatment: Treatment) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;

      const newTaken = {
        ...treatment.taken,
        [today]: true
      };

      await updateTreatment(user.uid, treatment.id!, {
        taken: newTaken
      });

      showToast('success', 'Traitement pris !', `${treatment.name} marqué comme pris`);
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
      showToast('error', 'Erreur de mise à jour', 'Impossible de marquer le traitement comme pris');
    }
  };

  // Icône pour la forme visuelle
  const getFormIcon = (icon: string) => {
    const iconMap: { [key: string]: any } = {
      'pill': Pill,
      'circle': Circle,
      'droplets': Droplets,
      'syringe': Syringe,
      'tablets': Tablets,
      'beaker': Beaker,
      'zap': Zap,
      'eye': Eye,
      'headphones': Headphones,
      'package': Package,
      'star': Star,
      'square': Square,
      'wind': Wind
    };

    const IconComponent = iconMap[icon] || Circle;
    return <IconComponent className="w-6 h-6 text-white" />;
  };

  const todayTreatments = getTreatmentsForToday();
  const pendingTreatments = todayTreatments.filter(t => !t.taken?.[today]);
  const takenTreatments = todayTreatments.filter(t => t.taken?.[today]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Traitements</h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Indicateur notifications */}
          <div className="flex items-center space-x-2">
            {notificationsEnabled ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-green-400">
                  <Bell className="w-4 h-4" />
                  <span className="text-xs">Actives</span>
                </div>
                {/* Bouton test notification */}
                <button
                  onClick={() => {
                    testNotification();
                    showToast('success', 'Test envoyé', 'Notification de test affichée');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors border border-blue-400/30 px-2 py-1 rounded-lg"
                >
                  Test
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setNotificationsEnabled(granted);
                  if (granted) {
                    showToast('success', 'Notifications activées', 'Vous recevrez maintenant des rappels');
                  } else {
                    showToast('warning', 'Notifications refusées', 'Activez-les dans les paramètres du navigateur');
                  }
                }}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <BellOff className="w-4 h-4" />
                <span className="text-xs">Inactives</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* Section À prendre */}
        {pendingTreatments.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-white">À prendre</h2>
            <div className="space-y-3">
              {pendingTreatments.map((treatment) => {
                const nextTimes = getNextTimes(treatment);
                return (
                  <div
                    key={treatment.id}
                    className="bg-gray-800 rounded-2xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Icône */}
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        {getFormIcon(treatment.icon)}
                      </div>

                      {/* Info traitement */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{treatment.name}</h3>
                        <p className="text-sm text-gray-400">
                          {treatment.dosage} {treatment.unit}
                        </p>
                        {nextTimes.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">
                              Prochaine prise : {nextTimes.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bouton marquer comme pris */}
                      <button
                        onClick={() => markAsTaken(treatment)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0"
                      >
                        Marquer comme pris
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Pris aujourd'hui */}
        {takenTreatments.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-white">Pris aujourd'hui</h2>
            <div className="space-y-3">
              {takenTreatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="bg-gray-800 rounded-2xl p-4 border border-gray-700 opacity-60"
                >
                  <div className="flex items-center space-x-4">
                    {/* Icône */}
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      {getFormIcon(treatment.icon)}
                    </div>

                    {/* Info traitement */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{treatment.name}</h3>
                      <p className="text-sm text-gray-400">
                        {treatment.dosage} {treatment.unit}
                      </p>
                    </div>

                    {/* Coche verte */}
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message si aucun traitement */}
        {todayTreatments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              Aucun traitement aujourd'hui
            </h3>
            <p className="text-gray-500 mb-6">
              Ajoutez vos traitements pour commencer le suivi
            </p>
            <button
              onClick={() => navigate('/add-treatment')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Ajouter un traitement
            </button>
          </div>
        )}

        {/* Espacement pour le FAB */}
        <div className="h-20"></div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/add-treatment')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Toast pour les notifications */}
      <Toast
        isOpen={toast.isOpen}
        onClose={closeToast}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        autoClose={true}
        duration={3000}
      />
    </div>
  );
} 