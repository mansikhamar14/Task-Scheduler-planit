'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
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

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
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
  useEffect(() => scrollToBottom(), [messages, isOpen]);

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
    if (isOpen) loadThreads();
  }, [isOpen]);

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
    // If opened entirely new, initialize a new thread ID
    if (isOpen && !activeThreadId && threads.length === 0) {
      createNewThread();
    } else if (isOpen && !activeThreadId && threads.length > 0) {
      loadThreadMessages(threads[0].threadId);
    }
  }, [isOpen, threads, activeThreadId]);

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
        // Refresh threads list implicitly 
        loadThreads();
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
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 p-4 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-2xl transition-transform hover:scale-110 z-50 flex items-center justify-center animate-bounce-slow"
        >
          <ChatBubbleLeftRightIcon className="w-7 h-7" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-[400px] h-[600px] max-h-[100dvh] sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 flex overflow-hidden border border-gray-200 dark:border-gray-800 flex-col sm:flex-row transition-all duration-300">
          
          {/* Sidebar */}
          <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col h-32 sm:h-full">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-violet-500 text-white">
              <h3 className="font-semibold text-sm truncate">Chat History</h3>
              <button onClick={() => setIsOpen(false)} className="sm:hidden p-1 bg-violet-600 rounded-md">
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-2 overflow-y-auto flex-1 space-y-1">
              <button 
                onClick={createNewThread}
                className="w-full mb-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors text-xs font-semibold"
              >
                <PlusIcon className="w-4 h-4" /> New Chat
              </button>
              {threads.map(t => (
                <div 
                  key={t.threadId}
                  onClick={() => loadThreadMessages(t.threadId)}
                  className={`flex justify-between items-center group p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    activeThreadId === t.threadId 
                      ? 'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="truncate pr-2 font-medium">{t.title}</span>
                  <button 
                    onClick={(e) => deleteThread(e, t.threadId)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1 flex-shrink-0 rounded transition-all"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 w-full sm:w-2/3">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h2 className="font-semibold text-gray-900 dark:text-white">PlanIt AI</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hidden sm:block p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 opacity-70">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2" />
                  <p className="text-sm font-medium text-center">Hello! How can I boost your productivity today?</p>
                  <p className="text-xs text-center mt-1">(Tip: I can check stock prices & calculate for you!)</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-violet-600 text-white rounded-br-none' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-700 prose-sm overflow-x-hidden'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none break-words">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Gemini AI..."
                  disabled={loading}
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <PaperAirplaneIcon className="w-5 h-5 -ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
