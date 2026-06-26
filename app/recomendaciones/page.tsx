'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';

const SECTIONS = [
  {
    id: 1, icon: '🏠', title: 'Durante el sismo y las réplicas',
    content: `AGÁCHATE, CÚBRETE y AGÁRRATE (Drop, Cover, Hold On).

1. Agáchate al piso antes de que el sismo te tumbe.
2. Cúbrete cabeza y cuello bajo una mesa resistente. Si no hay, junto a un muro interior lejos de ventanas.
3. Agárrate del mueble y muévete con él hasta que pare.

Tras el sismo principal espera réplicas — repite la maniobra.

❌ NO uses el "triángulo de la vida": es un MITO. Cruz Roja, USGS y Protección Civil lo desmienten. Puede costarte la vida.
❌ NO corras hacia afuera durante el sismo (caída de fachadas/vidrios).
❌ NO uses ascensores.`
  },
  {
    id: 2, icon: '🆘', title: 'Si quedas atrapado',
    content: `1. Cúbrete boca y nariz con tela para no inhalar polvo.
2. Golpea tuberías o paredes rítmicamente — el sonido viaja mejor.
3. Usa un silbato si tienes uno.
4. Grita solo como último recurso (agota energía e inhala polvo).

❌ NO enciendas fósforos ni encendedores (posible fuga de gas).
❌ NO te muevas bruscamente ni levantes polvo.`
  },
  {
    id: 3, icon: '🩸', title: 'Hemorragias',
    content: `1. Aplica presión directa firme y constante sobre la herida con gasa o tela limpia.
2. Si la sangre traspasa, añade tela encima — NO retires la primera.
3. Hemorragia masiva en brazo/pierna que no cede: torniquete 5–7 cm por encima, apretando hasta que pare. Anota la hora.

❌ NO retires el torniquete una vez puesto (solo personal médico).
❌ NO apliques torniquete en cuello ni torso — ahí empaqueta y presiona.`
  },
  {
    id: 4, icon: '🦴', title: 'Fracturas e inmovilización',
    content: `1. Inmoviliza la zona en la posición en que está con férula improvisada (tabla, cartón).
2. Cubre articulaciones por encima y por debajo.
3. Aplica frío sobre la tela, nunca directo a la piel.

❌ NO intentes "acomodar" el hueso ni empujar fragmentos visibles.
⚠️ Sospecha de lesión de columna (caída o golpe en cabeza/cuello/espalda): NO muevas a la persona salvo peligro inmediato. Mantén cabeza y cuello alineados.`
  },
  {
    id: 5, icon: '❤️', title: 'RCP y posición lateral de seguridad',
    content: `Si NO respira normalmente:
1. Boca arriba en superficie firme.
2. Talón de una mano en el centro del pecho, la otra encima.
3. Comprime fuerte y rápido: al menos 5 cm de profundidad, 100–120 por minuto.
4. Deja que el pecho suba entre cada compresión.
5. No pares hasta que llegue ayuda o respire.

Si respira pero está inconsciente: posición lateral de seguridad (de costado) y vigílala.`
  },
  {
    id: 6, icon: '🦵', title: 'Síndrome de aplastamiento',
    content: `Un miembro aplastado por más de ~1 hora acumula toxinas musculares. Liberarlo de golpe puede causar paro cardíaco o fallo renal agudo.

⚠️ NO liberes súbitamente un miembro atrapado prolongadamente sin ayuda médica en camino.
✅ Mantén a la persona hidratada y abrigada mientras esperas rescate especializado.
✅ La liberación ideal se hace con hidratación/atención médica iniciada antes.

Fuente: INSARAG/OMS — Protocolo de paciente atrapado con síndrome de aplastamiento`
  },
  {
    id: 7, icon: '🔥', title: 'Quemaduras, shock e hipotermia',
    content: `Quemaduras:
• Enfría con agua a temperatura ambiente 10–20 minutos.
• Cubre con tela limpia.
❌ NO apliques hielo, pasta, aceite ni revientes ampollas.
❌ NO retires ropa pegada a la piel.

Shock (piel pálida/fría, pulso rápido, confusión):
• Acuesta a la persona, eleva piernas (si no hay fractura), abriga.

Hipotermia:
• Retira ropa mojada, abriga con mantas, cubre la cabeza.
• Bebidas tibias si está consciente.
❌ NO des alcohol ni friegues bruscamente.`
  },
  {
    id: 8, icon: '⚡', title: 'Gas, electricidad e incendios',
    content: `Gas (olor a gas o silbido):
• NO enciendas luces ni llamas.
• Cierra la llave de gas.
• Abre ventanas y sal.
• NO acciones interruptores.

Electricidad:
• Corta el suministro general desde el tablero.
• NO toques cables caídos ni a alguien en contacto con ellos.

Incendio pequeño:
• Usa extintor (apunta a la base).
• Si no lo controlas, evacúa. Cierra puertas tras de ti.`
  },
  {
    id: 9, icon: '💧', title: 'Agua segura',
    content: `El agua contaminada puede causar epidemias días después del sismo.

Para agua de dudosa procedencia:
• Hierve 1 minuto (rolling boil) — en alturas más de 2 km, 3 minutos.
• O desinfecta con cloro/hipoclorito (gotas según concentración del producto), espera 30 minutos antes de beber.

❌ NO bebas agua de fuentes inundadas o cerca de aguas servidas.
✅ Lávate las manos con frecuencia.
✅ Separa residuos para prevenir vectores.`
  },
  {
    id: 10, icon: '👨‍👩‍👧', title: 'Poblaciones vulnerables',
    content: `Niños:
• Mantenlos cerca, explica con calma lo que ocurre.
• Evita que vean imágenes muy perturbadoras.

Embarazadas:
• Reposo e hidratación. Busca atención ante sangrado o contracciones.

Adultos mayores:
• Asegura medicamentos, lentes y ayudas para movilidad.

Personas con discapacidad:
• Pregunta cómo ayudar — no las separes de bastón, silla u apoyos.`
  },
  {
    id: 11, icon: '🧠', title: 'Primeros auxilios psicológicos',
    content: `Principio OMS-IASC: OBSERVAR → ESCUCHAR → CONECTAR

• Acércate con calma y ofrece seguridad.
• Ofrece agua y abrigo antes de hablar.
• Escucha sin presionar a hablar; valida lo que siente.
• Conecta con seres queridos e información veraz.

❌ NO fuerces el relato del trauma.
❌ NO minimices ("eso no fue nada", "ya va a pasar").
❌ NO hagas promesas imposibles ("encontraremos a todos").

Las reacciones de estrés agudo (llanto, parálisis, confusión) son NORMALES. No son signos de debilidad.`
  },
  {
    id: 12, icon: '🎒', title: 'Kit de emergencia',
    content: `Para 3 días por persona:
• 💧 Agua: al menos 4 litros/persona/día
• 🥫 Alimentos no perecederos
• 🩺 Botiquín: gasas, torniquete, vendas, guantes, antisépticos
• 🔦 Linterna y radio a pilas (con pilas extras)
• 🔊 Silbato
• 😷 Mascarilla antipolvo (N95 si hay)
• 💊 Medicamentos personales (al menos 7 días)
• 📄 Copias de documentos importantes
• 💵 Efectivo en monedas pequeñas
• 🌡️ Abrigo (manta térmica)
• 🔧 Herramienta multiusos / navaja
• 🪔 Encendedor`
  },
];

