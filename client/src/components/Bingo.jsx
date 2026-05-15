import { useState, useCallback } from 'react';
import { socket } from '../socket';

const HEADERS = ['B', 'I', 'N', 'G', 'O'];

export default function Bingo({ myCard, isHost, falseAlarm }) {
  const [marked, setMarked] = useState(new Set(['FREE']));

  const toggleCell = useCallback((item) => {
    if (item === 'FREE') return;
    setMarked((prev) => {
      const next = new Set(prev);
      const nowMarked = !next.has(item);
      if (nowMarked) next.add(item);
      else next.delete(item);
      socket.emit('player:mark-tile', { item, marked: nowMarked });
      return next;
    });
  }, []);

  return (
    <div className="page">
      <div className="section-title">
        <h2>🎯 Baby Bingo</h2>
        <p>Tap tiles as gifts are opened. Hit BINGO! when you win!</p>
      </div>

      {isHost && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <button className="end-round-btn" onClick={() => socket.emit('host:end-bingo')}>
            End Bingo Round
          </button>
        </div>
      )}

      {myCard && (
        <div className="bingo-card-centered">
          <div className="bingo-header-row">
            {HEADERS.map((h) => (
              <div key={h} className="bingo-header-cell">{h}</div>
            ))}
          </div>
          <div className="bingo-card">
            {myCard.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`bingo-cell ${cell === 'FREE' ? 'free' : ''} ${marked.has(cell) ? 'marked' : ''}`}
                  onClick={() => toggleCell(cell)}
                >
                  {cell}
                </div>
              ))
            )}
          </div>

          <button
            className="btn btn-success bingo-claim-btn"
            onClick={() => socket.emit('player:claim-bingo')}
          >
            🎉 BINGO!
          </button>

          {falseAlarm && (
            <div className="false-alarm">Not quite! Keep marking!</div>
          )}
        </div>
      )}
    </div>
  );
}
