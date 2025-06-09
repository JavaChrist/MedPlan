import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';

// Configuration Firebase - utilise les variables d'environnement
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db = getFirestore(app);

// Types TypeScript pour les données Firestore
export interface Treatment {
  id?: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: number; // prises par jour
  duration: number; // durée en jours
  startTime: string; // format HH:mm
  endTime: string; // format HH:mm
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyDose {
  id?: string;
  userId: string;
  treatmentId: string;
  treatmentName: string;
  dosage: string;
  scheduledTime: string; // format HH:mm
  scheduledDate: Date; // date du jour
  status: 'upcoming' | 'taken' | 'missed' | 'delayed';
  takenAt?: Date; // timestamp exact de la prise
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id?: string;
  email?: string;
  isAnonymous: boolean;
  preferences: {
    notifications: boolean;
    reminderAdvance: number; // minutes avant
    dailyReportTime: string; // format HH:mm
  };
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// FONCTIONS D'AUTHENTIFICATION
// =============================================================================

/**
 * Connexion anonyme pour permettre l'utilisation sans compte
 * @returns Promise<User> Utilisateur Firebase connecté
 */
export async function signInAnon(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    console.log('✅ Connexion anonyme réussie:', result.user.uid);

    // Créer le profil utilisateur si nécessaire
    await createUserProfileIfNeeded(result.user);

    return result.user;
  } catch (error: any) {
    console.error('❌ Erreur connexion anonyme:', error.code, error.message);
    throw new Error(`Connexion anonyme échouée: ${error.message}`);
  }
}

/**
 * Connexion avec email et mot de passe
 * @param email Email de l'utilisateur
 * @param password Mot de passe
 * @returns Promise<User> Utilisateur Firebase connecté
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Connexion email réussie:', result.user.email);

    // Créer le profil utilisateur si nécessaire
    await createUserProfileIfNeeded(result.user);

    return result.user;
  } catch (error: any) {
    console.error('❌ Erreur connexion email:', error.code, error.message);

    // Messages d'erreur en français
    let errorMessage = 'Erreur de connexion';
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Aucun compte trouvé avec cet email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Mot de passe incorrect';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Adresse email invalide';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Trop de tentatives. Réessayez plus tard';
        break;
      default:
        errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Création de compte avec email et mot de passe
 * @param email Email de l'utilisateur
 * @param password Mot de passe
 * @returns Promise<User> Utilisateur Firebase créé
 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Création compte réussie:', result.user.email);

    // Créer le profil utilisateur
    await createUserProfileIfNeeded(result.user);

    return result.user;
  } catch (error: any) {
    console.error('❌ Erreur création compte:', error.code, error.message);

    let errorMessage = 'Erreur de création de compte';
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Un compte existe déjà avec cet email';
        break;
      case 'auth/weak-password':
        errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Adresse email invalide';
        break;
      default:
        errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Déconnexion utilisateur
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    console.log('✅ Déconnexion réussie');
  } catch (error: any) {
    console.error('❌ Erreur déconnexion:', error);
    throw new Error('Erreur lors de la déconnexion');
  }
}

/**
 * Observer des changements d'état d'authentification
 * @param callback Fonction appelée lors des changements d'état
 * @returns Fonction pour se désabonner
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// =============================================================================
// FONCTIONS FIRESTORE - PROFIL UTILISATEUR
// =============================================================================

/**
 * Créer le profil utilisateur s'il n'existe pas
 * @param user Utilisateur Firebase
 */
async function createUserProfileIfNeeded(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const userProfile: Omit<UserProfile, 'id'> = {
      email: user.email || undefined,
      isAnonymous: user.isAnonymous,
      preferences: {
        notifications: true,
        reminderAdvance: 15, // 15 minutes avant
        dailyReportTime: '20:00'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(userRef, userProfile);
    console.log('✅ Profil utilisateur créé');
  }
}

/**
 * Récupérer le profil utilisateur
 * @param userId ID de l'utilisateur
 * @returns Promise<UserProfile | null>
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);
    throw new Error('Erreur lors de la récupération du profil');
  }
}

/**
 * Mettre à jour le profil utilisateur
 * @param userId ID de l'utilisateur
 * @param updates Données à mettre à jour
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date()
    });
    console.log('✅ Profil utilisateur mis à jour');
  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    throw new Error('Erreur lors de la mise à jour du profil');
  }
}

// =============================================================================
// FONCTIONS FIRESTORE - TRAITEMENTS
// =============================================================================

/**
 * Ajouter un nouveau traitement
 * @param treatmentData Données du traitement
 * @returns Promise<string> ID du traitement créé
 */
export async function addTreatment(
  treatmentData: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const treatment: Omit<Treatment, 'id'> = {
      ...treatmentData,
      userId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'treatments'), treatment);
    console.log('✅ Traitement ajouté:', docRef.id);

    // Générer automatiquement les doses pour les premiers jours
    await generateDailyDoses(docRef.id, treatment);

    return docRef.id;
  } catch (error) {
    console.error('❌ Erreur ajout traitement:', error);
    throw new Error('Erreur lors de l\'ajout du traitement');
  }
}

