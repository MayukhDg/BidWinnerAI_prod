import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Find user by email or customer ID
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({
      $or: [
        { email: session.customer_email },
        { stripeCustomerId: session.customer },
      ],
    });

    if (user) {
      // Determine subscription tier based on amount
      let subscriptionTier = 'free';
      const amount = session.amount_total / 100; // Convert from cents

      if (amount >= 99) {
        subscriptionTier = 'enterprise';
      } else if (amount >= 49) {
        subscriptionTier = 'pro';
      }

      // Update user subscription
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            subscriptionTier,
            stripeCustomerId: session.customer,
            updatedAt: new Date(),
          },
        }
      );

      // Create order record
      const ordersCollection = await getCollection('orders');
      await ordersCollection.insertOne({
        userId: user._id,
        stripeOrderId: session.id,
        stripeCustomerId: session.customer,
        amount: amount,
        currency: session.currency || 'usd',
        status: session.payment_status,
        createdAt: new Date(),
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