export default function RecomendacionesPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>🩹 Primeros auxilios</h1>
          <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>
            Ante cualquier emergencia llama al <strong>171</strong> (emergencias Venezuela).
          </p>
          <div className="text-xs rounded-xl px-3 py-2 mb-6"
            style={{ background: '#F0F9FF', color: '#0369A1' }}>
            📚 Basado en Cruz Roja Venezolana, OMS/OPS, FEMA y INSARAG. No sustituye atención médica profesional.
          </div>

          <div className="space-y-3">
            {SECTIONS.map(s => (
              <motion.div key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="flex-1 font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{s.title}</span>
                  <motion.span animate={{ rotate: open === s.id ? 180 : 0 }}
                    style={{ color: 'var(--text-3)' }}>▾</motion.span>
                </button>
                <AnimatePresence>
                  {open === s.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-5 pb-5">
                        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '12px' }} />
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap"
                          style={{ color: 'var(--text-2)', fontFamily: 'inherit' }}>
                          {s.content}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl p-4" style={{ background: '#FEF9C3', border: '1px solid #FDE047' }}>
            <div className="font-bold text-sm mb-1" style={{ color: '#713F12' }}>🚨 Número de emergencias</div>
            <div className="text-3xl font-black" style={{ color: '#DC2626' }}>171</div>
            <div className="text-xs mt-1" style={{ color: '#713F12' }}>Protección Civil — Venezuela</div>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
