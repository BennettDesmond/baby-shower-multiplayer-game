const MEDALS = ['🥇', '🥈', '🥉'];
const ROW_CLASSES = ['first', 'second', 'third'];

export default function FinalLeaderboard({ leaderboard, bingoWinner }) {
  const winner = leaderboard[0];

  return (
    <div className="final-page">
      <span className="trophy">🏆</span>
      <h1>Final Scores!</h1>
      <p style={{ color: 'var(--muted)', fontWeight: 600, marginTop: 4, marginBottom: 20 }}>
        Thanks for playing Baby Stablein! 🎉
      </p>

      {winner && (
        <div className="winner-banner">
          🎉 Winner: {winner.name} with {winner.scores.total} points!
        </div>
      )}

      {bingoWinner && (
        <div
          style={{
            background: 'var(--pale-blue)',
            borderRadius: 'var(--radius)',
            padding: '12px 20px',
            marginBottom: 16,
            fontWeight: 700,
          }}
        >
          🎯 Bingo winner: {bingoWinner}!
        </div>
      )}

      <div className="leaderboard">
        {leaderboard.map((player, i) => (
          <div key={player.id} className={`lb-row ${ROW_CLASSES[i] || ''}`}>
            <span className="lb-rank">{MEDALS[i] || `${i + 1}.`}</span>
            <span className="lb-name">{player.name}</span>
            <div style={{ textAlign: 'right' }}>
              <div className="lb-score">{player.scores.total} pts</div>
              <div className="score-breakdown">
                <span className="score-chip" title="Word Scramble">W: {player.scores.wordScramble}</span>
                <span className="score-chip" title="A-Z">A: {player.scores.atoz}</span>
                <span className="score-chip" title="Name That Price">P: {player.scores.namePrice}</span>
                <span className="score-chip" title="Bingo">B: {player.scores.bingo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, fontSize: '2rem' }}>
        🍼 ⭐ 🐣 ⭐ 🍼
      </div>
    </div>
  );
}
