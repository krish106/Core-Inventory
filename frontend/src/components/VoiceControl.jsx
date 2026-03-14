import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoiceCommand from '../hooks/useVoiceCommand';
import api from '../api/axios';
import { Mic, MicOff, X } from 'lucide-react';

export default function VoiceControl() {
  const { isListening, transcript, error, startListening, stopListening, isSupported } = useVoiceCommand();
  const [result, setResult] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isListening && transcript) {
      processCommand(transcript);
    }
  }, [isListening, transcript]);

  const handleClick = () => {
    if (isListening) { stopListening(); }
    else { setResult(''); setShowOverlay(true); startListening(); }
  };

  const processCommand = async (cmd) => {
    const m = cmd.toLowerCase();
    // Navigation
    if (/go to|open|show|navigate/.test(m)) {
      const routes = { dashboard: '/dashboard', products: '/products', stock: '/stock', receipts: '/receipts', deliveries: '/deliveries', transfers: '/transfers', history: '/move-history', warehouses: '/warehouses', 'purchase orders': '/purchase-orders', 'sales orders': '/sales-orders', returns: '/returns', analytics: '/analytics', settings: '/settings' };
      for (const [key, path] of Object.entries(routes)) {
        if (m.includes(key)) { setResult(`🗺️ Navigating to ${key}...`); setTimeout(() => { navigate(path); setShowOverlay(false); }, 1000); return; }
      }
    }
    // New operations
    if (/create|new/.test(m)) {
      if (/receipt|receive/.test(m)) { setResult('📥 Opening new receipt...'); setTimeout(() => { navigate('/receipts/new'); setShowOverlay(false); }, 1000); return; }
      if (/delivery|deliver/.test(m)) { setResult('📤 Opening new delivery...'); setTimeout(() => { navigate('/deliveries/new'); setShowOverlay(false); }, 1000); return; }
      if (/transfer/.test(m)) { setResult('🔄 Opening new transfer...'); setTimeout(() => { navigate('/transfers/new'); setShowOverlay(false); }, 1000); return; }
    }
    // Send to AI assistant for everything else
    try {
      const { data } = await api.post('/assistant/chat', { message: cmd });
      setResult(data.reply.replace(/\*\*/g, '').replace(/\*/g, ''));
      setTimeout(() => setShowOverlay(false), 4000);
    } catch { setResult('❌ Could not process command.'); }
  };

  if (!isSupported) return null;

  return (
    <>
      <button onClick={handleClick} title="Voice Command"
        className={`relative p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 dark:bg-red-900/40 text-red-600 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        {isListening && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />}
      </button>

      {showOverlay && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => { stopListening(); setShowOverlay(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => { stopListening(); setShowOverlay(false); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className={`absolute inset-0 rounded-full ${isListening ? 'bg-red-500/20 animate-ping' : 'bg-blue-500/20'}`} />
              <div className={`absolute inset-2 rounded-full ${isListening ? 'bg-red-500/30 animate-pulse' : 'bg-blue-500/10'}`} />
              <div className={`absolute inset-4 rounded-full flex items-center justify-center ${isListening ? 'bg-red-500' : 'bg-blue-500'}`}>
                <Mic size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{isListening ? '🎤 Listening...' : result ? '✅ Done' : 'Ready'}</h3>
            {/* Waveform */}
            {isListening && (
              <div className="flex items-center justify-center gap-1 h-10 my-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-red-500 rounded-full animate-wave" style={{ animationDelay: `${i * 0.15}s`, height: '100%' }} />
                ))}
              </div>
            )}
            {transcript && <p className="text-blue-600 dark:text-blue-400 font-medium mt-2 mb-3">"{transcript}"</p>}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {result && <p className="text-gray-700 dark:text-gray-300 text-sm mt-3 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto text-left bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">{result}</p>}
            <p className="text-xs text-gray-400 mt-4">Say: "Check stock for Steel Rods" or "Go to dashboard"</p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .animate-wave { animation: wave 0.8s ease-in-out infinite; }
      `}</style>
    </>
  );
}
