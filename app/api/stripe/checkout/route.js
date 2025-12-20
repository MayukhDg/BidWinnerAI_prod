import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ clerkId: userId });
    
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return new Response('Missing priceId', { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?canceled=true`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
