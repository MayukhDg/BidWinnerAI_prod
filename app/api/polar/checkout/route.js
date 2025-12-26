import { auth } from '@clerk/nextjs/server';
import { polar } from '@/lib/polar';
import { getCollection } from '@/lib/mongodb';

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

    // Check if user already has pro subscription
    if (user.subscriptionTier === 'pro') {
      return Response.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return new Response('Missing productId', { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Polar checkout session
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${appUrl}/dashboard?success=true`,
      customerEmail: user.email,
      metadata: {
        userId: user._id.toString(),
        clerkId: userId,
      },
    });

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error('Error creating Polar checkout session:', error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
