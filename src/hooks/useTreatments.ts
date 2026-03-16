import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Treatment, TreatmentTake, DayPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Convertit un champ Firestore (Timestamp/Date/string/number) en Date JS
function coerceDate(value: any, fallback: Date = new Date()): Date {
  try {
    if (value?.toDate) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
  } catch { }
  return fallback;
}

// Vérifie si un traitement doit être pris à une date donnée selon sa fréquence
function isTreatmentActiveOnDate(treatment: Treatment, targetDate: Date): boolean {
  // Vérifier isActive
  if (!treatment.isActive) return false;

  // Normaliser les dates (sans heure) pour comparaison
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const start = new Date(treatment.startDate);
  start.setHours(0, 0, 0, 0);

  // Pas encore commencé
  if (target < start) return false;

  // Traitement terminé
  if (treatment.endDate) {
    const end = new Date(treatment.endDate);
    end.setHours(0, 0, 0, 0);
    if (target > end) return false;
  }

  // Vérifier la fréquence du premier schedule (tous les schedules ont la même fréquence)
  const schedule = treatment.schedules[0];
  if (!schedule) return false;

  const freq = schedule.frequency;

  if (freq === 'daily' || freq === 'as_needed') return true;

  if (freq === 'specific_days') {
    const days = schedule.days || [];
    return days.includes(target.getDay());
  }

  if (freq === 'every_x_days') {
    const interval = schedule.intervalDays || 1;
    const diffDays = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays % interval === 0;
  }

  if (freq === 'cycle') {
    const onDays = schedule.cycleConfig?.onDays || 21;
    const offDays = schedule.cycleConfig?.offDays || 7;
    const cycleLength = onDays + offDays;
    const diffDays = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return (diffDays % cycleLength) < onDays;
  }

  return true;
}

export function useTreatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [takes, setTakes] = useState<TreatmentTake[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Charger les traitements depuis Firestore en temps réel
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const auth = getAuth();

    const attach = (uid: string) => {
      // Eviter un double listener si déjà attaché
      if (unsubscribe) unsubscribe();
      const q = query(
        collection(db, `users/${uid}/treatments`),
        orderBy('createdAt', 'desc')
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Treatment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.name,
            type: data.type,
            dosage: data.dosage,
            quantity: data.quantity ?? 1,
            unit: data.unit,
            color: data.color || '#1DA1F2',
            icon: data.icon,
            schedules: data.schedules || [],
            startDate: coerceDate(data.startDate),
            endDate: data.endDate ? coerceDate(data.endDate) : undefined,
            isActive: data.isActive !== false,
            createdAt: coerceDate(data.createdAt),
            taken: data.taken || {},
            skipped: data.skipped || {},
            subjectId: data.subjectId,
            subjectName: data.subjectName
          } as Treatment);
        });
        setTreatments(list);
        setLoading(false);
      });
    };

    if (currentUser?.uid) {
      attach(currentUser.uid);
    } else {
      const off = onAuthStateChanged(auth, (user) => {
        if (user?.uid) {
          attach(user.uid);
        } else {
          setLoading(false);
          setTreatments([]);
        }
      });
      return () => {
        off();
        if (unsubscribe) unsubscribe();
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.uid]);

  // Générer les prises pour une date donnée (respecte isActive, endDate, startDate, fréquence)
  const generateTakesForDate = (targetDate: Date) => {
    const dateTakes: TreatmentTake[] = [];

    treatments.forEach(treatment => {
      // Ignorer les traitements inactifs, pas encore commencés ou terminés
      if (!isTreatmentActiveOnDate(treatment, targetDate)) return;

      treatment.schedules.forEach(schedule => {
        // Ignorer les schedules "au besoin" (pas de rappel automatique)
        if (schedule.frequency === 'as_needed') return;

        const [hours, minutes] = schedule.time.split(':').map(Number);
        const plannedTime = new Date(targetDate);
        plannedTime.setHours(hours, minutes, 0, 0);

        const existingTake = takes.find(t =>
          t.treatmentId === treatment.id &&
          t.scheduleId === schedule.id &&
          t.plannedTime.toDateString() === targetDate.toDateString()
        );

        if (!existingTake) {
          dateTakes.push({
            id: `take-${treatment.id}-${schedule.id}-${targetDate.getTime()}`,
            treatmentId: treatment.id,
            scheduleId: schedule.id,
            plannedTime,
            status: 'pending',
            createdAt: new Date()
          });
        }
      });
    });

    return dateTakes;
  };

  // Marquer une prise comme prise
  const markAsTaken = (takeId: string) => {
    setTakes(prev => prev.map(take =>
      take.id === takeId
        ? { ...take, status: 'taken' as const, takenTime: new Date() }
        : take
    ));
  };

  // Obtenir les prises pour une date donnée (sécurisé)
  const getTakesForDate = (targetDate: Date) => {
    const dateTakes = takes.filter(take =>
      take.plannedTime.toDateString() === targetDate.toDateString()
    );

    return dateTakes;
  };

  // Générer les prises pour une date (à appeler manuellement)
  const ensureTakesForDate = (targetDate: Date) => {
    const dateTakes = takes.filter(take =>
      take.plannedTime.toDateString() === targetDate.toDateString()
    );

    // Générer si aucune prise n'existe encore pour cette date et qu'il y a des traitements actifs
    const hasActiveTreatments = treatments.some(t => isTreatmentActiveOnDate(t, targetDate));
    if (dateTakes.length === 0 && hasActiveTreatments) {
      const newTakes = generateTakesForDate(targetDate);
      if (newTakes.length > 0) {
        setTakes(prev => [...prev, ...newTakes]);
      }
    }
  };

  return {
    treatments,
    takes,
    loading,
    getTakesForDate,
    ensureTakesForDate,
    markAsTaken,
    setTreatments,
    setTakes
  };
} 