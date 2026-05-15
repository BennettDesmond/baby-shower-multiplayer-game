import { useState, useEffect } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import WordScramble from './components/WordScramble';
import AtoZ from './components/AtoZ';
import NameThatPrice from './components/OverUnder';
import Bingo from './components/Bingo';
import Results from './components/Results';
import FinalLeaderboard from './components/FinalLeaderboard';

export default function App() {
  const [phase, setPhase] = useState('connecting');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [timerLeft, setTimerLeft] = useState(300);
  const [phaseData, setPhaseData] = useState(null);
  const [myCard, setMyCard] = useState(null);
  const [error, setError] = useState('');
  const [falseAlarm, setFalseAlarm] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('game:init', () => {
      setPhase('lobby');
    });

    socket.on('player:joined', ({ isHost: h, myCard: card }) => {
      setIsHost(h);
      setMyCard(card);
      setPhase('lobby');
    });

    socket.on('player:promoted-host', () => setIsHost(true));

    socket.on('game:players', (list) => setPlayers(list));

    socket.on('game:phase', (data) => {
      setPhase(data.phase);
      setPhaseData(data);
      setTimerLeft(300);
      setFalseAlarm(false);
    });

    socket.on('game:timer', ({ timeLeft }) => setTimerLeft(timeLeft));

    socket.on('bingo:card', ({ card }) => setMyCard(card));

    socket.on('bingo:false-alarm', () => {
      setFalseAlarm(true);
      setTimeout(() => setFalseAlarm(false), 3000);
    });

    socket.on('game:error', ({ message }) => setError(message));

    return () => socket.disconnect();
  }, []);

  const handleJoin = (name) => {
    socket.emit('player:join', { name });
  };

  const handleStartRound = (round) => {
    socket.emit('host:start-round', { round });
  };

  if (phase === 'connecting') {
    return (
      <div className="center-screen">
        <div className="card">
          <div className="spinner" />
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-star">✦</span>
        Baby Stablein!
        <span className="header-star">✦</span>
      </header>

      {phase === 'lobby' && (
        <Lobby
          players={players}
          isHost={isHost}
          onJoin={handleJoin}
          onStart={() => handleStartRound('word-scramble')}
          error={error}
        />
      )}

      {phase === 'word-scramble' && (
        <WordScramble timeLeft={timerLeft} words={phaseData?.words || []} isHost={isHost} />
      )}

      {phase === 'word-scramble-results' && (
        <Results
          title="Word Scramble Results"
          leaderboard={phaseData?.leaderboard || []}
          isHost={isHost}
          onNext={() => handleStartRound('atoz')}
          nextLabel="Start A-Z Round"
          extra={
            <div className="answer-key">
              <h3>Answer Key</h3>
              <div className="answer-grid">
                {(phaseData?.answers || []).map((a, i) => (
                  <div key={i} className="answer-item">
                    <span className="scrambled">{a.scrambled}</span>
                    <span className="arrow">→</span>
                    <span className="answer">{a.answer}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      )}

      {phase === 'atoz' && <AtoZ timeLeft={timerLeft} isHost={isHost} />}

      {phase === 'atoz-results' && (
        <Results
          title="A-Z Results"
          leaderboard={phaseData?.leaderboard || []}
          isHost={isHost}
          onNext={() => handleStartRound('name-price')}
          nextLabel="Start Name That Price Round"
          extra={
            <div className="atoz-results">
              <h3>Answers</h3>
              {'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => {
                const letterData = phaseData?.letterResults?.[letter] || {};
                const playerNames = phaseData?.playerNames || {};
                const entries = Object.entries(letterData);
                if (entries.length === 0) return null;
                return (
                  <div key={letter} className="atoz-letter-result">
                    <span className="letter-label">{letter.toUpperCase()}</span>
                    <div className="letter-answers">
                      {entries.map(([pid, info]) => (
                        <span
                          key={pid}
                          className={`letter-answer-chip ${info.scored ? 'unique' : 'shared'}`}
                        >
                          {playerNames[pid] || pid}: {info.answer}
                          {info.scored ? ' ✓' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        />
      )}

      {phase === 'name-price' && (
        <NameThatPrice timeLeft={timerLeft} items={phaseData?.items || []} isHost={isHost} />
      )}

      {phase === 'name-price-results' && (
        <Results
          title="Name That Price Results"
          leaderboard={phaseData?.leaderboard || []}
          isHost={isHost}
          onNext={() => handleStartRound('bingo')}
          nextLabel="Start Bingo Round"
          extra={
            <div className="over-under-reveal">
              <h3>Actual Prices &amp; Guesses</h3>
              {(phaseData?.itemResults || []).map((item, i) => {
                const playerNames = phaseData?.playerNames || {};
                return (
                  <div key={i} className="price-reveal-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="item-name">{item.name}</span>
                      <span style={{ fontWeight: 900, color: 'var(--navy)' }}>Actual: ${item.actual}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {item.guesses.map((g) => {
                        const isWinner = item.winners.includes(g.playerId);
                        return (
                          <span
                            key={g.playerId}
                            style={{
                              background: isWinner ? 'var(--green)' : 'var(--pale-blue)',
                              color: isWinner ? 'white' : 'var(--text)',
                              borderRadius: 50,
                              padding: '3px 10px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                            }}
                          >
                            {playerNames[g.playerId] || g.playerId}: ${g.guess}
                            {isWinner ? ' ✓' : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        />
      )}

      {phase === 'bingo' && (
        <Bingo
          myCard={myCard}
          isHost={isHost}
          falseAlarm={falseAlarm}
        />
      )}

      {phase === 'final' && (
        <FinalLeaderboard
          leaderboard={phaseData?.leaderboard || []}
          bingoWinner={phaseData?.bingoWinner}
        />
      )}
    </div>
  );
}
