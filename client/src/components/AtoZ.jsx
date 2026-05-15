import { useState, useCallback } from 'react';
import { socket } from '../socket';
import Timer from './Timer';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export default function AtoZ({ timeLeft, isHost }) {
  const [answers, setAnswers] = useState({});

  const handleChange = useCallback((letter, value) => {
    setAnswers((prev) => ({ ...prev, [letter]: value }));
    socket.emit('player:atoz-answer', { letter, answer: value });
  }, []);

  const answered = LETTERS.filter((l) => answers[l]?.trim()).length;

  return (
    <div className="page">
      <div className="section-title">
        <h2>🔡 A-Z: All Things Baby!</h2>
        <p>Think of a baby-related item for each letter. Unique answers score points!</p>
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
        {answered} / 26 filled in
      </div>

      <div className="atoz-grid">
        {LETTERS.map((letter) => (
          <div key={letter} className="atoz-item">
            <span className="atoz-letter">{letter.toUpperCase()}</span>
            <input
              type="text"
              placeholder={`${letter.toUpperCase()}...`}
              value={answers[letter] || ''}
              onChange={(e) => handleChange(letter, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
