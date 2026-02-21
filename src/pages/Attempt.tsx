import { useState, useEffect } from 'react'

const API = '/api/questions'
const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E']
const ROUND_SIZE = 10

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
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [userChoice, setUserChoice] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFinalScore, setShowFinalScore] = useState(false)

  const question = questions[currentIndex] ?? null
  const total = questions.length
  const answered = results.length
  const correct = results.filter(Boolean).length

  const fetchRound = async () => {
    setLoading(true)
    setError('')
    setRevealed(false)
    setUserChoice([])
    setResults([])
    setCurrentIndex(0)
    setShowFinalScore(false)
    try {
      const res = await fetch(`${API}/random?n=${ROUND_SIZE}`)
      if (!res.ok) {
        if (res.status === 404) setError('No questions yet. Add questions in Prepare.')
        else throw new Error('Failed to fetch')
        setQuestions([])
        return
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : [data]
      setQuestions(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRound()
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
    const ok = sameSet(userChoice, question!.correct)
    setResults((r) => [...r, ok])
    setRevealed(true)
  }

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setShowFinalScore(true)
      return
    }
    setCurrentIndex((i) => i + 1)
    setUserChoice([])
    setRevealed(false)
  }

  const roundComplete = showFinalScore && total > 0

  if (loading && questions.length === 0) return <p>Loading...</p>

  return (
    <>
      <h1 className="page-title">Attempt (Practice)</h1>
      <p>Choose 1-2 answers, then reveal. Each round has {ROUND_SIZE} random questions.</p>

      {error && questions.length === 0 && <p className="error-msg">{error}</p>}

      <div className="attempt-layout">
        <div className="attempt-main">
          {roundComplete ? (
            <div className="practice-card">
              <h2>Round complete</h2>
              <p>Score: {correct} / {total} correct</p>
              <div className="actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="primary" onClick={fetchRound}>Start new round</button>
              </div>
            </div>
          ) : question ? (
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
                  <p className={sameSet(userChoice, question.correct) ? 'correct-badge' : 'wrong-badge'}>
                    {sameSet(userChoice, question.correct) ? 'Correct' : 'Incorrect'}
                  </p>
                  {question.explanation && (
                    <>
                      <h4>Explanation</h4>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{question.explanation}</p>
                    </>
                  )}
                  <div className="actions" style={{ marginTop: '1rem' }}>
                    <button type="button" className="primary" onClick={handleNext}>
                      {currentIndex + 1 < total ? 'Next question' : 'See final score'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <aside className="attempt-score">
          <h3>Score</h3>
          <p>Question {currentIndex + 1} / {total || '-'}</p>
          <p>Correct: {correct} / {answered || '-'}</p>
        </aside>
      </div>
    </>
  )
}
