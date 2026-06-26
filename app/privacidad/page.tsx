'use client';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

const SECTIONS = [
  {
    icon: '🗺️', title: 'Coordenadas del mapa — protección anti-saqueo',
    content: `Cuando reportas una ubicación, el sistema aplica automáticamente un "jitter" (desplazamiento aleatorio) de entre 80 y 250 metros en dirección aleatoria. Las coordenadas que aparecen en el mapa público siempre tendrán al menos 80 metros de error respecto a la ubicación real.

Las coordenadas precisas se almacenan en una tabla separada, accesible únicamente por equipos de respuesta verificados (responders y administradores). Ningún endpoint público devuelve coordenadas exactas. Esta medida existe para evitar que actores maliciosos usen el mapa para identificar y acceder a propiedades desocupadas.`
  },
  {
    icon: '🆔', title: 'Cédulas y datos de identidad',
    content: `Las cédulas de identidad se almacenan en la base de datos de forma completa únicamente para permitir el sistema de coincidencias (si buscas a alguien y alguien la reporta, recibes un aviso).

En la interfaz pública, las cédulas siempre se muestran parcialmente enmascaradas: por ejemplo, "V-****567". Solo el personal de respuesta puede ver la cédula completa.

Menores de edad: si alguien marca a una persona como menor, su nombre NO aparece en resultados de búsqueda pública — solo se muestra "Menor reportado".`
  },
  {
    icon: '💬', title: 'Chat y comentarios — moderación anti-estafa',
    content: `Todo texto que se publica en el chat, comentarios de reportes y check-ins "Estoy a salvo" pasa automáticamente por un filtro de moderación antes de ser publicado.

El filtro bloquea:
• Correos electrónicos
• Números de teléfono venezolanos
• Datos de pago: Zelle, Binance Pay/UID, PayPal, Pago Móvil, Zinli, Airtm
• Billeteras de criptomonedas (BTC, ETH, USDT-TRC20)
• Números de cuenta bancaria (20 dígitos)
• URLs y links
• Frases de solicitud de dinero

Los intentos bloqueados se registran en una tabla de auditoría. Los usuarios que reincidan múltiples veces pueden ser silenciados temporalmente. Esta política existe porque en emergencias proliferan estafas que explotan el dolor de las familias.`
  },
  {
    icon: '🔒', title: 'Autenticación y sesiones',
    content: `El acceso requiere registro con correo y contraseña. Las contraseñas se almacenan con bcrypt (hash, nunca en texto plano). Las sesiones se manejan con JWT almacenados en cookies HttpOnly — esto significa que el token de sesión no es accesible desde JavaScript del navegador, protegiendo contra ataques XSS.

No se requiere confirmación de correo porque la urgencia de la situación lo hace impracticable. El correo sirve como mecanismo de rendición de cuentas básico.`
  },
  {
    icon: '👶', title: 'Datos de menores y fallecidos',
    content: `Menores de edad: no se muestra su nombre en búsquedas públicas. Solo aparece "Menor reportado" junto al estado (vivo, refugiado, hospitalizado, etc.).

Fallecidos: los registros con estado "deceased" están excluidos de los resultados de búsqueda pública por privacidad y para proteger a los familiares de recibir esa información sin acompañamiento.`
  },
  {
    icon: '📍', title: 'Datos de la persona buscada',
    content: `No se almacena ninguna dirección exacta del hogar de personas buscadas o encontradas. El diseño es intencional: la dirección de un desaparecido puede ser usada para entrar a su casa.

Los campos disponibles son: municipio y parroquia (zonas geográficas amplias), nombre del hospital o refugio. El teléfono de la persona o de quien reporta es privado y solo accesible por staff.`
  },
  {
    icon: '⏰', title: 'Retención de datos',
    content: `Los reportes de personas tienen una fecha de expiración automática de 90 días desde la creación. Después de ese plazo, los datos de identidad serán eliminados o anonimizados.

Los reportes del mapa no tienen expiración automática en esta versión — pueden ser marcados como "resueltos" por los usuarios.`
  },
  {
    icon: '🔓', title: 'Qué datos NO recopilamos',
    content: `• No hay rastreo de analítica de terceros (sin Google Analytics, sin Facebook Pixel).
• No se comparten datos con anunciantes ni terceros comerciales.
• No se recopilan datos de ubicación pasiva — solo la que tú envías al crear un reporte.
• No hay cookies de marketing.`
  },
];

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>🔒 Privacidad y protección de datos</h1>
          <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>
            Esta plataforma fue diseñada con privacidad como requisito central, especialmente para proteger a los más vulnerables en una situación de emergencia.
          </p>
          <div className="text-xs rounded-xl px-3 py-2 mb-8"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            Última actualización: 24 de junio de 2026 · Plataforma de código abierto y uso humanitario.
          </div>

          <div className="space-y-6">
            {SECTIONS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <h2 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{s.title}</h2>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
                  {s.content}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl p-5" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <div className="font-bold text-sm mb-2" style={{ color: '#15803D' }}>✅ Compromiso de la plataforma</div>
            <p className="text-sm" style={{ color: '#166534' }}>
              Esta plataforma no tiene fines comerciales. Fue creada para ayudar en una emergencia real. Los datos serán eliminados o anonimizados una vez que la crisis de emergencia haya pasado. Nadie pedirá dinero a cambio de ayuda a través de esta plataforma.
            </p>
          </div>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
            <Link href="/" style={{ color: 'var(--primary)' }}>← Volver al mapa</Link>
          </p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
