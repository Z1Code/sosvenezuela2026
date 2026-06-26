'use client';
import { useEffect, useState } from 'react';

interface Tweet { id: string; tweet_id: string; url: string; posted_at: string }

declare global {
  interface Window { twttr?: { widgets?: { load?: (el?: HTMLElement) => void } } }
}

/* Sidebar card — matches the "Estado actual" / "Últimos reportes" panels.
   Renders curated X embeds vertically, ordered by publication time. */
export default function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);

  useEffect(() => {
    fetch('/api/tweets').then(r => r.json()).then(d => Array.isArray(d) && setTweets(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!tweets.length) return;
    const render = () => window.twttr?.widgets?.load?.();
    if (window.twttr?.widgets) { render(); return; }
    if (document.getElementById('twitter-wjs')) { setTimeout(render, 800); return; }
    const s = document.createElement('script');
    s.id = 'twitter-wjs';
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.onload = render;
    document.body.appendChild(s);
  }, [tweets]);

  if (!tweets.length) return null;

  return (
    <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
          <span style={{ fontWeight: 900 }}>𝕏</span> Noticias en X
        </div>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>por hora</span>
      </div>
      <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 520 }}>
        {tweets.map(t => (
          <blockquote key={t.id} className="twitter-tweet" data-dnt="true" data-theme="light" data-conversation="none">
            <a href={t.url.replace('twitter.com', 'x.com')}>{new Date(t.posted_at).toLocaleString('es-VE')}</a>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
