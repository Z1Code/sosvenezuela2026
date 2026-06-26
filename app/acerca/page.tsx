'use client';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function AcercaPage() {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🇻🇪</div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Acerca de esta plataforma</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>Terremoto VE · Red de Apoyo Ciudadano · 24 jun 2026</p>
          </div>

          <div className="rounded-3xl p-6 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>Por qué la hice</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              <p>
                El 24 de junio de 2026, Venezuela sufrió dos terremotos consecutivos —M7.1 y M7.5— en Yaracuy y Carabobo, con daños que se sintieron desde Caracas hasta Zulia. Mientras las redes sociales se llenaban de mensajes desesperados, no había un lugar único donde coordinar, buscar a los seres queridos o ver el daño en tiempo real.
              </p>
              <p>
                Esa tarde, con los teléfonos saturados y las familias sin noticias, decidí construir esto: una plataforma simple, rápida y pensada para Venezuela — con anti-saqueo, sin rastreo, sin monetización.
              </p>
              <p>
                No soy una organización. Soy un venezolano que sabe programar y quiso ayudar de la única forma que puede. Si ayudó a una sola familia a encontrar a un ser querido, valió la pena.
              </p>
            </div>
          </div>

          <div className="rounded-3xl p-6 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-bold text-base mb-3" style={{ color: 'var(--text-1)' }}>Principios de diseño</h2>
            <div className="space-y-3">
              {[
                { icon: '🛡️', text: 'Anti-saqueo: las coordenadas exactas NUNCA son públicas.' },
                { icon: '🔒', text: 'Sin rastreo, sin anuncios, sin fines comerciales.' },
                { icon: '🌐', text: 'Funciona en 3G y conexiones lentas.' },
                { icon: '🤝', text: 'Sin pedir dinero a cambio de ayuda, nunca.' },
                { icon: '📖', text: 'Primeros auxilios basados en Cruz Roja, OMS y FEMA.' },
              ].map(item => (
                <div key={item.icon} className="flex items-start gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SUPPORT QR */}
          <div className="rounded-3xl p-6 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-bold text-base mb-2" style={{ color: 'var(--text-1)' }}>¿Quieres apoyar el proyecto?</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Esta plataforma es completamente gratuita y sin anuncios. Si tienes la posibilidad de apoyar para cubrir costos del servidor, te lo agradezco — pero no es obligatorio en absoluto. Primero ayuda a quien más lo necesite.
            </p>
            <div className="text-center">
              <div className="inline-block rounded-2xl p-3 mb-2" style={{ background: '#F7931A20', border: '1px solid #F7931A40' }}>
                <img src="/binance-qr.png" alt="QR de apoyo — Binance Pay"
                  className="w-40 h-40 mx-auto rounded-xl"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Binance Pay · Solo si puedes y quieres 🙏</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 text-center text-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            Hecho con urgencia y amor desde Venezuela 🇻🇪<br />
            <span className="text-xs mt-1 block" style={{ color: 'var(--text-3)' }}>
              <Link href="/privacidad" className="underline">Ver política de privacidad</Link>
            </span>
          </div>

        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
