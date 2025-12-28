import { inngest } from '@/lib/inngest/client';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-worker-key');
    if (auth !== process.env.WORKER_API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { rfpId, status } = await req.json();

    if (status === 'completed') {
      await inngest.send({
        name: 'rfp/generate.answers',
        data: { rfpId },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
