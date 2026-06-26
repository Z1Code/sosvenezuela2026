'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ve_bienvenida')) {
      setOpen(true);
    }
  }, []);

  function cerrar() {
    localStorage.setItem('ve_bienvenida', '1');
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
            style={{ background: '#fff' }}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🫂</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                Estás aquí. Respira, no estás solo.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Sentir miedo o confusión ahora es completamente normal. Esta red es para ayudarnos entre todos, paso a paso.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { icon: '📍', label: 'Reportar lo que veo', href: '/reportar' },
                { icon: '🔎', label: 'Buscar a alguien', href: '/buscar' },
                { icon: '🩹', label: 'Ver recomendaciones de seguridad', href: '/recomendaciones' },
              ].map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                >
                  <Link href={item.href} onClick={cerrar}
                    className="flex items-center gap-3 p-3 rounded-2xl text-sm font-medium transition-colors"
                    style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="rounded-2xl p-3 mb-5 text-xs" style={{ background: '#F0FDF4', color: '#15803D' }}>
              🔒 Tus datos están protegidos. Solo compartes lo que decides. <strong>Nadie te pedirá dinero a cambio de ayuda.</strong>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={cerrar}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm"
              style={{ background: 'var(--primary)' }}
            >
              Entendido, abrir el mapa →
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
