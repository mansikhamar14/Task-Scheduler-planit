import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/config';
import dbConnect from '@/lib/db';
import { ChatThread } from '@/models';

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const threads = await ChatThread.find({ userId: session.user.id })
      .select('threadId title updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(threads);
  } catch (error: any) {
    console.error('Chat Threads GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
