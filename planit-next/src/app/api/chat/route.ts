import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/config';
import dbConnect from '@/lib/db';
import { ChatThread, Task } from '@/models';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '');

const addTaskTool = {
  name: 'add_task',
  description: 'Add a new task to the user\'s schedule.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The title of the task' },
      description: { type: 'string', description: 'The description of the task' },
      priority: { type: 'string', description: 'The priority level (low, medium, high)' },
      status: { type: 'string', description: 'The status of the task (pending, in-progress, completed, overdue)' },
      dueDate: { type: 'string', description: 'The due date in YYYY-MM-DD format (e.g., 2023-12-31)' }
    },
    required: ['title']
  }
};

const deleteTaskTool = {
  name: 'delete_task',
  description: 'Delete a task by its title.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The title of the task to delete' }
    },
    required: ['title']
  }
};

const getTasksTool = {
  name: 'get_tasks',
  description: 'Retrieve the user\'s current tasks. Can optionally filter by status or priority.',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status (pending, in-progress, completed, overdue)' },
      priority: { type: 'string', description: 'Filter by priority (low, medium, high)' }
    }
  }
};

const updateTaskTool = {
  name: 'update_task',
  description: 'Update an existing task by its current title.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The current title of the task to update' },
      new_title: { type: 'string', description: 'The new title for the task' },
      description: { type: 'string', description: 'The new description of the task' },
      priority: { type: 'string', description: 'The new priority (low, medium, high)' },
      status: { type: 'string', description: 'The new status (pending, in-progress, completed, overdue)' },
      dueDate: { type: 'string', description: 'The new due date in YYYY-MM-DD format' }
    },
    required: ['title']
  }
};

async function executeToolCall(call: any, userId: string) {
  if (call.name === 'add_task') {
    const { title, description, priority, status, dueDate } = call.args;
    try {
      const newTask = await Task.create({
        userId,
        title,
        description: description || '',
        priority: (['low', 'medium', 'high'].includes(priority) ? priority : 'medium'),
        status: (['pending', 'in-progress', 'completed', 'overdue'].includes(status) ? status : 'pending'),
        dueDate: dueDate ? new Date(dueDate) : undefined
      });
      return { success: true, message: `Task '${title}' created successfully!`, id: newTask._id };
    } catch (e: any) {
      return { error: String(e) };
    }
  } else if (call.name === 'delete_task') {
    const { title } = call.args;
    try {
      const result = await Task.findOneAndDelete({
        userId,
        title: { $regex: new RegExp(`^${title}$`, 'i') }
      });
      if (result) {
        return { success: true, message: `Task '${title}' deleted successfully.` };
      } else {
        return { error: `No task found matching title '${title}'` };
      }
    } catch (e: any) {
      return { error: String(e) };
    }
  } else if (call.name === 'get_tasks') {
    const { status, priority } = call.args;
    try {
      const query: any = { userId };
      if (status) query.status = status;
      if (priority) query.priority = priority;
      const tasks = await Task.find(query).sort({ createdAt: -1 }).limit(20);
      return { success: true, tasks };
    } catch (e: any) {
      return { error: String(e) };
    }
  } else if (call.name === 'update_task') {
    const { title, new_title, description, priority, status, dueDate } = call.args;
    try {
      const updateData: any = {};
      if (new_title) updateData.title = new_title;
      if (description !== undefined) updateData.description = description;
      if (priority) updateData.priority = priority;
      if (status) updateData.status = status;
      if (dueDate) updateData.dueDate = new Date(dueDate);

      const result = await Task.findOneAndUpdate(
        { userId, title: { $regex: new RegExp(`^${title}$`, 'i') } },
        { $set: updateData },
        { new: true }
      );
      if (result) {
        return { success: true, message: `Task '${title}' updated successfully.` };
      } else {
        return { error: `No task found matching title '${title}'` };
      }
    } catch (e: any) {
      return { error: String(e) };
    }
  }
  return { error: 'Unknown tool' };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { messages, threadId } = payload;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    await dbConnect();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are the PlanIt Assistant. Your main purpose is to help the user completely manage their tasks overall and give practical advice on managing time, productivity, and scheduling. You can add, delete, update, and list tasks from their database. If the user asks you to do anything completely unrelated to task management or productivity (like coding problems, history facts, math, etc.), you must politely refuse and clarify your scope. You are an expert at task management.',
      // @ts-ignore
      tools: [{ functionDeclarations: [addTaskTool, deleteTaskTool, getTasksTool, updateTaskTool] }]
    });

    const googleHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({ history: googleHistory });
    const lastUserMessageStr = messages[messages.length - 1].content;
    const result = await chat.sendMessage([{ text: lastUserMessageStr }]);

    let responseText = '';
    const calls = result.response.functionCalls();

    if (calls && calls.length > 0) {
      const functionResponses = await Promise.all(calls.map(async (call: any) => {
        const apiResponse = await executeToolCall(call, session.user.id);
        return {
          functionResponse: {
            name: call.name,
            response: apiResponse
          }
        };
      }));

      const secondResult = await chat.sendMessage(functionResponses);
      responseText = secondResult.response.text();
    } else {
      responseText = result.response.text();
    }

    const assistantMessage = { role: 'assistant', content: responseText };

    // Save to MongoDB thread
    if (threadId) {
      await ChatThread.findOneAndUpdate(
        { threadId, userId: session.user.id },
        { 
          $push: { 
            messages: { 
              $each: [
                messages[messages.length - 1], 
                assistantMessage
              ] 
            } 
          } 
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return NextResponse.json(assistantMessage);
  } catch (error: any) {
    console.error('Chat AI API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
