import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

const tableInfo = db.prepare("PRAGMA table_info(questions)").all();
const hasNewSchema = tableInfo.some((c) => c.name === 'choices');
if (!tableInfo.length || !hasNewSchema) {
  db.exec(`DROP TABLE IF EXISTS questions;`);
  db.exec(`
    CREATE TABLE questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      choices TEXT NOT NULL,
      correct TEXT NOT NULL,
      explanation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

function rowToQuestion(row) {
  return {
    id: row.id,
    question: row.question,
    choices: JSON.parse(row.choices || '[]'),
    correct: JSON.parse(row.correct || '[]'),
    explanation: row.explanation ?? '',
    created_at: row.created_at,
  };
}

const app = express();
app.use(express.json());

app.get('/api/questions', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const rows = db.prepare('SELECT * FROM questions ORDER BY id LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM questions').get();
    res.json({ items: rows.map(rowToQuestion), total: total.c, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/questions/random', (req, res) => {
  try {
    const n = Math.min(100, Math.max(1, parseInt(req.query.n, 10) || 1));
    const rows = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT ?').all(n);
    if (!rows.length) return res.status(404).json({ error: 'no questions' });
    const items = rows.map(rowToQuestion);
    res.json(n === 1 ? items[0] : items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/questions/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(rowToQuestion(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', (req, res) => {
  try {
    const { question, choices, correct, explanation } = req.body;
    if (!question || !Array.isArray(choices) || choices.length < 4 || choices.length > 5) {
      return res.status(400).json({ error: 'question and 4-5 choices are required' });
    }
    if (!Array.isArray(correct) || correct.length < 1 || correct.length > 2) {
      return res.status(400).json({ error: 'correct must be array of 1-2 indices' });
    }
    const choicesStr = JSON.stringify(choices);
    const correctStr = JSON.stringify(correct);
    const stmt = db.prepare('INSERT INTO questions (question, choices, correct, explanation) VALUES (?, ?, ?, ?)');
    const result = stmt.run(question, choicesStr, correctStr, explanation ?? '');
    res.status(201).json({
      id: result.lastInsertRowid,
      question,
      choices,
      correct,
      explanation: explanation ?? '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/questions/:id', (req, res) => {
  try {
    const { question, choices, correct, explanation } = req.body;
    if (!question || !Array.isArray(choices) || choices.length < 4 || choices.length > 5) {
      return res.status(400).json({ error: 'question and 4-5 choices are required' });
    }
    if (!Array.isArray(correct) || correct.length < 1 || correct.length > 2) {
      return res.status(400).json({ error: 'correct must be array of 1-2 indices' });
    }
    const choicesStr = JSON.stringify(choices);
    const correctStr = JSON.stringify(correct);
    const stmt = db.prepare('UPDATE questions SET question = ?, choices = ?, correct = ?, explanation = ? WHERE id = ?');
    const result = stmt.run(question, choicesStr, correctStr, explanation ?? '', req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ id: req.params.id, question, choices, correct, explanation: explanation ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
