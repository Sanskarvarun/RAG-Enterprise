import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendQuestionStream, getConversations, getMessages, deleteConversation } from '../api/chat';
import { Link } from 'react-router-dom';
import {
  Send, Plus, Trash2, MessageSquare, FileText,
  Bot, User, Loader2, BookOpen, ChevronRight, Home, LogOut
} from 'lucide-react';

// Minimalist Markdown-like renderer
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
        return <strong key={index} className="font-semibold text-zinc-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-zinc-450">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`list-${keyPrefix}`} className="list-disc pl-5 space-y-1.5 my-2 text-zinc-300">
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed text-sm">{parseInline(item)}</li>
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
        <pre key={idx} className="bg-zinc-900 rounded-lg p-4 my-2 text-xs font-mono text-zinc-350 overflow-x-auto border border-zinc-800">
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
          renderedElements.push(<hr key={idx} className="border-zinc-800 my-4" />);
        } else if (trimmed.startsWith('### ')) {
          renderedElements.push(
            <h3 key={idx} className="text-sm font-semibold text-zinc-100 mt-4 mb-1.5">
              {parseInline(trimmed.slice(4))}
            </h3>
          );
        } else if (trimmed.startsWith('## ')) {
          renderedElements.push(
            <h2 key={idx} className="text-base font-semibold text-zinc-100 mt-5 mb-2 border-b border-zinc-800 pb-1">
              {parseInline(trimmed.slice(3))}
            </h2>
          );
        } else if (trimmed.startsWith('# ')) {
          renderedElements.push(
            <h1 key={idx} className="text-lg font-bold text-zinc-100 mt-6 mb-2.5">
              {parseInline(trimmed.slice(2))}
            </h1>
          );
        } else if (trimmed.length > 0) {
          renderedElements.push(
            <p key={idx} className={`leading-relaxed text-sm my-1.5 ${isUser ? 'text-zinc-100' : 'text-zinc-300'}`}>
              {parseInline(line)}
            </p>
          );
        } else {
          renderedElements.push(<div key={idx} className="h-1.5" />);
        }
      }
    }
  });

  flushList('final');

  return <div className="space-y-1">{renderedElements}</div>;
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
    if (!window.confirm("Delete this conversation?")) return;
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

    // Optimistically add user message and an empty assistant response slot
    const userMsgId = Date.now();
    const tempUserMsg = { id: userMsgId, role: 'user', content: question, sources: [] };
    const assistantMsgId = userMsgId + 1;
    const tempAssistantMsg = { id: assistantMsgId, role: 'assistant', content: '', sources: [] };

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsLoading(true);

    let accumulatedAnswer = '';

    try {
      await sendQuestionStream(
        token,
        question,
        activeConvId,
        (chunk) => {
          accumulatedAnswer += chunk;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedAnswer }
                : msg
            )
          );
        },
        async ({ conversationId, sources }) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedAnswer, sources: sources || [] }
                : msg
            )
          );
          setIsLoading(false);
          if (!activeConvId) {
            setActiveConvId(conversationId);
            await loadConversations();
          }
        },
        (errMessage) => {
          setError(errMessage || 'Failed to stream response.');
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to get a response. Please try again.');
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
    <div className="flex h-screen bg-zinc-950 text-zinc-105 overflow-hidden font-sans antialiased">
      
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-zinc-900 border-r border-zinc-800/80 flex flex-col relative z-20">
        
        {/* Sidebar Header */}
        <div className="px-6 py-5 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Bot size={16} className="text-zinc-350" />
            </div>
            <div>
              <h1 className="font-semibold text-xs tracking-wide text-zinc-200">Assistant Hub</h1>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition-colors shadow-sm"
          >
            <Plus size={14} />
            New Chat
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/documents"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium text-zinc-400 bg-zinc-900/40 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
            >
              <BookOpen size={12} />
              Documents
            </Link>
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium text-zinc-400 bg-zinc-900/40 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
            >
              <Home size={12} />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Recent Chats List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="px-3 mb-2 flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Conversations</p>
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-6 px-4 bg-zinc-950/20 border border-zinc-850 rounded-lg">
              <p className="text-[11px] text-zinc-500">No chat history.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors group ${
                    activeConvId === conv.id 
                      ? 'bg-zinc-800 text-zinc-100 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare size={13} className="text-zinc-500 shrink-0" />
                    <span className="truncate text-left">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Account Section */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                {user ? user.username.slice(0, 2).toUpperCase() : 'AI'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-zinc-300 block truncate leading-none">{user ? user.full_name || user.username : 'User'}</span>
                <span className="text-[10px] text-zinc-555 block truncate mt-0.5">{user ? user.email : ''}</span>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-zinc-800 rounded transition-colors"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col min-w-0 bg-zinc-950">
        
        {/* Header */}
        <div className="px-8 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h2 className="font-semibold text-sm text-zinc-200">Chat Session</h2>
            <p className="text-[10px] text-zinc-500">Retrieval Augmented Generation with uploaded context</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
            <span className="text-[10px] font-medium text-zinc-400">Grounded Mode</span>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-grow overflow-y-auto px-6 md:px-16 py-8 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 text-zinc-400">
                <Bot size={20} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-zinc-200">
                Knowledge Assistant
              </h3>
              <p className="text-zinc-500 text-xs max-w-sm mb-8 leading-relaxed">
                Query your local database or documents. Ask a question, and the assistant will search your files and provide a complete answer with citations.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  "What topics are covered in the uploaded documents?",
                  "Summarize the core requirements",
                  "What is the timeline of the project?",
                  "Analyze the key findings"
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/60 transition-all text-xs text-left text-zinc-400 hover:text-zinc-200"
                  >
                    <span className="truncate">{suggestion}</span>
                    <ChevronRight size={12} className="text-zinc-500 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Mapping */}
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2 animate-in fade-in duration-200">
                
                {/* Avatar Label */}
                <div className="flex items-center gap-2">
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Bot size={11} className="text-zinc-400" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Assistant</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <User size={11} className="text-zinc-400" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">User</span>
                    </>
                  )}
                </div>
                
                {/* Bubble Content */}
                <div className={`text-sm leading-relaxed px-5 py-4 rounded-xl border ${
                  msg.role === 'user'
                    ? 'bg-zinc-900/40 border-zinc-850 text-zinc-100'
                    : 'bg-transparent border-transparent text-zinc-200 pl-5 border-l-2 border-zinc-800 rounded-none'
                }`}>
                  <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                </div>

                {/* Citations / Sources */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-5">
                    {msg.sources.map((src, i) => (
                      <div key={i} className="flex items-center gap-1.2 text-[9px] bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded text-zinc-500">
                        <FileText size={9} className="text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[120px] ml-1">{src}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Assistant Loading State (Only show before first chunk arrives) */}
          {isLoading && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant' || !messages[messages.length - 1].content) && (
            <div className="max-w-2xl mx-auto space-y-2 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Bot size={11} className="text-zinc-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Assistant</span>
              </div>
              <div className="text-sm pl-5 border-l-2 border-zinc-850 py-2">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto flex justify-center mt-4">
              <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm text-center">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Area */}
        <div className="px-6 md:px-16 pb-8 pt-2 bg-zinc-950 border-t border-zinc-900">
          <div className="max-w-2xl mx-auto relative flex items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              className="w-full bg-zinc-900 border border-zinc-850 rounded-lg pl-4 pr-12 py-3.5 text-sm resize-none focus:outline-none focus:border-zinc-700 text-zinc-100 placeholder-zinc-500 leading-relaxed shadow-sm"
              style={{ minHeight: '48px', maxHeight: '200px' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3.5 bottom-2.5 w-7 h-7 bg-zinc-850 border border-zinc-750 hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed rounded flex items-center justify-center transition-colors shadow-sm text-zinc-400"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
          <p className="text-center text-[9px] text-zinc-650 font-medium tracking-wider uppercase mt-2">
            Grounded by local context files
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
