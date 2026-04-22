import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/config';
import dbConnect from '@/lib/db';
import { ChatThread } from '@/models';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const thread = await ChatThread.findOne({ 
      threadId: params.id, 
      userId: session.user.id 
    }).lean();

    if (!thread) {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: thread.messages });
  } catch (error: any) {
    console.error('Chat Thread GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    await ChatThread.deleteOne({ threadId: params.id, userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
