import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Sparkles, X, Send, Mic, ArrowRight } from 'lucide-react';

const QUICK_CHIPS = [
  { label: '📊 Summary', message: 'Give me a summary' },
  { label: '⚠️ Low Stock', message: "What's running low?" },
  { label: '📋 Recent', message: 'What happened today?' },
  { label: '🎯 Suggestions', message: 'What should I do?' },
];

const INITIAL_MSG = {
  role: 'bot',
  text: "👋 Hi! I'm your **Inventory Assistant**. I can help you:\n\n• Check stock levels\n• Find low stock items\n• Create operations quickly\n• Get daily summaries\n\nTry asking: *\"What's running low?\"*",
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/assistant/chat', { message: text.trim() });
      setMessages(prev => [...prev, { role: 'bot', text: data.reply, actions: data.actions }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: '❌ Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open ? 'bg-gray-700 rotate-90 scale-90' : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:scale-110 animate-ai-pulse'
        }`}>
        {open ? <X size={22} className="text-white" /> : <Sparkles size={24} className="text-white" />}
      </button>

      {/* Chat Panel */}
      <div className={`fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
        open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'
      }`} style={{ height: '520px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">Inventory Assistant</h3>
            <p className="text-white/70 text-xs">AI-powered • Real-time data</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: 'smooth' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                {msg.actions?.map((a, j) => (
                  <button key={j} onClick={() => { navigate(a.path); setOpen(false); }}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors w-full justify-center">
                    {a.label} <ArrowRight size={12} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick Chips */}
        <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto flex-nowrap">
          {QUICK_CHIPS.map((c, i) => (
            <button key={i} onClick={() => sendMessage(c.message)} disabled={loading}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors disabled:opacity-40 shrink-0">
              {c.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Ask about your inventory..."
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400" />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:shadow-lg transition-all">
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ai-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
          50% { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
        }
        .animate-ai-pulse { animation: ai-pulse 2.5s infinite; }
      `}</style>
    </>
  );
}
