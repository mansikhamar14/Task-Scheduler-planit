'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Thread {
  threadId: string;
  title: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => scrollToBottom(), [messages]);

  // Load threads
  const loadThreads = async () => {
    try {
      const res = await fetch('/api/chat/threads');
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (e) {
      console.error('Failed to load threads');
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  // Load specific thread messages
  const loadThreadMessages = async (threadId: string) => {
    setActiveThreadId(threadId);
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/threads/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const createNewThread = () => {
    setActiveThreadId(crypto.randomUUID());
    setMessages([]);
  };

  useEffect(() => {
    if (!activeThreadId && threads.length === 0) {
      createNewThread();
    } else if (!activeThreadId && threads.length > 0) {
      loadThreadMessages(threads[0].threadId);
    }
  }, [threads, activeThreadId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId,
          messages: newMessages
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...newMessages, data]);
        loadThreads(); // update titles
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the AI.' }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteThread = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/threads/${id}`, { method: 'DELETE' });
      const newThreads = threads.filter(t => t.threadId !== id);
      setThreads(newThreads);
      if (activeThreadId === id) {
        if (newThreads.length > 0) loadThreadMessages(newThreads[0].threadId);
        else createNewThread();
      }
    } catch (e) {
      console.error("Failed to delete thread");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-100px)] pt-6 pb-2">
      <div className="flex h-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-1/3 max-w-[300px] border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-violet-500" />
              Chat History
            </h2>
          </div>
          
          <div className="p-3 overflow-y-auto flex-1 space-y-2">
            <button 
              onClick={createNewThread}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors font-semibold shadow-sm"
            >
              <PlusIcon className="w-5 h-5" /> New AI Chat
            </button>
            <div className="h-4"></div>
            {threads.map(t => (
              <div 
                key={t.threadId}
                onClick={() => loadThreadMessages(t.threadId)}
                className={`flex justify-between items-center group p-3 rounded-xl cursor-pointer transition-all ${
                  activeThreadId === t.threadId 
                    ? 'bg-white dark:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="truncate pr-2 font-medium text-sm">{t.title}</span>
                <button 
                  onClick={(e) => deleteThread(e, t.threadId)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1.5 flex-shrink-0 rounded transition-all"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {threads.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
                No chat history yet.<br/>Start a new conversation!
              </p>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
              <div>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">PlanIt Assistant</h1>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Online</p>
              </div>
            </div>
            
            {/* Mobile New Chat Button */}
            <button 
              onClick={createNewThread}
              className="sm:hidden flex items-center justify-center p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
            >
               <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-[#0b0f19]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 opacity-80 max-w-sm mx-auto text-center">
                <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 text-violet-400" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">How can I help you today?</h3>
                <p className="text-sm leading-relaxed">
                  I can manage your tasks, summarize your schedule, calculate mathematics, check stock prices, and act as your personal productivity coach!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white flex-shrink-0 mr-3 mt-1">
                      <span className="font-bold text-xs">AI</span>
                    </div>
                  )}
                  <div 
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-sm sm:text-[15px] leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-violet-600 text-white rounded-br-none font-medium' 
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700 overflow-x-hidden'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown className="prose dark:prose-invert max-w-none break-words">
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white flex-shrink-0 mr-3">
                  <span className="font-bold text-xs">AI</span>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none px-5 py-4 flex gap-1.5 items-center shadow-sm">
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message PlanIt Assistant..."
                disabled={loading}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full px-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 disabled:opacity-50 shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-full p-3 w-14 h-14 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-105 shadow-md flex-shrink-0"
              >
                <PaperAirplaneIcon className="w-6 h-6 -ml-1" />
              </button>
            </form>
            <div className="text-center mt-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">PlanIt AI can make mistakes. Consider verifying important information.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
