import { useState, useEffect } from 'react';
import { socket } from './socket';

const PHASE_LABELS = {
  lobby: 'Lobby',
  'word-scramble': 'Word Scramble',
  'word-scramble-results': 'Word Scramble Results',
  atoz: 'A-Z Round',
  'atoz-results': 'A-Z Results',
  'name-price': 'Name That Price',
  'name-price-results': 'Name That Price Results',
  final: 'Final Leaderboard',
};

const ACTIVE_ROUNDS = new Set(['word-scramble', 'atoz', 'name-price']);

function fmt(seconds) {
  if (seconds == null) return '';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [state, setState] = useState(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    socket.connect();
    socket.on('admin:auth-ok', () => setAuthed(true));
    socket.on('admin:auth-fail', () => setAuthError('Incorrect password.'));
    socket.on('admin:state', (s) => setState(s));
    return () => socket.disconnect();
  }, []);

  const handleAuth = (e) => {
    e.preventDefault();
    setAuthError('');
    socket.emit('admin:auth', { password });
  };

  const restart = () => {
    if (!confirmRestart) { setConfirmRestart(true); return; }
    socket.emit('admin:restart');
    setConfirmRestart(false);
  };

  if (!authed) {
    return (
      <div className="center-screen">
        <div className="card" style={{ maxWidth: 380 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 20 }}>🔐 Admin Access</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {authError && <p className="error-msg">{authError}</p>}
            <button type="submit" className="btn btn-primary">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="center-screen">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  const isActive = ACTIVE_ROUNDS.has(state.phase);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ background: 'var(--navy)', color: 'white', borderRadius: 'var(--radius)', padding: '16px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>⚙️ Super Admin</div>
          <div style={{ color: '#a0c4e0', fontSize: '0.85rem' }}>Baby Stablein!</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800 }}>{PHASE_LABELS[state.phase] || state.phase}</div>
          {state.timeLeft != null && (
            <div style={{ color: '#ffd54f', fontWeight: 900, fontSize: '1.1rem' }}>⏱ {fmt(state.timeLeft)}</div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {isActive && (
          <button className="btn btn-ghost" onClick={() => socket.emit('admin:end-round')}>
            End Round Early
          </button>
        )}
        <button
          className="btn"
          style={{ background: confirmRestart ? 'var(--red)' : '#fce4ec', color: confirmRestart ? 'white' : 'var(--red)', fontWeight: 800 }}
          onClick={restart}
          onBlur={() => setConfirmRestart(false)}
        >
          {confirmRestart ? '⚠️ Confirm — Wipe Everything' : '🔄 Restart Game'}
        </button>
      </div>

      {/* Player list */}
      <h3 style={{ marginBottom: 12 }}>Players ({state.players.filter(p => !p.disconnected).length} active)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {state.players.length === 0 && (
          <p style={{ color: 'var(--muted)', fontWeight: 600, textAlign: 'center', padding: 20 }}>No players yet.</p>
        )}
        {state.players.map((player) => (
          <div
            key={player.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '12px 16px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              opacity: player.disconnected ? 0.45 : 1,
              border: player.isHost ? '2px solid var(--gold)' : '2px solid transparent',
            }}
          >
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800 }}>{player.name}</span>
                {player.isHost && (
                  <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: 50, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 900 }}>HOST</span>
                )}
                {player.disconnected && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>(disconnected)</span>
                )}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 3 }}>
                <strong style={{ color: 'var(--navy)' }}>{player.scores.total} pts</strong>
                {' · '}W: {player.scores.wordScramble} · A: {player.scores.atoz} · P: {player.scores.namePrice}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!player.isHost && !player.disconnected && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                  onClick={() => socket.emit('admin:set-host', { playerId: player.id })}
                >
                  Make Host
                </button>
              )}
              <button
                className="admin-remove-btn"
                onClick={() => socket.emit('admin:remove-player', { playerId: player.id })}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', marginTop: 24 }}>
        Password: set <code>ADMIN_PASSWORD</code> env var to change from default.
      </p>
    </div>
  );
}
