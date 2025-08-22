import type { VercelRequest, VercelResponse } from '@vercel/node';
import createMollieClient from '@mollie/api-client';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const mollieApiKey = process.env.MOLLIE_API_KEY as string;

// Initialiser Firebase Admin (Vercel) via variables d'env service account
if (!getApps().length) {
  initializeApp();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    const paymentId = String(req.body?.id || req.query?.id || '');
    if (!paymentId) {
      res.status(400).json({ error: 'payment id manquant' });
      return;
    }

    if (!mollieApiKey) {
      res.status(500).json({ error: 'MOLLIE_API_KEY manquant' });
      return;
    }

    const mollie = createMollieClient({ apiKey: mollieApiKey });
    const payment = await mollie.payments.get(paymentId);

    const metadata: any = (payment as any).metadata || {};
    const uid = metadata.uid as string;
    const plan = metadata.plan as 'family' | 'premium' | 'free';

    // Statuts: paid, pending, open, canceled, expired, failed
    if (payment.isPaid()) {
      const db = getFirestore();
      const planDoc = plan === 'premium'
        ? { id: 'premium', maxSubjects: Number.POSITIVE_INFINITY, name: 'MedPlan Premium' }
        : plan === 'family'
          ? { id: 'family', maxSubjects: 5, name: 'MedPlan Family' }
          : { id: 'free', maxSubjects: 2, name: 'MedPlan Basic' };

      if (uid) {
        await db.doc(`users/${uid}`).set({ plan: planDoc, lastPaymentId: paymentId, updatedAt: new Date() }, { merge: true });
      }
    }

    res.status(200).send('ok');
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erreur inconnue' });
  }
}


