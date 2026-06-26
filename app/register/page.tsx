'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

function RegisterForm() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.user) router.replace(redirect);
    }).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(redirect);
  }

  function googleLogin() {
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirect)}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl shadow-xl p-8" style={{ background: '#fff' }}>

        <Link href="/" className="flex items-center gap-2 mb-8">
          <span className="text-2xl">🇻🇪</span>
          <div>
            <div className="font-bold text-sm" style={{ color: '#0F172A' }}>SOS Venezuela 2026</div>
            <div className="text-[10px]" style={{ color: '#94A3B8' }}>← Volver al inicio</div>
          </div>
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Crear cuenta</h1>
        <p className="text-sm mb-6" style={{ color: '#64748B' }}>Sin confirmación de correo. Tu ayuda es urgente.</p>

        <motion.button whileTap={{ scale: 0.97 }} onClick={googleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl mb-4 font-semibold text-sm"
          style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#0F172A' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Registrarse con Google
        </motion.button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
          <span className="text-xs" style={{ color: '#94A3B8' }}>o con correo</span>
          <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#475569' }}>Nombre (opcional)</label>
            <input type="text" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }} placeholder="Tu nombre" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#475569' }}>Correo</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }} placeholder="tu@correo.com" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#475569' }}>Contraseña (mín. 8 caracteres)</label>
            <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }} placeholder="········" />
          </div>
          <p className="text-[10px]" style={{ color: '#94A3B8' }}>
            Al registrarte aceptas usar la plataforma de buena fe.{' '}
            <Link href="/privacidad" className="underline">Ver política de privacidad</Link>.
          </p>
          {error && <p className="text-xs rounded-xl px-3 py-2" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm"
            style={{ background: loading ? '#94A3B8' : '#0D9488' }}>
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </motion.button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: '#94A3B8' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href={`/login?redirect=${redirect}`} className="font-medium" style={{ color: '#0D9488' }}>Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{background:'#F8FAFC'}} />}>
      <RegisterForm />
    </Suspense>
  );
}
