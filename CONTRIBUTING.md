# Contribuir a SOS Venezuela 2026

¡Gracias por querer ayudar! Esta es una plataforma civil sin fines de lucro para la
respuesta al terremoto del 24-jun-2026 en Venezuela. Toda contribución que mejore la
utilidad para las personas afectadas es bienvenida.

## Cómo colaborar

1. Haz un **fork** del repositorio.
2. Crea una rama: `git checkout -b feat/mi-mejora`.
3. Configura el entorno (ver más abajo) y haz tus cambios.
4. Asegúrate de que `npx tsc --noEmit` pasa sin errores.
5. Haz commit con mensajes claros y abre un **Pull Request** describiendo el qué y el porqué.

## Entorno local

Requisitos: Node.js 22+, PostgreSQL.

```bash
npm install
cp .env.example .env.local   # rellena con tus valores
npm run dev                  # http://localhost:3000
```

Nunca subas `.env.local` ni ningún secreto. El `.gitignore` ya los protege; revisa
tu diff antes de commitear.

## Lineamientos

- **Privacidad primero.** No expongas datos sensibles: cédulas completas, coordenadas
  exactas, contactos ni datos de menores. Mantén el enmascarado existente.
- **Cambios quirúrgicos.** Toca solo lo necesario para tu mejora; respeta el estilo del código.
- **Simplicidad.** Prefiere la solución mínima que resuelve el problema.
- **Sin secretos en el código.** Todo lo sensible va por variables de entorno.

## ¿Dónde ayudar?

- 🗺️ Mejoras de UX/accesibilidad en el mapa y los directorios.
- 🔌 Integraciones con la [API pública](https://sosvenezuela2026.com/docs) (mapas, bots, dashboards).
- 🌐 Traducciones y textos.
- 🐛 Corrección de bugs y rendimiento.
- 📥 Nuevas fuentes de datos verificables (con deduplicación).

## Reportar vulnerabilidades

Si encuentras un problema de seguridad, repórtalo de forma **privada** (no abras un issue
público) antes de divulgarlo, para proteger a las personas en la plataforma.

## Licencia

Al contribuir, aceptas que tu aporte se licencie bajo [MIT](./LICENSE).
