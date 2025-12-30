import { auth } from '@clerk/nextjs/server';
import { polar, CREDIT_PACKAGES } from '@/lib/polar';
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

    const body = await req.json();
    const { packageId } = body;

    if (!packageId || !CREDIT_PACKAGES[packageId]) {
      return new Response('Invalid packageId', { status: 400 });
    }

    const selectedPackage = CREDIT_PACKAGES[packageId];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Polar checkout session
    const checkout = await polar.checkouts.create({
      products: [selectedPackage.productId],
      successUrl: `${appUrl}/dashboard`,
      customerEmail: user.email,
      metadata: {
        userId: user._id.toString(),
        clerkId: userId,
        packageId: packageId,
      },
    });

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error('Error creating Polar checkout session:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
