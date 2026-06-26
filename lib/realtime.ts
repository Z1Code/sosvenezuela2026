// Central SSE state: one Map of active connections + one central poll

import pool from './db';

export interface SseClient {
  userId: string;
  role: string;
  controller: ReadableStreamDefaultController;
  lastSeen: number;
}

const clients = new Map<string, SseClient>();

// Track last timestamps for delta queries
let lastHazardTs = new Date(Date.now() - 5000).toISOString();
let lastChatTs   = new Date(Date.now() - 5000).toISOString();
let lastNotifTs  = new Date(Date.now() - 5000).toISOString();
let lastCheckinTs = new Date(Date.now() - 5000).toISOString();
let lastCommentTs = new Date(Date.now() - 5000).toISOString();
let lastReactionTs = new Date(Date.now() - 5000).toISOString();

let pollStarted = false;

function send(client: SseClient, event: string, data: unknown) {
  try {
    client.controller.enqueue(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    );
    client.lastSeen = Date.now();
  } catch {
    clients.delete(client.userId + Math.random());
  }
}

function broadcast(event: string, data: unknown) {
  clients.forEach(c => send(c, event, data));
}

function broadcastPresence() {
  const now = Date.now();
  const count = [...clients.values()].filter(c => now - c.lastSeen < 60000).length;
  broadcast('presence', { count });
}

async function poll() {
  try {
    const db = await pool.connect();
    try {
      // Hazard deltas
      const hq = await db.query(
        `SELECT id, category, severity, resource_status, verification, title,
                lat_pub, lng_pub, municipio, parroquia, created_at
         FROM hazard_reports
         WHERE created_at > $1 AND deleted_at IS NULL
         ORDER BY created_at`,
        [lastHazardTs]
      );
      if (hq.rows.length) {
        lastHazardTs = hq.rows[hq.rows.length - 1].created_at.toISOString();
        broadcast('hazard', hq.rows);
      }

      // Chat deltas
      const cq = await db.query(
        `SELECT cm.id, cm.channel, cm.body, cm.created_at, u.full_name
         FROM chat_messages cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.created_at > $1
         ORDER BY cm.created_at`,
        [lastChatTs]
      );
      if (cq.rows.length) {
        lastChatTs = cq.rows[cq.rows.length - 1].created_at.toISOString();
        broadcast('chat', cq.rows);
      }

      // Notifications (per-user)
      const nq = await db.query(
        `SELECT n.id, n.watcher_id, n.cedula_norm, n.status, n.created_at
         FROM notifications n
         WHERE n.created_at > $1
         ORDER BY n.created_at`,
        [lastNotifTs]
      );
      if (nq.rows.length) {
        lastNotifTs = nq.rows[nq.rows.length - 1].created_at.toISOString();
        nq.rows.forEach(row => {
          clients.forEach(c => {
            if (c.userId === row.watcher_id) {
              send(c, 'match', row);
            }
          });
        });
      }

      // Checkins
      const scq = await db.query(
        `SELECT sc.id, sc.estado, sc.msg, sc.created_at, u.full_name
         FROM safe_checkin sc
         JOIN users u ON u.id = sc.user_id
         WHERE sc.created_at > $1
         ORDER BY sc.created_at`,
        [lastCheckinTs]
      );
      if (scq.rows.length) {
        lastCheckinTs = scq.rows[scq.rows.length - 1].created_at.toISOString();
        broadcast('checkin', scq.rows);
      }

      // Comments
      const coq = await db.query(
        `SELECT rc.id, rc.report_id, rc.body, rc.created_at, u.full_name
         FROM report_comment rc
         JOIN users u ON u.id = rc.user_id
         WHERE rc.created_at > $1 AND rc.hidden = false
         ORDER BY rc.created_at`,
        [lastCommentTs]
      );
      if (coq.rows.length) {
        lastCommentTs = coq.rows[coq.rows.length - 1].created_at.toISOString();
        broadcast('comment', coq.rows);
      }
    } finally {
      db.release();
    }
  } catch (e) {
    console.error('[realtime poll]', e);
  }
}

export function startRealtime() {
  if (pollStarted) return;
  pollStarted = true;
  setInterval(poll, 2000);
  setInterval(broadcastPresence, 5000);
}

export function registerClient(clientId: string, client: SseClient) {
  clients.set(clientId, client);
  startRealtime();
  broadcastPresence();
}

export function removeClient(clientId: string) {
  clients.delete(clientId);
  broadcastPresence();
}
