import { useState, useCallback, useEffect } from 'react';
import { socket } from '../socket';
import Timer from './Timer';

export default function WordScramble({ timeLeft, words, isHost, initialAnswers }) {
  const [answers, setAnswers] = useState(() => initialAnswers || {});

  useEffect(() => {
    if (initialAnswers) setAnswers(initialAnswers);
  }, [initialAnswers]);

  const handleChange = useCallback((idx, value) => {
    setAnswers((prev) => ({ ...prev, [idx]: value }));
    socket.emit('player:word-answer', { wordIndex: idx, answer: value });
  }, []);

  const answered = Object.values(answers).filter((a) => a.trim()).length;

  return (
    <div className="page">
      <div className="section-title">
        <h2>🔤 Word Scramble</h2>
        <p>Unscramble these newborn activities!</p>
      </div>

      <Timer timeLeft={timeLeft} />
      {isHost && (
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <button className="end-round-btn" onClick={() => socket.emit('host:end-round')}>
            End Round Early
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 12, color: 'var(--muted)', fontWeight: 700 }}>
        {answered} / {words.length} answered
      </div>

      <div className="scramble-grid">
        {words.map((word, i) => (
          <div key={i} className="scramble-item">
            <span className="scramble-number">#{i + 1}</span>
            <span className="scramble-word">{word}</span>
            <input
              type="text"
              placeholder="Your answer..."
              value={answers[i] || ''}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
