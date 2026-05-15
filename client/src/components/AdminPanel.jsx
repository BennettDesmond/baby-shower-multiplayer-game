import { useState } from 'react';
import { socket } from '../socket';

export default function AdminPanel({ players }) {
  const [open, setOpen] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const handleRestart = () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      return;
    }
    socket.emit('host:restart-game');
    setConfirmRestart(false);
    setOpen(false);
  };

  const handleRemove = (playerId) => {
    socket.emit('host:remove-player', { playerId });
  };

  return (
    <>
      <button className="admin-fab" onClick={() => { setOpen(true); setConfirmRestart(false); }} title="Admin Panel">
        ⚙️
      </button>

      {open && (
        <div className="admin-overlay" onClick={() => { setOpen(false); setConfirmRestart(false); }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Admin Panel</h3>
              <button className="admin-close" onClick={() => { setOpen(false); setConfirmRestart(false); }}>✕</button>
            </div>

            <div className="admin-section">
              <h4>Players</h4>
              {players.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No players yet.</p>
              ) : (
                <ul className="admin-player-list">
                  {players.map((p) => (
                    <li key={p.id} className="admin-player-row">
                      <span className="admin-player-name">
                        {p.name}
                        {p.isHost && <span className="host-badge" style={{ marginLeft: 6 }}>HOST</span>}
                      </span>
                      {!p.isHost && (
                        <button
                          className="admin-remove-btn"
                          onClick={() => handleRemove(p.id)}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-section">
              <h4>Game</h4>
              {!confirmRestart ? (
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleRestart}>
                  Restart Game from Beginning
                </button>
              ) : (
                <div className="confirm-restart">
                  <p>Are you sure? All scores will be reset.</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleRestart}>
                      Yes, Restart
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmRestart(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
