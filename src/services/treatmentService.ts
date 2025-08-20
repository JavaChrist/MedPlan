import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Treatment } from '../types';

/**
 * Ajoute un nouveau traitement pour un utilisateur
 */
export async function addTreatment(userId: string, treatment: Treatment): Promise<string> {
  try {
    const userTreatmentsRef = collection(db, 'users', userId, 'treatments');

    // Préparer les données avec timestamps
    const treatmentData = {
      ...treatment,
      startDate: new Date(treatment.startDate),
      endDate: treatment.endDate ? new Date(treatment.endDate) : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(userTreatmentsRef, treatmentData);
    console.log('Traitement ajouté avec ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout du traitement:', error);
    // Propager l'erreur Firebase pour conserver error.code et error.message
    throw error;
  }
}

/**
 * Récupère tous les traitements d'un utilisateur
 */
export async function getTreatments(userId: string): Promise<Treatment[]> {
  try {
    const userTreatmentsRef = collection(db, 'users', userId, 'treatments');
    const q = query(userTreatmentsRef, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const treatments: Treatment[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Convertir les timestamps en dates
      const treatment: Treatment = {
        id: doc.id,
        name: data.name,
        type: data.type,
        dosage: data.dosage,
        unit: data.unit,
        color: data.color || '#1DA1F2',
        icon: data.icon,
        schedules: data.schedules || [],
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || undefined,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate() || new Date()
      };

      treatments.push(treatment);
    });

    return treatments;
  } catch (error: any) {
    console.error('Erreur lors de la récupération des traitements:', error);
    throw error;
  }
}

/**
 * Met à jour un traitement
 */
export async function updateTreatment(
  userId: string,
  treatmentId: string,
  data: Partial<Treatment>
): Promise<void> {
  try {
    const treatmentRef = doc(db, 'users', userId, 'treatments', treatmentId);

    // Préparer les données de mise à jour
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now()
    };

    // Convertir les dates si présentes
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    await updateDoc(treatmentRef, updateData);
    console.log('Traitement mis à jour:', treatmentId);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du traitement:', error);
    throw error;
  }
}

/**
 * Supprime un traitement
 */
export async function deleteTreatment(userId: string, treatmentId: string): Promise<void> {
  try {
    const treatmentRef = doc(db, 'users', userId, 'treatments', treatmentId);
    await deleteDoc(treatmentRef);
    console.log('Traitement supprimé:', treatmentId);
  } catch (error: any) {
    console.error('Erreur lors de la suppression du traitement:', error);
    throw error;
  }
}

/**
 * Active/désactive un traitement
 */
export async function toggleTreatmentStatus(
  userId: string,
  treatmentId: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateTreatment(userId, treatmentId, { isActive });
    console.log(`Traitement ${isActive ? 'activé' : 'désactivé'}:`, treatmentId);
  } catch (error: any) {
    console.error('Erreur lors du changement de statut:', error);
    throw error;
  }
} 