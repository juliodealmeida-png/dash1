import { useEffect, useState, useCallback } from 'react'
import { api, fmtDate } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileSignature,
  Send
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface Document {
  id: string
  name: string
  status: 'draft' | 'pending' | 'signed' | 'canceled'
  fileUrl: string
  createdAt: string
  updatedAt: string
  _count?: { signers: number }
}

export default function Documents() {
  const { t } = useI18n()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Document[] }>('/documents')
      setDocs(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await api.post<{ success: boolean; fileUrl: string }>('/upload/document', formData)
      
      if (uploadRes.success) {
        await api.post('/documents', {
          name: file.name,
          fileUrl: uploadRes.fileUrl,
          status: 'draft'
        })
        load()
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar documento')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    try {
      await api.delete(`/documents/${id}`)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSend(id: string) {
    try {
      await api.post(`/documents/${id}/send`)
      load()
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar para assinatura. Verifique se há signatários configurados.')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed': return <CheckCircle2 size={16} className="text-accent-green" />
      case 'pending': return <Clock size={16} className="text-accent-amber" />
      case 'canceled': return <AlertCircle size={16} className="text-accent-red" />
      default: return <FileText size={16} className="text-text-muted" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar 
        title={t('nav.documents')} 
        subtitle="Gestão de contratos e assinaturas digitais"
        onRefresh={load}
      />

      <div className="p-6">
        {/* Actions */}
        <div className="flex justify-end mb-6">
          <label className="btn btn-primary cursor-pointer flex items-center gap-2">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>{uploading ? 'Enviando...' : 'Novo Documento'}</span>
            <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-2xl">
                <FileSignature size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
                <p className="text-text-secondary font-medium">Nenhum documento encontrado</p>
                <p className="text-text-muted text-sm mt-1">Faça upload de um PDF para começar</p>
              </div>
            )}
            {docs.map(doc => (
              <div key={doc.id} className="card group hover:border-accent-purple/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-surface border border-border group-hover:bg-accent-purple/5 group-hover:border-accent-purple/20 transition-colors">
                    <FileText size={24} className="text-accent-purple-light" />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {doc.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-text-primary mb-1 truncate" title={doc.name}>
                  {doc.name}
                </h3>
                <p className="text-xs text-text-muted mb-4">
                  Criado em {fmtDate(doc.createdAt)}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      className="p-2 hover:bg-surface rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                      title="Baixar / Visualizar"
                    >
                      <Download size={16} />
                    </button>
                    {doc.status === 'draft' && (
                      <button 
                        onClick={() => handleSend(doc.id)}
                        className="p-2 hover:bg-surface rounded-lg text-accent-purple-light hover:text-accent-purple transition-colors"
                        title="Enviar para Assinatura"
                      >
                        <Send size={16} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 hover:bg-accent-red/10 rounded-lg text-text-muted hover:text-accent-red transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
