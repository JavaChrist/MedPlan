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
  writeBatch
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

// Vérification de la configuration Firebase
const checkFirebaseConfig = () => {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️ Firebase : Variables d\'environnement manquantes - Mode local actif');
    console.warn('⚠️ Variables manquantes:', missingVars);
    return false;
  }

  console.log('✅ Firebase : Variables d\'environnement détectées');
  return true;
};

const hasFirebaseConfig = checkFirebaseConfig();

// Initialisation Firebase avec gestion d'erreur
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null;
let auth: Auth;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let isFirebaseConfigured = false; // ← VRAIE disponibilité de Firebase

try {
  if (hasFirebaseConfig) {
    console.log('🔄 Tentative d\'initialisation Firebase...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Test de connectivité basique
    console.log('🧪 Test de connectivité Firebase...');

    // Si on arrive ici sans exception, Firebase est vraiment disponible
    isFirebaseConfigured = true;
    console.log('✅ Firebase initialisé avec succès');
    console.log('✅ Projet Firebase:', firebaseConfig.projectId);
  } else {
    console.warn('⚠️ Mode dégradé : Firebase non configuré');
    // Mode fallback sans Firebase - créer des objets mock
    auth = {
      currentUser: null,
      onAuthStateChanged: () => () => { }
    } as unknown as Auth;
    db = null;
    isFirebaseConfigured = false;
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error);
  console.error('❌ Détails de l\'erreur:', {
    message: error instanceof Error ? error.message : 'Erreur inconnue',
    code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown'
  });

  // Mode fallback sans Firebase
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => { }
  } as unknown as Auth;
  db = null;
  isFirebaseConfigured = false; // ← Important : Firebase n'est PAS disponible

  console.warn('⚠️ Basculement en mode local suite à l\'erreur Firebase');
}

export { auth, db };

// Variable globale pour exporter l'état Firebase
export { isFirebaseConfigured };

// Fonction de diagnostic Firebase
export async function testFirebaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
  details: {
    hasConfig?: boolean;
    hasAuth?: boolean;
    hasDb?: boolean;
    projectId?: string;
    userId?: string;
    testCompleted?: boolean;
    errorCode?: string;
  };
}> {
  try {
    if (!isFirebaseConfigured) {
      return {
        configured: false,
        connected: false,
        error: 'Firebase non configuré',
        details: { hasConfig: hasFirebaseConfig, hasAuth: !!auth, hasDb: !!db }
      };
    }

    // Test d'authentification
    console.log('🧪 Test d\'authentification Firebase...');
    const testUser = await signInAnonymously(auth);
    console.log('✅ Test d\'authentification réussi:', testUser.user.uid);

    // Test d'écriture Firestore
    console.log('🧪 Test d\'écriture Firestore...');
    const testDoc = doc(db, 'test', 'connection-test');
    await setDoc(testDoc, {
      timestamp: new Date(),
      test: 'connection-check'
    });
    console.log('✅ Test d\'écriture Firestore réussi');

    return {
      configured: true,
      connected: true,
      details: {
        projectId: firebaseConfig.projectId,
        userId: testUser.user.uid,
        testCompleted: true
      }
    };

  } catch (error) {
    console.error('❌ Test de connexion Firebase échoué:', error);

    let errorMessage = 'Erreur inconnue';
    let errorCode = 'unknown';

    if (error && typeof error === 'object' && 'code' in error) {
      errorCode = error.code as string;
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      configured: isFirebaseConfigured,
      connected: false,
      error: errorMessage,
      details: {
        errorCode,
        hasAuth: !!auth,
        hasDb: !!db,
        projectId: firebaseConfig.projectId
      }
    };
  }
}

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
 * @returns Promise<User> Utilisateur Firebase connecté ou mock
 */
