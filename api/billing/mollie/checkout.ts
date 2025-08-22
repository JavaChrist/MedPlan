import type { VercelRequest, VercelResponse } from '@vercel/node';
import createMollieClient, { Payment } from '@mollie/api-client';

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

    const plan = String(req.query.plan || 'family'); // 'family' | 'premium'
    const uid = String(req.query.uid || '');
    if (!uid) {
      res.status(400).json({ error: 'uid requis' });
      return;
    }

    const appUrl = (process.env.APP_URL as string) || (req.headers.origin as string) || `https://${req.headers.host}`;

    // Mapping plans
    const planMap: Record<string, { amount: string; description: string; label: string }> = {
      family: { amount: '2.99', description: 'MedPlan Family (5 profils)', label: 'MedPlan Family' },
      premium: { amount: '4.99', description: 'MedPlan Premium (illimité)', label: 'MedPlan Premium' }
    };
    const selected = planMap[plan] || planMap.family;

    const mollie = createMollieClient({ apiKey: mollieApiKey });

    const payment: Payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: selected.amount },
      description: selected.description,
      redirectUrl: `${appUrl}/subjects?paymentId=__PAYMENT_ID__`,
      webhookUrl: `${appUrl}/api/billing/mollie/webhook`,
      metadata: { uid, plan }
    } as any);

    const checkoutUrl = (payment as any)._links?.checkout?.href || (payment as any).getCheckoutUrl?.();
    const redirectUrl = String(selected && checkoutUrl).replace('__PAYMENT_ID__', payment.id);

    if (!checkoutUrl) {
      res.status(500).json({ error: 'Impossible de créer le paiement' });
      return;
    }

    res.status(302).setHeader('Location', checkoutUrl).end();
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erreur inconnue' });
  }
}


