'use client';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { useSse } from '../sse-provider';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  seeking_info: 'Buscando información', self_safe: 'Se reportó a salvo',
  found_alive: 'Encontrado con vida', injured: 'Herido',
  hospitalized: 'Hospitalizado', sheltered: 'En refugio', unknown: 'Desconocido',
};
const STATUS_COLOR: Record<string, string> = {
  self_safe: '#16A34A', found_alive: '#16A34A', injured: '#EA580C',
  hospitalized: '#EAB308', sheltered: '#0D9488', seeking_info: '#64748B', unknown: '#94A3B8',
};

export default function NotificacionesPage() {
  const { notifications } = useSse();

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>🔔 Notificaciones</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            Avisos de coincidencias cuando alguien reporta una cédula que estás vigilando.
          </p>

          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔕</div>
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>Sin notificaciones aún</p>
              <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-2)' }}>
                Activa avisos desde la búsqueda para ser notificado cuando alguien reporte una cédula.
              </p>
              <Link href="/buscar">
                <motion.div whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: 'var(--primary)' }}>
                  Ir a Buscar persona
                </motion.div>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map(n => (
                  <motion.div key={n.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                        style={{ background: (STATUS_COLOR[n.status] || '#64748B') + '20' }}>
                        🔔
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Cédula <strong>{n.cedula_norm}</strong> fue reportada
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: STATUS_COLOR[n.status] || '#64748B' }}>
                          Estado: {STATUS_LABEL[n.status] || n.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] mt-2" style={{ color: 'var(--text-3)' }}>
                      {new Date(n.created_at).toLocaleString('es-VE')}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
