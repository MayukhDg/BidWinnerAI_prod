import { headers } from 'next/headers';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export async function POST(req) {
  const body = await req.text();
  const headersList = await headers();

  let event;

  try {
    event = validateEvent(
      body,
      Object.fromEntries(headersList.entries()),
      process.env.POLAR_WEBHOOK_SECRET ?? ''
    );
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response('Webhook verification failed', { status: 403 });
    }
    console.error('Webhook error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log('Polar webhook received:', event.type);

  const usersCollection = await getCollection('users');
  const ordersCollection = await getCollection('orders');

  // Handle successful subscription
  if (
    event.type === 'checkout.created' ||
    event.type === 'order.created' ||
    event.type === 'subscription.created' ||
    event.type === 'subscription.active' ||
    event.type === 'subscription.updated'
  ) {
    const data = event.data;

    // Extract user info from metadata or customer email
    const metadata = data.metadata || {};
    const customerEmail = data.customerEmail || data.customer?.email;
    const userId = metadata.userId;
    const clerkId = metadata.clerkId;

    let user = null;

    // Try to find user by metadata userId first
    if (userId) {
      try {
        user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      } catch (e) {
        console.log('Could not find user by ObjectId:', e.message);
      }
    }

    // Try clerkId
    if (!user && clerkId) {
      user = await usersCollection.findOne({ clerkId });
    }

    // Try email
    if (!user && customerEmail) {
      user = await usersCollection.findOne({ email: customerEmail });
    }

    if (user) {
      // Update user to pro subscription
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            subscriptionTier: 'pro',
            polarCustomerId: data.customerId || data.customer?.id,
            subscriptionUpdatedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      console.log(`User ${user.email} upgraded to pro`);

      // Create order record
      await ordersCollection.insertOne({
        userId: user._id,
        polarOrderId: data.id,
        polarCustomerId: data.customerId || data.customer?.id,
        amount: (data.amount || data.totalAmount || 6000) / 100,
        currency: data.currency || 'usd',
        status: 'completed',
        productId: data.productId,
        createdAt: new Date(),
      });
    } else {
      console.error('Could not find user for webhook:', { customerEmail, userId, clerkId });
    }
  }

  // Handle subscription cancellation (if you add subscriptions later)
  if (event.type === 'subscription.canceled' || event.type === 'subscription.revoked') {
    const data = event.data;
    const customerEmail = data.customerEmail || data.customer?.email;

    if (customerEmail) {
      await usersCollection.updateOne(
        { email: customerEmail },
        {
          $set: {
            subscriptionTier: 'free',
            subscriptionUpdatedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      console.log(`User ${customerEmail} downgraded to free`);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