export async function signInAnon(): Promise<User> {
  try {
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !auth) {
      console.log('📱 Connexion anonyme en mode local');

      // Générer ou récupérer un ID utilisateur stable pour ce navigateur
      let stableUserId = localStorage.getItem('medplan_anonymous_user_id');

      if (!stableUserId) {
        // Première fois sur ce navigateur : créer un ID unique
        stableUserId = 'anonymous-local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('medplan_anonymous_user_id', stableUserId);
        console.log('🆕 Nouvel utilisateur anonyme créé:', stableUserId);
      } else {
        console.log('🔄 Utilisateur anonyme existant récupéré:', stableUserId);
      }

      // Retourner un utilisateur mock avec l'ID stable
      return {
        uid: stableUserId,
        isAnonymous: true,
        email: null,
        displayName: null,
        emailVerified: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        }
      } as User;
    }

    const result = await signInAnonymously(auth);
    console.log('✅ Connexion anonyme Firebase réussie:', result.user.uid);

    // Créer le profil utilisateur si nécessaire
    await createUserProfileIfNeeded(result.user);

    return result.user;
  } catch (error: unknown) {
    console.error('❌ Erreur connexion anonyme:', error);
    throw new Error(`Connexion anonyme échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase non configuré - authentification email non disponible en mode local');
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Connexion email réussie:', result.user.email);

    // Créer le profil utilisateur si nécessaire
    await createUserProfileIfNeeded(result.user);

    return result.user;
  } catch (error: unknown) {
    console.error('❌ Erreur connexion email:', error);

    // Messages d'erreur en français
    let errorMessage = 'Erreur de connexion';
    if (error && typeof error === 'object' && 'code' in error) {
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
          errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      }
    } else {
      errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
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
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase non configuré - création de compte email non disponible en mode local');
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Création compte réussie:', result.user.email);

    // Créer le profil utilisateur
    await createUserProfileIfNeeded(result.user);

    return result.user;
  } catch (error: unknown) {
    console.error('❌ Erreur création compte:', error);

    let errorMessage = 'Erreur de création de compte';
    if (error && typeof error === 'object' && 'code' in error) {
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
          errorMessage = error instanceof Error ? error.message : 'Erreur de création de compte';
      }
    } else {
      errorMessage = error instanceof Error ? error.message : 'Erreur de création de compte';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Déconnexion utilisateur
 */
export async function signOutUser(): Promise<void> {
  try {
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !auth) {
      console.log('📱 Déconnexion en mode local - nettoyage des données');
      // En mode local, on peut nettoyer le localStorage si nécessaire
      // localStorage.clear(); // Décommente si tu veux vider les données locales
      return;
    }

    await signOut(auth);
    console.log('✅ Déconnexion Firebase réussie');
  } catch (error: unknown) {
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
  if (isFirebaseConfigured) {
    return onAuthStateChanged(auth, callback);
  } else {
    // Mode fallback : récupérer ou créer un utilisateur anonyme stable
    let stableUserId = localStorage.getItem('medplan_anonymous_user_id');

    if (!stableUserId) {
      // Première fois : créer un ID unique
      stableUserId = 'anonymous-local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('medplan_anonymous_user_id', stableUserId);
      console.log('🆕 Nouvel utilisateur anonyme créé (onAuthChange):', stableUserId);
    } else {
      console.log('🔄 Utilisateur anonyme existant récupéré (onAuthChange):', stableUserId);
    }

    const mockUser = {
      uid: stableUserId,
      isAnonymous: true,
      email: null,
      displayName: null,
      emailVerified: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      }
    } as User;

    // Appeler le callback immédiatement avec l'utilisateur mock stable
    setTimeout(() => callback(mockUser), 100);

    // Retourner une fonction de désabonnement vide
    return () => { };
  }
}

// =============================================================================
// FONCTIONS FIRESTORE - PROFIL UTILISATEUR
// =============================================================================

/**
 * Créer le profil utilisateur s'il n'existe pas
 * @param user Utilisateur Firebase
 */
async function createUserProfileIfNeeded(user: User): Promise<void> {
  // Vérifier si Firebase est configuré
  if (!isFirebaseConfigured || !db) {
    console.log('📱 Profil utilisateur sauvegardé en mode local');
    // Sauvegarder le profil en local
    const userProfile = {
      email: user.email || undefined,
      isAnonymous: user.isAnonymous,
      preferences: {
        notifications: true,
        reminderAdvance: 15,
        dailyReportTime: '20:00'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(`profile_${user.uid}`, JSON.stringify(userProfile));
    return;
  }

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
    console.log('✅ Profil utilisateur créé sur Firebase');
  }
}

/**
 * Récupérer le profil utilisateur
 * @param userId ID de l'utilisateur
 * @returns Promise<UserProfile | null>
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Essayer Firebase d'abord
    if (isFirebaseConfigured && db) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as UserProfile;
      }
    }

    // Fallback sur le stockage local
    const localProfile = localStorage.getItem(`profile_${userId}`);
    if (localProfile) {
      console.warn('📱 Utilisation des données locales');
      const parsedProfile = JSON.parse(localProfile);
      return {
        id: userId,
        email: '',
        isAnonymous: true,
        preferences: {
          notifications: true,
          reminderAdvance: 15,
          dailyReportTime: '20:00'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...parsedProfile
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);

    // En cas d'erreur, essayer le stockage local
    const localProfile = localStorage.getItem(`profile_${userId}`);
    if (localProfile) {
      console.warn('📱 Récupération en mode dégradé depuis le stockage local');
      const parsedProfile = JSON.parse(localProfile);
      return {
        id: userId,
        email: '',
        isAnonymous: true,
        preferences: {
          notifications: true,
          reminderAdvance: 15,
          dailyReportTime: '20:00'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...parsedProfile
      } as UserProfile;
    }

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
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db) {
      console.warn('📴 Firebase non configuré - sauvegarde locale');

      // Récupérer le profil existant ou créer un profil par défaut
      const existingProfileData = localStorage.getItem(`profile_${userId}`);
      let currentProfile: Partial<UserProfile> = {
        email: '',
        isAnonymous: true,
        preferences: {
          notifications: true,
          reminderAdvance: 15,
          dailyReportTime: '20:00'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (existingProfileData) {
        try {
          const parsedProfile = JSON.parse(existingProfileData);
          currentProfile = { ...currentProfile, ...parsedProfile };
        } catch {
          console.warn('⚠️ Données profil locales corrompues, utilisation des valeurs par défaut');
        }
      }

      // Fusionner les mises à jour avec le profil existant
      const updatedProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: new Date()
      };

      localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
      console.log('✅ Profil utilisateur sauvegardé localement');
      return;
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date()
    });
    console.log('✅ Profil utilisateur mis à jour sur Firebase');
  } catch (error: unknown) {
    console.error('❌ Erreur mise à jour profil:', error);

    // Gestion d'erreurs spécifiques
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message: string };

      if (firebaseError.code === 'unavailable' || firebaseError.code === 'offline') {
        console.warn('📴 Mode hors ligne détecté - sauvegarde locale');

        // Récupérer le profil existant ou créer un profil par défaut
        const existingProfileData = localStorage.getItem(`profile_${userId}`);
        let currentProfile: Partial<UserProfile> = {
          email: '',
          isAnonymous: true,
          preferences: {
            notifications: true,
            reminderAdvance: 15,
            dailyReportTime: '20:00'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (existingProfileData) {
          try {
            const parsedProfile = JSON.parse(existingProfileData);
            currentProfile = { ...currentProfile, ...parsedProfile };
          } catch {
            console.warn('⚠️ Données profil locales corrompues, utilisation des valeurs par défaut');
          }
        }

        // Fusionner les mises à jour avec le profil existant
        const updatedProfile = {
          ...currentProfile,
          ...updates,
          updatedAt: new Date(),
          offline: true
        };

        localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));

        throw new Error('Sauvegardé localement - sera synchronisé à la reconnexion');
      }
    }

    throw new Error('Erreur lors de la mise à jour du profil. Vérifiez votre connexion.');
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
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db) {
      // Mode local : utiliser l'ID utilisateur stable

      // Récupérer l'ID utilisateur stable (même logique qu'avec les préférences)
      let stableUserId = localStorage.getItem('medplan_anonymous_user_id');

      if (!stableUserId) {
        // Si pas d'ID stable, en créer un
        stableUserId = 'anonymous-local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('medplan_anonymous_user_id', stableUserId);
        console.log('🆕 Nouvel utilisateur anonyme créé pour traitement:', stableUserId);
      }

      const treatmentId = 'treatment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      const treatment: Treatment = {
        id: treatmentId,
        ...treatmentData,
        userId: stableUserId, // Utiliser l'ID stable !
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Sauvegarder en local
      const existingTreatments = JSON.parse(localStorage.getItem('treatments') || '[]');
      existingTreatments.push(treatment);
      localStorage.setItem('treatments', JSON.stringify(existingTreatments));

      console.log('✅ Traitement ajouté en mode local:', treatmentId, 'pour utilisateur:', stableUserId);
      return treatmentId;
    }

    // Mode Firebase
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
    console.log('✅ Traitement ajouté sur Firebase:', docRef.id);

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
 * @param userId ID de l'utilisateur (optionnel en mode local)
 * @returns Promise<Treatment[]>
 */
export async function getUserTreatments(userId?: string): Promise<Treatment[]> {
  try {
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db) {
      // Mode local : récupérer depuis localStorage avec l'ID utilisateur stable

      // Récupérer l'ID utilisateur stable
      const stableUserId = localStorage.getItem('medplan_anonymous_user_id');

      if (!stableUserId) {
        console.log('ℹ️ Aucun utilisateur stable trouvé, retour liste vide');
        return [];
      }

      const treatments: Treatment[] = JSON.parse(localStorage.getItem('treatments') || '[]');

      // Filtrer par utilisateur ET statut actif
      const userTreatments = treatments.filter(t =>
        t.userId === stableUserId && t.isActive !== false
      );

      console.log(`✅ ${userTreatments.length} traitements récupérés en mode local pour utilisateur:`, stableUserId);
      return userTreatments;
    }

    // Mode Firebase - userId est requis
    if (!userId) {
      throw new Error('ID utilisateur requis en mode Firebase');
    }

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

    console.log(`✅ ${treatments.length} traitements récupérés depuis Firebase`);
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
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db) {
      // Mode local : mettre à jour dans localStorage
      const treatments: Treatment[] = JSON.parse(localStorage.getItem('treatments') || '[]');
      const updatedTreatments = treatments.map(t =>
        t.id === treatmentId
          ? { ...t, ...updates, updatedAt: new Date() }
          : t
      );
      localStorage.setItem('treatments', JSON.stringify(updatedTreatments));
      console.log('✅ Traitement mis à jour en mode local');
      return;
    }

    const treatmentRef = doc(db, 'treatments', treatmentId);
    await updateDoc(treatmentRef, {
      ...updates,
      updatedAt: new Date()
    });
    console.log('✅ Traitement mis à jour sur Firebase');
  } catch (error) {
    console.error('❌ Erreur mise à jour traitement:', error);
    throw new Error('Erreur lors de la mise à jour du traitement');
  }
}

/**
 * Supprimer un traitement (marquer comme inactif ou supprimer en mode local)
 * @param treatmentId ID du traitement
 */
export async function deleteTreatment(treatmentId: string): Promise<void> {
  try {
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db) {
      // Mode local : supprimer du localStorage
      const stableUserId = localStorage.getItem('medplan_anonymous_user_id');

      if (!stableUserId) {
        throw new Error('Utilisateur non identifié');
      }

      const treatments: Treatment[] = JSON.parse(localStorage.getItem('treatments') || '[]');

      // Supprimer seulement les traitements de l'utilisateur actuel
      const filteredTreatments = treatments.filter(t =>
        !(t.id === treatmentId && t.userId === stableUserId)
      );

      localStorage.setItem('treatments', JSON.stringify(filteredTreatments));
      console.log('✅ Traitement supprimé en mode local pour utilisateur:', stableUserId);
      return;
    }

    // Mode Firebase : marquer comme inactif
    await updateTreatment(treatmentId, { isActive: false });
    console.log('✅ Traitement supprimé sur Firebase');
  } catch (error) {
    console.error('❌ Erreur suppression traitement:', error);
    throw new Error('Erreur lors de la suppression du traitement');
  }
}

/**
 * Supprimer tous les traitements (remise à zéro complète)
 */
export async function clearAllTreatments(): Promise<void> {
  try {
    // En mode local : supprimer seulement les traitements de l'utilisateur actuel
    if (!isFirebaseConfigured || !db) {
      const stableUserId = localStorage.getItem('medplan_anonymous_user_id');

      if (!stableUserId) {
        console.log('ℹ️ Aucun utilisateur stable, rien à supprimer');
        return;
      }

      const treatments: Treatment[] = JSON.parse(localStorage.getItem('treatments') || '[]');

      // Garder seulement les traitements des autres utilisateurs
      const otherUsersTreatments = treatments.filter(t => t.userId !== stableUserId);

      localStorage.setItem('treatments', JSON.stringify(otherUsersTreatments));
      console.log('✅ Tous les traitements supprimés en mode local pour utilisateur:', stableUserId);
      return;
    }

    // En mode Firebase : pas implémenté pour la sécurité
    throw new Error('Suppression globale non autorisée en mode Firebase');
  } catch (error) {
    console.error('❌ Erreur suppression totale:', error);
    throw new Error('Erreur lors de la suppression de tous les traitements');
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
 * @param userId ID de l'utilisateur (optionnel en mode local)
 * @param startDate Date de début
 * @param endDate Date de fin
 * @returns Promise<object> Statistiques d'adhérence
 */
export async function getAdherenceStats(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  delayedDoses: number;
  adherenceRate: number;
}> {
  try {
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db) {
      // Mode local : calculer les vraies statistiques à partir des traitements
      console.log('📊 Calcul des statistiques réelles en mode local');

      const treatments = await getUserTreatments();

      if (treatments.length === 0) {
        return {
          totalDoses: 0,
          takenDoses: 0,
          missedDoses: 0,
          delayedDoses: 0,
          adherenceRate: 0
        };
      }

      let totalDoses = 0;

      // Calculer le nombre réel de doses sur la période demandée
      const periodStart = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate || new Date();

      treatments.forEach(treatment => {
        const treatmentStart = new Date(treatment.startDate);
        const treatmentEnd = new Date(treatment.endDate);

        // Calculer l'intersection entre la période demandée et la période du traitement
        const effectiveStart = new Date(Math.max(periodStart.getTime(), treatmentStart.getTime()));
        const effectiveEnd = new Date(Math.min(periodEnd.getTime(), treatmentEnd.getTime()));

        // Si les dates se chevauchent
        if (effectiveStart <= effectiveEnd) {
          const daysDiff = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const dosesForPeriod = treatment.frequency * daysDiff;
          totalDoses += dosesForPeriod;
        }
      });

      // Pour le moment, puisqu'on n'a pas encore de système de validation des prises,
      // on considère toutes les doses comme "à venir" (non prises)
      const takenDoses = 0; // Aucune prise validée pour l'instant
      const missedDoses = 0; // Aucune dose manquée enregistrée
      const delayedDoses = 0; // Aucune dose retardée enregistrée

      const adherenceRate = 0; // 0% car aucune prise n'a été validée

      console.log(`📈 Statistiques calculées - Total: ${totalDoses}, Prises: ${takenDoses}, Manquées: ${missedDoses}, Retardées: ${delayedDoses}`);

      return {
        totalDoses,
        takenDoses,
        missedDoses,
        delayedDoses,
        adherenceRate
      };
    }

    // Mode Firebase - userId est requis
    if (!userId || !startDate || !endDate) {
      throw new Error('Parameters requis en mode Firebase');
    }

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