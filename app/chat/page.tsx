'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { useSse, ChatEvent } from '../sse-provider';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { chats } = useSse();

  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(setMessages);
  }, []);

  const all = (() => {
    const ids = new Set(messages.map(m => m.id));
    return [...messages, ...chats.filter(c => !ids.has(c.id))];
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [all.length]);

  async function send() {
    if (!input.trim()) return;
    setSending(true); setError('');
    const res = await fetch('/api/chat', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ body: input.trim() })
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error); return; }
    setInput('');
    fetch('/api/chat').then(r => r.json()).then(setMessages);
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
      {/* HEADER */}
      <div className="px-4 pt-8 pb-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>💬 Canal operativo</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Solo información verificada. Moderado automáticamente.</p>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <AnimatePresence initial={false}>
          {all.map(m => (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-3">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{m.full_name || 'Usuario'}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  {new Date(m.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm max-w-xs"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
                {m.body}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="fixed left-0 right-0 px-4 py-3" style={{ bottom: '64px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        {error && (
          <div className="text-xs mb-2 px-3 py-1.5 rounded-xl" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</div>
        )}
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escribe un mensaje..." maxLength={500}
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ border: '1.5px solid var(--border)', background: 'var(--bg)' }} />
          <motion.button whileTap={{ scale: 0.93 }} onClick={send} disabled={sending}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
            style={{ background: 'var(--primary)', flexShrink: 0 }}>
            {sending ? '…' : '→'}
          </motion.button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
