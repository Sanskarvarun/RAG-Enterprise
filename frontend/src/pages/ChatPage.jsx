import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendQuestion, getConversations, getMessages, deleteConversation } from '../api/chat';
import { Link } from 'react-router-dom';
import {
  Send, Plus, Trash2, MessageSquare, FileText,
  Bot, User, Loader2, BookOpen, ChevronRight, Home
} from 'lucide-react';

// Markdown-like renderer for code blocks and bold text
const MessageContent = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```|\*\*[\s\S]*?\*\*)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre key={i} className="bg-black/40 rounded-xl p-4 text-sm font-mono text-green-300 overflow-x-auto border border-slate-700">
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

const ChatPage = () => {
  const { token, user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations(token);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const data = await getMessages(token, convId);
      setMessages(data);
      setActiveConvId(convId);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
    setError('');
  };

  const handleDelete = async (e, convId) => {
    e.stopPropagation();
    try {
      await deleteConversation(token, convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) handleNewChat();
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    setError('');

    // Optimistically add user message
    const tempUserMsg = { id: Date.now(), role: 'user', content: question, sources: [] };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const result = await sendQuestion(token, question, activeConvId);
      // Update conversation list
      if (!activeConvId) {
        await loadConversations();
      }
      setActiveConvId(result.conversation_id);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.answer,
          sources: result.sources || []
        }
      ]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get a response. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Bot size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm">Enterprise AI</h1>
              <p className="text-xs text-slate-500">Assistant Platform</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 space-y-1">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-500 transition-colors"
          >
            <Plus size={16} />
            New Conversation
          </button>
          <Link
            to="/documents"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <BookOpen size={16} />
            Knowledge Base
          </Link>
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Home size={16} />
            Dashboard
          </Link>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-2 mb-2">Recent Chats</p>
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8 px-4">No conversations yet. Ask your first question!</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm mb-1 transition-all group ${activeConvId === conv.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare size={14} className="shrink-0 text-slate-500" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 shrink-0 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))
          )}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
              {token ? 'U' : '?'}
            </div>
            <span className="text-sm text-slate-300 flex-1 truncate">My Account</span>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Logout</button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
          <div>
            <h2 className="font-semibold text-lg">Chat Assistant</h2>
            <p className="text-xs text-slate-500">Powered by Gemini + RAG · Your documents are the source of truth</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            RAG Active
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500/20 to-blue-600/20 border border-primary-500/20 flex items-center justify-center mb-6">
                <Bot size={36} className="text-primary-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
                Ask anything
              </h3>
              <p className="text-slate-500 max-w-sm text-sm">
                I'll answer questions based on the documents in your knowledge base. Upload documents first, then start asking!
              </p>
              <div className="mt-8 grid grid-cols-1 gap-3 w-full max-w-md">
                {["What topics are covered in the uploaded documents?", "Summarize the key points", "What are the main requirements?"].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/50 hover:bg-slate-800 transition-all text-sm text-left text-slate-400 hover:text-white"
                  >
                    {suggestion}
                    <ChevronRight size={16} className="shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                  <Bot size={16} />
                </div>
              )}
              <div className={`max-w-2xl space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none'
                }`}>
                  <MessageContent content={msg.content} />
                </div>

                {/* Sources */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-slate-400">
                        <FileText size={12} className="text-primary-400" />
                        {src}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                <Bot size={16} />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-none px-5 py-4">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="text-xs text-slate-500 ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl max-w-md text-center">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 pb-6 pt-3 border-t border-slate-800">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 pr-14 text-sm resize-none focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 text-white placeholder-slate-500 transition-all leading-relaxed"
              style={{ minHeight: '56px', maxHeight: '200px' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-9 h-9 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all shadow-lg"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-center text-xs text-slate-600 mt-3">
            Answers are grounded in your uploaded documents via RAG
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
