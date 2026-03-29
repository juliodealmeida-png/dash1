import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { MessageCircle, X, Send, Loader2, Bot, Minimize2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const QUICK_PROMPTS = [
  'Meus deals em risco',
  'Resumo do dia',
  'Top deals para fechar agora',
  'Pipeline da semana',
]

export default function JulioAI() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá ${user?.name?.split(' ')[0] ?? ''}! Sou o Julio, seu copiloto de vendas. Como posso ajudar hoje?`,
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    const userMsg: Message = { role: 'user', content: msg, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.post<{ data?: { reply?: string; response?: string; message?: string } }>('/julio/chat', {
        message: msg,
        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      })
      const reply =
        res.data?.reply ??
        res.data?.response ??
        res.data?.message ??
        'Entendido. Deixa eu verificar o pipeline...'

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Não consegui conectar ao backend. Verifique se o servidor está rodando.',
          ts: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-accent-purple flex items-center justify-center shadow-lg glow-purple transition-all duration-200 hover:scale-110"
        title="Julio AI"
      >
        {open ? <X size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 flex flex-col bg-card border border-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
          style={{ maxHeight: '75vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-elevated">
            <div className="w-7 h-7 rounded-lg bg-accent-purple/15 flex items-center justify-center">
              <Bot size={15} className="text-accent-purple-light" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-primary">Julio AI</div>
              <div className="text-[10px] text-accent-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block" />
                online
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
              <Minimize2 size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full bg-accent-purple/15 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                    <Bot size={11} className="text-accent-purple-light" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-accent-purple text-white rounded-br-sm'
                      : 'bg-elevated border border-border-subtle text-text-primary rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-5 h-5 rounded-full bg-accent-purple/15 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                  <Bot size={11} className="text-accent-purple-light" />
                </div>
                <div className="bg-elevated border border-border-subtle rounded-xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={12} className="animate-spin text-accent-purple" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-secondary hover:border-accent-purple/40 hover:text-accent-purple-light transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-2.5 flex items-end gap-2">
            <textarea
              ref={inputRef}
              className="input flex-1 resize-none text-xs py-2 min-h-[36px] max-h-24"
              placeholder="Pergunte ao Julio..."
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="btn-primary p-2 shrink-0 disabled:opacity-40"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
