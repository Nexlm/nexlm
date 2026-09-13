import clsx from 'clsx';
import { ImagePlus, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useSocket, useSocketEvent } from '../../hooks/useSocket.js';
import { api } from '../../lib/api.js';
import { formatTime } from '../../lib/format.js';
import { toast } from '../../store/toastStore.js';
import { Spinner } from '../ui/Feedback.jsx';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function MessageBubble({ message, mine }) {
  if (message.isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <p className="max-w-[90%] rounded-lg bg-brand-50 px-3 py-2 text-center text-xs text-brand-800">{message.content}</p>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col', mine ? 'items-end' : 'items-start')}>
      {!mine && <span className="mb-0.5 text-xs text-slate-500">{message.sender?.displayName}</span>}
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-900',
        )}
      >
        {message.imageUrl && (
          <a href={message.imageUrl} target="_blank" rel="noreferrer" className="block">
            <img src={message.imageUrl} alt="Payment proof" className="mb-1 max-h-60 rounded-lg object-cover" />
          </a>
        )}
        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
      </div>
      <span className="mt-0.5 text-[11px] text-slate-400">{formatTime(message.createdAt)}</span>
    </div>
  );
}

export function TradeChat({ tradeId, currentUserId, readOnly = false }) {
  const { data: messages, loading, setData } = useApi(
    () => api.get(`/trades/${tradeId}/messages`).then((r) => r.items),
    [tradeId],
  );
  const socket = useSocket();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef();
  const lastTypingEmit = useRef(0);

  const append = (message) =>
    setData((list) => (list?.some((m) => m.id === message.id) ? list : [...(list ?? []), message]));

  useSocketEvent('message:new', (message) => {
    if (message.tradeId === tradeId) {
      append(message);
      setTyping(false);
    }
  });

  useSocketEvent('trade:typing', (payload) => {
    if (payload.tradeId !== tradeId || payload.userId === currentUserId) return;
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 3000);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages?.length, typing]);

  function onTextChange(e) {
    setText(e.target.value);
    const now = Date.now();
    if (socket && now - lastTypingEmit.current > 2000) {
      lastTypingEmit.current = now;
      socket.emit('trade:typing', { tradeId });
    }
  }

  function onPickFile(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      toast.error('Attach a JPEG, PNG or WebP image');
      return;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setFile(picked);
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    const form = new FormData();
    if (text.trim()) form.append('content', text.trim());
    if (file) form.append('image', file);

    setSending(true);
    try {
      const message = await api.post(`/trades/${tradeId}/messages`, form);
      append(message);
      setText('');
      setFile(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex h-[560px] flex-col">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Trade chat</h2>
        <p className="text-xs text-slate-500">Messages are kept for dispute review. Never share passwords or OTPs.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading && !messages ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          messages?.map((m) => <MessageBubble key={m.id} message={m} mine={m.senderId === currentUserId} />)
        )}
        {typing && <p className="text-xs italic text-slate-400">typing…</p>}
        <div ref={bottomRef} />
      </div>

      {!readOnly && (
        <form onSubmit={send} className="border-t border-slate-100 p-3">
          {file && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
              <span className="truncate">📎 {file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Attach payment proof"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <textarea
              rows={1}
              value={text}
              onChange={onTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) send(e);
              }}
              placeholder="Type a message…"
              maxLength={2000}
              className="field max-h-32 min-h-[42px] resize-none"
            />
            <button
              type="submit"
              disabled={sending || (!text.trim() && !file)}
              className="rounded-lg bg-brand-600 p-2.5 text-white hover:bg-brand-700 disabled:bg-brand-300"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
