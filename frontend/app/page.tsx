"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Upload, FileText, BarChart3, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { sendMessage, uploadDocument, getStats } from "@/lib/api"

type Message = {
  role: "user" | "assistant"
  content: string
}

type Stats = {
  total_documents: number
  total_amount: number
  categories: Record<string, { count: number; amount: number }>
  documents_with_errors: number
}

export default function Home() {
  const [tab, setTab] = useState<"chat" | "upload" | "stats">("chat")
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Здравствуйте! Я ваш ИИ-бухгалтер. Загрузите документ или задайте вопрос." },
  ])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [dragging, setDragging] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (tab === "stats") loadStats()
  }, [tab])

  async function loadStats() {
    try {
      const data = await getStats()
      setStats(data)
    } catch {}
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
    setLoading(true)
    try {
      const data = await sendMessage(text, sessionId)
      setSessionId(data.session_id)
      setMessages((m) => [...m, { role: "assistant", content: data.response }])
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Ошибка соединения с сервером. Попробуйте снова." }])
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(file: File) {
    setUploadStatus("loading")
    setUploadResult(null)
    try {
      const data = await uploadDocument(file)
      setUploadStatus("success")
      setUploadResult(data)
    } catch {
      setUploadStatus("error")
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-900">ИИ-Бухгалтер</h1>
          <p className="text-xs text-gray-500">на базе Claude AI</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-xs text-gray-500">Онлайн</span>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {[
            { id: "chat", label: "Чат", icon: Send },
            { id: "upload", label: "Документы", icon: Upload },
            { id: "stats", label: "Статистика", icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col">
        {tab === "chat" && (
          <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "calc(100vh - 260px)" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Задайте вопрос по бухгалтерии..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Примеры: «Проверь договор», «Какой НДС для услуг?», «Составь акт сверки»
              </p>
            </div>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-700">Перетащите документ или нажмите</p>
              <p className="text-sm text-gray-500 mt-1">PDF, Excel, TXT — счета, акты, УПД, накладные</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {uploadStatus === "loading" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-gray-700">Анализирую документ...</span>
              </div>
            )}

            {uploadStatus === "error" && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">Ошибка загрузки. Проверьте формат файла.</span>
              </div>
            )}

            {uploadStatus === "success" && uploadResult && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-800">{uploadResult.filename}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Тип", uploadResult.analysis?.document_type],
                    ["Контрагент", uploadResult.analysis?.contractor],
                    ["ИНН", uploadResult.analysis?.inn],
                    ["Сумма с НДС", uploadResult.analysis?.amount_with_vat
                      ? `${uploadResult.analysis.amount_with_vat.toLocaleString()} ${uploadResult.analysis.currency || "₽"}`
                      : null],
                    ["НДС", uploadResult.analysis?.vat_amount
                      ? `${uploadResult.analysis.vat_amount.toLocaleString()} ₽`
                      : null],
                    ["Дата", uploadResult.analysis?.document_date],
                    ["Номер", uploadResult.analysis?.document_number],
                    ["Категория", uploadResult.analysis?.category],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="font-medium text-gray-800 mt-0.5">{value}</p>
                      </div>
                    ) : null
                  )}
                </div>
                {uploadResult.analysis?.errors?.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs font-medium text-amber-700 mb-1">Замечания:</p>
                    {uploadResult.analysis.errors.map((e: string, i: number) => (
                      <p key={i} className="text-sm text-amber-800">• {e}</p>
                    ))}
                  </div>
                )}
                {uploadResult.analysis?.summary && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-1">Резюме:</p>
                    <p className="text-sm text-blue-800">{uploadResult.analysis.summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-4">
            {!stats ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Документов", value: stats.total_documents },
                    { label: "Общая сумма", value: `${stats.total_amount.toLocaleString()} ₽` },
                    { label: "С ошибками", value: stats.documents_with_errors },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-sm text-gray-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">Расходы по категориям</h2>
                  {Object.keys(stats.categories).length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Документов пока нет</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stats.categories).map(([cat, data]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-32">{cat}</span>
                            <span className="text-xs text-gray-400">{data.count} док.</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {data.amount.toLocaleString()} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
