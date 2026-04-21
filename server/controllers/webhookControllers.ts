import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event;

  try {
    // 1. Verify the request actually came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Handle the successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve the hidden data we passed during checkout
    const userId = session.metadata?.userId;
    const creditsToAdd = parseInt(session.metadata?.creditsToAdd || '0');

    if (userId && creditsToAdd > 0) {
      // 3. Grant the credits in the database!
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsToAdd } },
      });
      console.log(`✅ Granted ${creditsToAdd} credits to user ${userId}`);
    }
  }

  // Tell Stripe we received the event successfully
  res.json({ received: true });
};