import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { SubjectProfile } from '../types';

export async function listSubjects(userId: string): Promise<SubjectProfile[]> {
  const ref = collection(db, 'users', userId, 'subjects');
  const snap = await getDocs(ref);
  const list: SubjectProfile[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    list.push({
      id: d.id,
      name: data.name,
      relation: data.relation,
      color: data.color,
      avatarUrl: data.avatarUrl,
      createdAt: data.createdAt?.toDate?.() || new Date()
    });
  });
  return list;
}

export async function addSubject(userId: string, subject: Omit<SubjectProfile, 'id' | 'createdAt'>): Promise<string> {
  const ref = collection(db, 'users', userId, 'subjects');
  const res = await addDoc(ref, { ...subject, createdAt: Timestamp.now() });
  return res.id;
}

export async function updateSubject(userId: string, subjectId: string, data: Partial<SubjectProfile>): Promise<void> {
  const ref = doc(db, 'users', userId, 'subjects', subjectId);
  const payload: any = { ...data };
  if (payload.createdAt instanceof Date) delete payload.createdAt;
  await updateDoc(ref, payload);
}

export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'subjects', subjectId);
  await deleteDoc(ref);
}


