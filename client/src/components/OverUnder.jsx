import { useState, useCallback } from 'react';
import { socket } from '../socket';
import Timer from './Timer';

export default function NameThatPrice({ timeLeft, items, isHost }) {
  const [guesses, setGuesses] = useState({});

  const handleChange = useCallback((idx, value) => {
    setGuesses((prev) => ({ ...prev, [idx]: value }));
    socket.emit('player:name-price', { itemIndex: idx, guess: value });
  }, []);

  const answered = Object.values(guesses).filter((g) => g !== '').length;

  return (
    <div className="page">
      <div className="section-title">
        <h2>💰 Name That Price!</h2>
        <p>Guess the actual price of each baby item. Closest guess wins!</p>
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
        {answered} / {items.length} answered
      </div>

      <div className="price-items">
        {items.map((item, i) => (
          <div key={i} className="price-item">
            <span className="price-item-name">{item.name}</span>
            <div className="price-input-wrap">
              <span className="dollar-sign">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={guesses[i] ?? ''}
                onChange={(e) => handleChange(i, e.target.value)}
                style={{ width: 110, textAlign: 'right' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
