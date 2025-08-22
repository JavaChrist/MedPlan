import type { VercelRequest, VercelResponse } from '@vercel/node';
import mollieModule from '@mollie/api-client';

const mollieApiKey = process.env.MOLLIE_API_KEY as string;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }
    if (!mollieApiKey) {
      res.status(500).json({ error: 'MOLLIE_API_KEY manquant' });
      return;
    }
    const id = String(req.query.id || '');
    if (!id) {
      res.status(400).json({ error: 'payment id requis' });
      return;
    }
    const _factory: any = (mollieModule as any)?.default || (mollieModule as any)?.createMollieClient || (mollieModule as any);
    const mollie = _factory({ apiKey: mollieApiKey });
    const payment = await mollie.payments.get(id);
    const metadata: any = (payment as any).metadata || {};
    res.status(200).json({
      id: payment.id,
      paid: payment.isPaid(),
      status: (payment as any).status,
      plan: metadata.plan || null,
      uid: metadata.uid || null
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erreur inconnue' });
  }
}


