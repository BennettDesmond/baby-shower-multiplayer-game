import { useState } from 'react';

export default function Lobby({ players, isHost, joined, onJoin, onStart, error }) {
  const [name, setName] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin(name.trim());
  };

  return (
    <div className="lobby-page">
      <div className="lobby-title">
        <span className="title-bear">🐻</span>
        <h1>Baby Stablein!</h1>
        <p style={{ color: 'var(--muted)', fontWeight: 600, marginTop: 4 }}>
          Baby Shower Games — join anytime!
        </p>
      </div>

      {!joined && (
        <form onSubmit={handleJoin} className="name-form">
          <input
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Join
          </button>
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}

      {joined && !isHost && (
        <div
          style={{
            textAlign: 'center',
            background: 'var(--pale-blue)',
            borderRadius: 'var(--radius)',
            padding: '16px',
            marginBottom: '16px',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🎉</span> You're in! Waiting for the host to start...
        </div>
      )}

      {players.length > 0 && (
        <div className="player-list">
          <h3>Players Joined ({players.length})</h3>
          {players.map((p) => (
            <span key={p.id} className="player-chip">
              {p.name}
              {p.isHost && <span className="host-badge">HOST</span>}
            </span>
          ))}
        </div>
      )}

      {isHost && joined && (
        <div className="host-controls">
          <p style={{ fontWeight: 700, marginBottom: 12 }}>
            ✨ You're the host! Start the game when everyone has joined.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 16 }}>
            4 rounds: Word Scramble → A-Z → Name That Price → Bingo
          </p>
          <button
            className="btn btn-success"
            onClick={onStart}
            disabled={players.length < 1}
          >
            Start Game →
          </button>
        </div>
      )}
    </div>
  );
}
