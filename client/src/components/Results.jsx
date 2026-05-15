const MEDALS = ['🥇', '🥈', '🥉'];
const ROUND_CLASSES = ['first', 'second', 'third'];

export default function Results({ title, leaderboard, isHost, onNext, nextLabel, extra }) {
  return (
    <div className="results-page">
      <div className="section-title">
        <h2>{title}</h2>
      </div>

      <div className="leaderboard">
        {leaderboard.map((player, i) => (
          <div key={player.id} className={`lb-row ${ROUND_CLASSES[i] || ''}`}>
            <span className="lb-rank">{MEDALS[i] || `${i + 1}.`}</span>
            <span className="lb-name">{player.name}</span>
            <div>
              <span className="lb-score">{player.scores.total} pts</span>
            </div>
          </div>
        ))}
      </div>

      {extra}

      {isHost && (
        <div className="host-next-btn">
          <button className="btn btn-primary" onClick={onNext}>
            {nextLabel} →
          </button>
        </div>
      )}

      {!isHost && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 700, marginTop: 16 }}>
          Waiting for the host to start the next round...
        </p>
      )}
    </div>
  );
}
