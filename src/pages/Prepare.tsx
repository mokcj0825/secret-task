import { useState, useEffect } from 'react'

const API = '/api/questions'
const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E']

type Question = {
  id: number
  question: string
  choices: string[]
  correct: number[]
  explanation: string
}

const MIN_CHOICES = 4
const MAX_CHOICES = 5
const MIN_CORRECT = 1
const MAX_CORRECT = 2

const emptyForm = (): { question: string; choices: string[]; correct: number[]; explanation: string } => ({
  question: '',
  choices: ['', '', '', ''],
  correct: [],
  explanation: '',
})

export default function Prepare() {
  const [items, setItems] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [convertedText, setConvertedText] = useState('')

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}?page=${page}&limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch list')
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [page, limit])

  const setChoice = (idx: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.choices]
      next[idx] = value
      return { ...prev, choices: next }
    })
  }

  const setChoiceCount = (n: number) => {
    const clamped = Math.min(MAX_CHOICES, Math.max(MIN_CHOICES, n))
    setForm((prev) => {
      const next = [...prev.choices]
      while (next.length < clamped) next.push('')
      const choices = next.slice(0, clamped)
      const correct = prev.correct.filter((i) => i < clamped)
      return { ...prev, choices, correct }
    })
  }

  const toggleCorrect = (idx: number) => {
    setForm((prev) => {
      const has = prev.correct.includes(idx)
      if (has) return { ...prev, correct: prev.correct.filter((i) => i !== idx) }
      if (prev.correct.length >= MAX_CORRECT) return prev
      return { ...prev, correct: [...prev.correct, idx].sort((a, b) => a - b) }
    })
  }

  const validate = (): string => {
    const q = form.question.trim()
    if (!q) return 'Question is required.'
    const count = form.choices.length
    if (count < MIN_CHOICES || count > MAX_CHOICES) return `Need ${MIN_CHOICES}-${MAX_CHOICES} choices.`
    const allFilled = form.choices.every((c) => c.trim() !== '')
    if (!allFilled) return 'Every choice must be non-empty.'
    if (form.correct.length < MIN_CORRECT || form.correct.length > MAX_CORRECT) return `Select ${MIN_CORRECT}-${MAX_CORRECT} correct answer(s).`
    const validIndices = form.correct.every((i) => i >= 0 && i < count)
    if (!validIndices) return 'Correct indices must be within choices.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      question: form.question.trim(),
      choices: form.choices.slice(0, form.choices.length).map((c) => c.trim()),
      correct: form.correct,
      explanation: form.explanation.trim(),
    }
    try {
      if (editingId !== null) {
        const res = await fetch(`${API}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Update failed')
        }
        setEditingId(null)
      } else {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Create failed')
        }
      }
      setForm(emptyForm())
      fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (q: Question) => {
    setForm({
      question: q.question,
      choices: [...q.choices],
      correct: [...q.correct],
      explanation: q.explanation ?? '',
    })
    setEditingId(q.id)
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm())
    setError('')
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this question?')) return
    setError('')
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      if (editingId === id) cancelEdit()
      fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const removeLineBreaks = () => {
    setConvertedText(pasteText.replace(/\r?\n/g, ' ').trim())
  }

  return (
    <>
      <h1 className="page-title">Prepare (Admin)</h1>
      <p>Add and edit AWS questions: one question, 4-5 choices, 1-2 correct answers, and an explanation.</p>

      <div className="prepare-row">
        <div className="prepare-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Question</label>
          <textarea
            value={form.question}
            onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
            rows={3}
            placeholder="Question text"
          />
        </div>
        <div className="form-group">
          <label>Choices (4-5)</label>
          {form.choices.map((text, idx) => (
            <div key={idx} className="choice-row">
              <span className="choice-label">{CHOICE_LABELS[idx]}.</span>
              <input
                type="text"
                value={text}
                onChange={(e) => setChoice(idx, e.target.value)}
                placeholder={`Choice ${CHOICE_LABELS[idx]}`}
              />
              <label>
                <input
                  type="checkbox"
                  checked={form.correct.includes(idx)}
                  onChange={() => toggleCorrect(idx)}
                />
                Correct
              </label>
            </div>
          ))}
          <div className="actions" style={{ marginTop: '0.5rem' }}>
            {form.choices.length > MIN_CHOICES && (
              <button type="button" onClick={() => setChoiceCount(form.choices.length - 1)}>
                Remove choice
              </button>
            )}
            {form.choices.length < MAX_CHOICES && (
              <button type="button" onClick={() => setChoiceCount(form.choices.length + 1)}>
                Add choice
              </button>
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Explanation</label>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
            rows={4}
            placeholder="Explanation (optional)"
          />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <div className="actions">
          <button type="submit" className="primary" disabled={saving}>
            {editingId !== null ? 'Update' : 'Add'} question
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>
        </div>
      <section className="convert-tool" aria-label="Paste and remove line breaks">
          <h2 className="convert-tool-title">Paste / convert (remove line breaks)</h2>
          <div className="form-group">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste text with line breaks here..."
              rows={4}
            />
          </div>
          <div className="actions">
            <button type="button" onClick={removeLineBreaks}>Remove line breaks</button>
          </div>
          {convertedText ? (
            <div className="form-group">
              <label>Result (copy from here)</label>
              <textarea readOnly value={convertedText} rows={4} />
            </div>
          ) : null}
      </section>
      </div>

      <section className="prepare-questions" aria-label="Questions list">
      <h2>Questions ({total})</h2>
      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && <p>No questions yet.</p>}
      {!loading && items.length > 0 && (
        <>
          <table className="list-table">
            <thead>
              <tr>
                <th>ID</th>
                <th className="cell-question">Question</th>
                <th>Choices</th>
                <th>Correct</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td className="cell-question" title={q.question}>
                    {q.question}
                  </td>
                  <td>{q.choices.length}</td>
                  <td>{q.correct.map((i) => CHOICE_LABELS[i]).join(', ')}</td>
                  <td>
                    <button type="button" onClick={() => startEdit(q)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(q.id)} style={{ marginLeft: '0.5rem' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} / {totalPages} ({total} total)
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
      </section>
    </>
  )
}