/**
 * Récupérer tous les traitements actifs d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Promise<Treatment[]>
 */
export async function getUserTreatments(userId: string): Promise<Treatment[]> {
  try {
    const q = query(
      collection(db, 'treatments'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const treatments: Treatment[] = [];

    querySnapshot.forEach((doc) => {
      treatments.push({ id: doc.id, ...doc.data() } as Treatment);
    });

    console.log(`✅ ${treatments.length} traitements récupérés`);
    return treatments;
  } catch (error) {
    console.error('❌ Erreur récupération traitements:', error);
    throw new Error('Erreur lors de la récupération des traitements');
  }
}

/**
 * Mettre à jour un traitement
 * @param treatmentId ID du traitement
 * @param updates Données à mettre à jour
 */
export async function updateTreatment(
  treatmentId: string,
  updates: Partial<Omit<Treatment, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  try {
    const treatmentRef = doc(db, 'treatments', treatmentId);
    await updateDoc(treatmentRef, {
      ...updates,
      updatedAt: new Date()
    });
    console.log('✅ Traitement mis à jour');
  } catch (error) {
    console.error('❌ Erreur mise à jour traitement:', error);
    throw new Error('Erreur lors de la mise à jour du traitement');
  }
}

/**
 * Supprimer un traitement (marquer comme inactif)
 * @param treatmentId ID du traitement
 */
export async function deleteTreatment(treatmentId: string): Promise<void> {
  try {
    await updateTreatment(treatmentId, { isActive: false });
    console.log('✅ Traitement supprimé');
  } catch (error) {
    console.error('❌ Erreur suppression traitement:', error);
    throw new Error('Erreur lors de la suppression du traitement');
  }
}

// =============================================================================
// FONCTIONS FIRESTORE - PLANNING QUOTIDIEN
// =============================================================================

/**
 * Récupérer le planning d'un jour spécifique
 * @param date Date pour laquelle récupérer le planning (optionnel, défaut: aujourd'hui)
 * @returns Promise<DailyDose[]> Liste des prises du jour
 */
export async function getTodaySchedule(date?: Date): Promise<DailyDose[]> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'dailyDoses'),
      where('userId', '==', user.uid),
      where('scheduledDate', '>=', startOfDay),
      where('scheduledDate', '<=', endOfDay),
      orderBy('scheduledDate'),
      orderBy('scheduledTime')
    );

    const querySnapshot = await getDocs(q);
    const doses: DailyDose[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      doses.push({
        id: doc.id,
        ...data,
        scheduledDate: data.scheduledDate?.toDate() || new Date(),
        takenAt: data.takenAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as DailyDose);
    });

    console.log(`✅ ${doses.length} doses récupérées pour ${targetDate.toDateString()}`);
    return doses;
  } catch (error) {
    console.error('❌ Erreur récupération planning:', error);
    throw new Error('Erreur lors de la récupération du planning');
  }
}

/**
 * Marquer une dose comme prise
 * @param doseId ID de la dose
 * @param takenAt Timestamp de la prise (optionnel, défaut: maintenant)
 * @param notes Notes optionnelles
 */
export async function markDoseAsTaken(
  doseId: string,
  takenAt?: Date,
  notes?: string
): Promise<void> {
  try {
    const doseRef = doc(db, 'dailyDoses', doseId);
    await updateDoc(doseRef, {
      status: 'taken',
      takenAt: takenAt || new Date(),
      notes: notes || undefined,
      updatedAt: new Date()
    });
    console.log('✅ Dose marquée comme prise');
  } catch (error) {
    console.error('❌ Erreur marquage dose:', error);
    throw new Error('Erreur lors du marquage de la dose');
  }
}

