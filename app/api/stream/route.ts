import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { registerClient, removeClient } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const clientId = user.id + '-' + Date.now();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(`: connected\n\n`);
      registerClient(clientId, {
        userId: user.id,
        role: user.role,
        controller,
        lastSeen: Date.now(),
      });
    },
    cancel() {
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
