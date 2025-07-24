import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Treatment, TreatmentTake, DayPlan } from '../types';

export function useTreatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [takes, setTakes] = useState<TreatmentTake[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les traitements depuis Firestore en temps réel
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
          createdAt: data.createdAt?.toDate() || new Date(),
          taken: data.taken || {}
        } as Treatment);
      });
      setTreatments(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Générer les prises pour une date donnée
  const generateTakesForDate = (targetDate: Date) => {
    const dateTakes: TreatmentTake[] = [];

    treatments.forEach(treatment => {
      treatment.schedules.forEach(schedule => {
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

    // Si pas de prises générées pour cette date, les générer
    if (dateTakes.length === 0 && treatments.length > 0) {
      const newTakes = generateTakesForDate(targetDate);
      setTakes(prev => [...prev, ...newTakes]);
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