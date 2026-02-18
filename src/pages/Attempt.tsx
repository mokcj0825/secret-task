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

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const x of b) if (!sa.has(x)) return false
  return true
}

export default function Attempt() {
  const [question, setQuestion] = useState<Question | null>(null)
  const [userChoice, setUserChoice] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRandom = async () => {
    setLoading(true)
    setError('')
    setRevealed(false)
    setUserChoice([])
    try {
      const res = await fetch(`${API}/random`)
      if (!res.ok) {
        if (res.status === 404) setError('No questions yet. Add questions in Prepare.')
        else throw new Error('Failed to fetch')
        setQuestion(null)
        return
      }
      const data: Question = await res.json()
      setQuestion(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setQuestion(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRandom()
  }, [])

  const toggleChoice = (idx: number) => {
    if (!question) return
    if (question.correct.length === 1) {
      setUserChoice([idx])
    } else {
      setUserChoice((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : prev.length >= 2 ? prev : [...prev, idx]
      )
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRevealed(true)
  }

  const handleNext = () => {
    fetchRandom()
  }

  if (loading && !question) return <p>Loading...</p>

  return (
    <>
      <h1 className="page-title">Attempt (Practice)</h1>
      <p>Choose 1-2 answers, then reveal the correct answer and explanation.</p>

      {error && !question && <p className="error-msg">{error}</p>}

      {question && (
        <div className="practice-card">
          <div className="question-text">{question.question}</div>

          {!revealed ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group choices-group">
                <label>Options</label>
                {question.choices.map((text, idx) => (
                  <label key={idx} className="choice-option">
                    <input
                      type={question.correct.length === 1 ? 'radio' : 'checkbox'}
                      name="choice"
                      checked={userChoice.includes(idx)}
                      onChange={() => toggleChoice(idx)}
                    />
                    <span className="choice-label">{CHOICE_LABELS[idx]}.</span>
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              <div className="actions">
                <button type="submit" className="primary">Reveal answer</button>
              </div>
            </form>
          ) : (
            <div className="reveal">
              <h4>Your answer</h4>
              <p>
                {userChoice.length
                  ? userChoice.map((i) => `${CHOICE_LABELS[i]}. ${question.choices[i]}`).join(' / ')
                  : '(none selected)'}
              </p>
              <h4>Correct answer</h4>
              <p>
                {question.correct.map((i) => `${CHOICE_LABELS[i]}. ${question.choices[i]}`).join(' / ')}
              </p>
              {question.correct.length > 0 && (
                <p className={sameSet(userChoice, question.correct) ? 'correct-badge' : 'wrong-badge'}>
                  {sameSet(userChoice, question.correct) ? 'Correct' : 'Incorrect'}
                </p>
              )}
              {question.explanation && (
                <>
                  <h4>Explanation</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{question.explanation}</p>
                </>
              )}
              <div className="actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="primary" onClick={handleNext}>Next question</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
