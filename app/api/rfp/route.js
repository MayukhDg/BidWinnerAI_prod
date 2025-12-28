import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';

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

    const rfpsCollection = await getCollection('rfps');
    const rfps = await rfpsCollection
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json(rfps);
  } catch (error) {
    console.error('Error fetching RFPs:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
