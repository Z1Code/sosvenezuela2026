// Anti-fraud filter: blocks emails, payment handles, crypto wallets, and begging phrases

const PATRONES = {
  email:      /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i,
  telefono:   /(?:\+?58[\s\-]?|0)(?:4(?:12|14|16|22|24|26))[\s\-]?\d{3}[\s\-]?\d{4}/,
  handlePago: /\b(zelle|binance(?:\s?pay)?|pay\s?id|\buid\b|paypal|zinli|airtm|wally|reserve|cashea|pagom[oó]vil|pago\s?m[oó]vil)\b/i,
  binanceId:  /\bbinance\b[\s\S]{0,30}?\b\d{8,10}\b|\b(?:pay\s?id|uid)\b[\s:]*\d{8,10}/i,
  cripto_btc: /\b(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/,
  cripto_eth: /\b0x[a-fA-F0-9]{40}\b/,
  cripto_trx: /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/,
  redCripto:  /\b(usdt|usdc|trc-?20|erc-?20|tron|tether|cripto|wallet|metamask)\b/i,
  cuentaBs:   /\b\d{20}\b/,
  url:        /\bhttps?:\/\/|\b[a-z0-9.\-]+\.(com|net|org|me|io|app|ly)\b/i,
  mendicidad: /\b(ay[uú]dame\s+con|col[aá]borame|env[ií]enme\s+(a|al)|mi\s+(cuenta|zelle|pago)\s+es|para\s+(una\s+)?recarga|me\s+depositen|acepto\s+(zelle|pago|binance|cripto)|aporten?\s+a|don[ae]ciones?\s+a)\b/i,
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[_\-\.]/g, ' ')
    .toLowerCase();
}

export interface ResultadoMod {
  bloqueado: boolean;
  categorias: string[];
}

// X/Twitter links are allowed (informational). Strip them before moderating so
// they don't trip the generic URL rule, while everything else stays blocked.
const X_URL = /\bhttps?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/[^\s]+/gi;

export function moderarTexto(texto: string): ResultadoMod {
  const limpio = texto.replace(X_URL, ' ');
  const norm = normalizar(limpio);
  const categorias: string[] = [];

  if (PATRONES.email.test(norm)) categorias.push('email');
  if (PATRONES.telefono.test(limpio)) categorias.push('telefono');
  if (PATRONES.handlePago.test(norm)) categorias.push('pago');
  if (PATRONES.binanceId.test(norm)) categorias.push('binance_id');
  if (PATRONES.cripto_btc.test(limpio)) categorias.push('cripto_btc');
  if (PATRONES.cripto_eth.test(limpio)) categorias.push('cripto_eth');
  if (PATRONES.cripto_trx.test(limpio)) categorias.push('cripto_trx');
  if (PATRONES.redCripto.test(norm)) categorias.push('red_cripto');
  if (PATRONES.cuentaBs.test(limpio)) categorias.push('cuenta_bs');
  if (PATRONES.url.test(norm)) categorias.push('url');
  if (PATRONES.mendicidad.test(norm)) categorias.push('mendicidad');

  return { bloqueado: categorias.length > 0, categorias };
}
