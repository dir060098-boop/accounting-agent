const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function sendMessage(message: string, sessionId: string | null) {
  const res = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  if (!res.ok) throw new Error("Ошибка при отправке сообщения")
  return res.json()
}

export async function uploadDocument(file: File) {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error("Ошибка загрузки документа")
  return res.json()
}

export async function getDocuments(category?: string) {
  const url = category
    ? `${API_URL}/api/v1/documents?category=${encodeURIComponent(category)}`
    : `${API_URL}/api/v1/documents`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Ошибка получения документов")
  return res.json()
}

export async function getStats() {
  const res = await fetch(`${API_URL}/api/v1/documents/stats/summary`)
  if (!res.ok) throw new Error("Ошибка получения статистики")
  return res.json()
}
