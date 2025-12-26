import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req) {
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

    return Response.json({
      subscriptionTier: user.subscriptionTier || 'free',
      isPro: user.subscriptionTier === 'pro',
      email: user.email,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
