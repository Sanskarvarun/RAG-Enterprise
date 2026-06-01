import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendQuestion, getConversations, getMessages, deleteConversation } from '../api/chat';
import { Link } from 'react-router-dom';
import {
  Send, Plus, Trash2, MessageSquare, FileText,
  Bot, User, Loader2, BookOpen, ChevronRight, Home, Sparkles, LogOut
} from 'lucide-react';

// Markdown-like renderer for code blocks, headers, bullet lists, and formatting
const MessageContent = ({ content, isUser }) => {
  const blocks = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'code',
          lang: codeBlockLang,
          content: codeBlockLines.join('\n')
        });
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3);
      }
    } else if (inCodeBlock) {
      codeBlockLines.push(line);
    } else {
      blocks.push({
        type: 'line',
        content: line
      });
    }
  }

  const renderedElements = [];
  let currentList = [];

  const parseInline = (text) => {
    const parts = text.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-350">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`list-${keyPrefix}`} className={`list-disc pl-5 space-y-1.5 my-2.5 ${isUser ? 'text-white' : 'text-slate-300'}`}>
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{parseInline(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  blocks.forEach((block, idx) => {
    if (block.type === 'code') {
      flushList(idx);
      renderedElements.push(
        <pre key={idx} className="bg-slate-950/70 rounded-xl p-4 my-3 text-sm font-mono text-emerald-400 overflow-x-auto border border-slate-800/80 shadow-inner">
          <code>{block.content}</code>
        </pre>
      );
    } else {
      const line = block.content;
      const trimmed = line.trim();

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const itemText = trimmed.slice(2);
        currentList.push(itemText);
      } else {
        flushList(idx);

        if (trimmed === '---' || trimmed === '***') {
          renderedElements.push(<hr key={idx} className="border-slate-800/60 my-4" />);
        } else if (trimmed.startsWith('### ')) {
          renderedElements.push(
            <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2 flex items-center gap-2">
              {parseInline(trimmed.slice(4))}
            </h3>
          );
        } else if (trimmed.startsWith('## ')) {
          renderedElements.push(
            <h2 key={idx} className="text-lg font-bold text-white mt-5 mb-2.5 flex items-center gap-2 border-b border-slate-800/50 pb-1">
              {parseInline(trimmed.slice(3))}
            </h2>
          );
        } else if (trimmed.startsWith('# ')) {
          renderedElements.push(
            <h1 key={idx} className="text-xl font-extrabold text-white mt-6 mb-3 flex items-center gap-2">
              {parseInline(trimmed.slice(2))}
            </h1>
          );
        } else if (trimmed.length > 0) {
          renderedElements.push(
            <p key={idx} className={`leading-relaxed my-2 ${isUser ? 'text-white' : 'text-slate-300'}`}>
              {parseInline(line)}
            </p>
          );
        } else {
          renderedElements.push(<div key={idx} className="h-2" />);
        }
      }
    }
  });

  flushList('final');

  return <div className={`space-y-1.5 ${isUser ? 'text-white' : 'text-slate-300'}`}>{renderedElements}</div>;
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
    if (!window.confirm("Delete this conversation history?")) return;
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
    <div className="flex h-screen bg-slate-955 text-white overflow-hidden relative font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 bg-slate-900/35 backdrop-blur-xl border-r border-slate-900/80 flex flex-col relative z-20">
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-500/10">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white">Enterprise AI</h1>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Assistant Hub</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-primary-500/10 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus size={16} />
            New Conversation
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/documents"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-900/60 border border-slate-800 hover:text-white hover:bg-slate-850/80 transition-all"
            >
              <BookOpen size={13} />
              Documents
            </Link>
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-900/60 border border-slate-800 hover:text-white hover:bg-slate-850/80 transition-all"
            >
              <Home size={13} />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Recent Chats List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex items-center justify-between px-2 mb-3">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Recent Chats</p>
            <span className="text-[10px] text-slate-650">{conversations.length} total</span>
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-900/20 border border-dashed border-slate-850 rounded-2xl">
              <MessageSquare className="mx-auto text-slate-700 mb-2" size={24} />
              <p className="text-xs text-slate-500">No active chats. Start by sending a question!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm transition-all group ${
                    activeConvId === conv.id 
                      ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/50 border border-slate-850 text-white shadow-md' 
                      : 'text-slate-400 border border-transparent hover:bg-slate-900/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare size={14} className={activeConvId === conv.id ? 'text-primary-400 shrink-0' : 'text-slate-600 shrink-0'} />
                    <span className="truncate text-left font-medium">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 shrink-0 p-1 hover:bg-slate-800 rounded-lg transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 size={13} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Account Section */}
        <div className="p-4 border-t border-slate-900/80 bg-slate-950/20">
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-primary-600/10 shrink-0">
                {user ? user.username.slice(0, 2).toUpperCase() : 'AI'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-300 block truncate">{user ? user.full_name || user.username : 'User'}</span>
                <span className="text-[10px] text-slate-500 block truncate">{user ? user.email : ''}</span>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-900 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col min-w-0 bg-slate-950/20 relative z-10">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-900/60 flex items-center justify-between bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Bot size={16} className="text-primary-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">Chat Assistant</h2>
              <p className="text-[10px] text-slate-500 font-medium">Enterprise RAG Engine · Grounded in your knowledge base</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-850 rounded-full px-3.5 py-1.5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-semibold text-slate-300">Live Context</span>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-500/10 to-blue-600/10 border border-primary-500/20 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                <Sparkles size={28} className="text-primary-400" />
              </div>
              <h3 className="text-3xl font-extrabold mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Enterprise AI Assistant
              </h3>
              <p className="text-slate-455 max-w-md text-sm mb-10 leading-relaxed">
                Hello! Ask any question, and I will search your uploaded knowledge base documents to construct an accurate, citation-backed answer.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {[
                  "What topics are covered in the uploaded documents?",
                  "Summarize the core requirements",
                  "What is the timeline of the project?",
                  "Analyze the key findings"
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-primary-500/30 hover:bg-slate-900/60 transition-all text-sm text-left text-slate-400 hover:text-white shadow-sm hover:shadow-md hover:scale-[1.01]"
                  >
                    <span className="font-medium truncate">{suggestion}</span>
                    <ChevronRight size={14} className="text-slate-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Mapping */}
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end animate-in slide-in-from-right-4 duration-300' : 'justify-start animate-in slide-in-from-left-4 duration-300'}`}>
                
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-primary-500/10">
                    <Bot size={18} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] sm:max-w-xl space-y-2.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  
                  {/* Bubble Content */}
                  <div className={`rounded-2xl px-5 py-4.5 text-sm leading-relaxed shadow-md ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary-600 to-blue-600 text-white rounded-tr-none shadow-primary-950/20'
                      : 'bg-slate-900/40 backdrop-blur-md text-slate-200 border border-slate-900 rounded-tl-none'
                  }`}>
                    <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                  </div>

                  {/* Document Citations / Sources */}
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in duration-500">
                      {msg.sources.map((src, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-full text-slate-400 shadow-sm hover:border-slate-800 transition-colors">
                          <FileText size={10} className="text-primary-400" />
                          <span className="font-semibold truncate max-w-[150px]">{src}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-850 flex items-center justify-center shrink-0 mt-1 shadow-md">
                    <User size={16} className="text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Assistant Loading State */}
          {isLoading && (
            <div className="max-w-3xl mx-auto flex gap-4 justify-start">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/10">
                <Bot size={18} className="text-white animate-pulse" />
              </div>
              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm animate-pulse">
                <div className="flex gap-2 items-center">
                  <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="text-[10px] font-bold text-slate-550 ml-2 uppercase tracking-wider animate-pulse">Formulating response...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto flex justify-center animate-in fade-in duration-300">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold px-4.5 py-3 rounded-xl shadow-md text-center">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Area */}
        <div className="px-6 md:px-12 pb-8 pt-4 border-t border-slate-900/60 bg-slate-950/20 backdrop-blur-md">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full bg-slate-900/40 border border-slate-900 rounded-2xl pl-5 pr-14 py-4.5 text-sm resize-none focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/10 text-white placeholder-slate-500 transition-all leading-relaxed shadow-inner"
              style={{ minHeight: '58px', maxHeight: '200px' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3.5 bottom-3.5 w-9 h-9 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 disabled:from-slate-900 disabled:to-slate-900 disabled:border disabled:border-slate-800/40 text-white disabled:text-slate-650 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary-500/10 hover:scale-105 active:scale-[0.95]"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-600 font-medium tracking-wider uppercase mt-3">
            Grounded RAG Response · Verify critical facts
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