/**
 * Marquer une dose comme oubliée
 * @param doseId ID de la dose
 * @param notes Notes optionnelles
 */
export async function markDoseAsMissed(doseId: string, notes?: string): Promise<void> {
  try {
    const doseRef = doc(db, 'dailyDoses', doseId);
    await updateDoc(doseRef, {
      status: 'missed',
      notes: notes || undefined,
      updatedAt: new Date()
    });
    console.log('✅ Dose marquée comme oubliée');
  } catch (error) {
    console.error('❌ Erreur marquage dose oubliée:', error);
    throw new Error('Erreur lors du marquage de la dose');
  }
}

/**
 * Reporter une dose (marquer comme retardée)
 * @param doseId ID de la dose
 * @param notes Notes optionnelles
 */
export async function markDoseAsDelayed(doseId: string, notes?: string): Promise<void> {
  try {
    const doseRef = doc(db, 'dailyDoses', doseId);
    await updateDoc(doseRef, {
      status: 'delayed',
      notes: notes || undefined,
      updatedAt: new Date()
    });
    console.log('✅ Dose marquée comme retardée');
  } catch (error) {
    console.error('❌ Erreur marquage dose retardée:', error);
    throw new Error('Erreur lors du marquage de la dose');
  }
}

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Générer automatiquement les doses quotidiennes pour un traitement
 * @param treatmentId ID du traitement
 * @param treatment Données du traitement
 * @param daysToGenerate Nombre de jours à générer (défaut: 7)
 */
async function generateDailyDoses(
  treatmentId: string,
  treatment: Omit<Treatment, 'id'>,
  daysToGenerate: number = 7
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const startDate = new Date(treatment.startDate);

    for (let day = 0; day < daysToGenerate; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      // Vérifier si on dépasse la date de fin
      if (currentDate > treatment.endDate) {
        break;
      }

      // Générer les horaires avec la fonction de planification
      const { generateSchedule } = await import('./planner');
      const startHour = parseInt(treatment.startTime.split(':')[0]);
      const endHour = parseInt(treatment.endTime.split(':')[0]);
      const times = generateSchedule(startHour, endHour, treatment.frequency);

      // Créer une dose pour chaque horaire
      times.forEach((time) => {
        const doseRef = doc(collection(db, 'dailyDoses'));
        const dose: Omit<DailyDose, 'id'> = {
          userId: treatment.userId,
          treatmentId: treatmentId,
          treatmentName: treatment.name,
          dosage: treatment.dosage,
          scheduledTime: time,
          scheduledDate: currentDate,
          status: 'upcoming',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        batch.set(doseRef, dose);
      });
    }

    await batch.commit();
    console.log(`✅ ${daysToGenerate} jours de doses générés pour le traitement`);
  } catch (error) {
    console.error('❌ Erreur génération doses:', error);
    throw new Error('Erreur lors de la génération des doses');
  }
}

/**
 * Calculer les statistiques d'adhérence pour une période
 * @param userId ID de l'utilisateur
 * @param startDate Date de début
 * @param endDate Date de fin
 * @returns Promise<object> Statistiques d'adhérence
 */
export async function getAdherenceStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  delayedDoses: number;
  adherenceRate: number;
}> {
  try {
    const q = query(
      collection(db, 'dailyDoses'),
      where('userId', '==', userId),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate)
    );

    const querySnapshot = await getDocs(q);
    let totalDoses = 0;
    let takenDoses = 0;
    let missedDoses = 0;
    let delayedDoses = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalDoses++;

      switch (data.status) {
        case 'taken':
          takenDoses++;
          break;
        case 'missed':
          missedDoses++;
          break;
        case 'delayed':
          delayedDoses++;
          break;
      }
    });

    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    return {
      totalDoses,
      takenDoses,
      missedDoses,
      delayedDoses,
      adherenceRate
    };
  } catch (error) {
    console.error('❌ Erreur calcul statistiques:', error);
    throw new Error('Erreur lors du calcul des statistiques');
  }
}

// Export par défaut
export default app; 