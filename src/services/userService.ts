import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface UserProfileData {
  displayName?: string;
  phone?: string;
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    displayName: data.displayName || undefined,
    phone: data.phone || undefined
  };
}

export async function upsertUserProfile(uid: string, data: UserProfileData): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...data, createdAt: new Date() });
  } else {
    await updateDoc(ref, { ...data, updatedAt: new Date() } as any);
  }
}


