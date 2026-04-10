'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ConversationDetail } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load conversation data
  useEffect(() => {
    api.conversations.get(id)
      .then(setConv)
      .catch(() => setError('Conversation not found'))
      .finally(() => setLoading(false));
  }, [id]);

  // Subscribe to live updates via WebSocket
  useEffect(() => {
    const token = localStorage.getItem('oai_token');
    if (!token) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send subscribe message with JWT so the server knows which org we're in
      ws.send(JSON.stringify({ type: 'subscribe', conversationId: id, token }));
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'subscribed') {
        setLiveStatus('live');
      }

      // Server fires 'new_message' after a complete exchange finishes streaming
      if (msg.type === 'new_message' && msg.conversationId === id) {
        // Reload the conversation to get the new messages
        api.conversations.get(id).then(setConv);
      }
    };

    ws.onclose = () => setLiveStatus('disconnected');
    ws.onerror = () => setLiveStatus('disconnected');

    return () => {
      ws.close();
    };
  }, [id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [conv?.messages.length]);

  if (loading) return <div className="animate-pulse text-slate-400 text-sm">Loading…</div>;
  if (error || !conv) return <div className="text-red-500 text-sm">{error || 'Not found'}</div>;

  const metadata = conv.endUser.metadata as Record<string, string>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/conversations" className="text-slate-400 hover:text-slate-600 text-sm">← Back</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-slate-900">Conversation</h1>

        <div className="ml-auto flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${
              liveStatus === 'live' ? 'bg-emerald-500 animate-pulse' :
              liveStatus === 'connecting' ? 'bg-amber-400' : 'bg-slate-300'
            }`} />
            <span className={
              liveStatus === 'live' ? 'text-emerald-600' :
              liveStatus === 'connecting' ? 'text-amber-600' : 'text-slate-400'
            }>
              {liveStatus === 'live' ? 'Live' : liveStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            conv.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {conv.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chat transcript */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Transcript</h2>

          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto max-h-[520px] space-y-3 pr-1"
          >
            {conv.messages.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No messages yet</p>
            ) : (
              conv.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs xl:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'assistant'
                      ? 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      : 'bg-brand-500 text-white rounded-br-sm'
                  }`}>
                    {m.content}
                    <p className={`text-xs mt-1 ${m.role === 'assistant' ? 'text-slate-400' : 'text-brand-200'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.role === 'assistant' && m.tokensUsed > 0 && ` · ${m.tokensUsed} tokens`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User info panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">End User</h2>
            <dl className="space-y-2 text-sm">
              <Row label="ID" value={conv.endUser.externalId ?? 'anonymous'} />
              <Row label="First seen" value={new Date(conv.endUser.firstSeenAt).toLocaleDateString()} />
              <Row label="Last seen" value={new Date(conv.endUser.lastSeenAt).toLocaleDateString()} />
            </dl>
          </div>

          {Object.keys(metadata).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Metadata</h2>
              <dl className="space-y-2 text-sm">
                {Object.entries(metadata).map(([k, v]) => (
                  <Row key={k} label={k} value={String(v)} />
                ))}
              </dl>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Conversation</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Triggered by" value={(conv.triggeredBy ?? 'manual').replace('_', ' ')} />
              <Row label="Started" value={new Date(conv.startedAt).toLocaleString()} />
              <Row label="Messages" value={String(conv.messages.length)} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-slate-500 shrink-0 capitalize">{label}</dt>
      <dd className="text-slate-800 font-medium text-right break-all">{value}</dd>
    </div>
  );
}
