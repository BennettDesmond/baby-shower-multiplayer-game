import { useState, useEffect } from 'react';

function getOrCreateSessionId() {
  let id = localStorage.getItem('babyShower_sessionId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('babyShower_sessionId', id);
  }
  return id;
}
import { socket } from './socket';
import Lobby from './components/Lobby';
import WordScramble from './components/WordScramble';
import AtoZ from './components/AtoZ';
import NameThatPrice from './components/OverUnder';
import Results from './components/Results';
import FinalLeaderboard from './components/FinalLeaderboard';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [phase, setPhase] = useState('connecting');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [timerLeft, setTimerLeft] = useState(300);
  const [phaseData, setPhaseData] = useState(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [myWordResults, setMyWordResults] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('game:init', () => {
      const savedName = localStorage.getItem('babyShower_name');
      if (savedName) {
        socket.emit('player:join', { name: savedName, sessionId: getOrCreateSessionId() });
      } else {
        setPhase('lobby');
      }
    });

    socket.on('player:joined', ({ isHost: h }) => {
      setIsHost(h);
      setJoined(true);
      // phase is set by the game:phase event that always follows
    });

    socket.on('player:promoted-host', () => setIsHost(true));
    socket.on('player:demoted-host', () => setIsHost(false));

    socket.on('game:players', (list) => setPlayers(list));

    socket.on('game:phase', (data) => {
      setPhase(data.phase);
      setPhaseData(data);
      setTimerLeft(300);
    });

    socket.on('game:timer', ({ timeLeft }) => setTimerLeft(timeLeft));

    socket.on('player:word-scramble-results', ({ myResults }) => setMyWordResults(myResults));

    socket.on('game:error', ({ message }) => setError(message));

    socket.on('game:restart', () => {
      localStorage.removeItem('babyShower_name');
      localStorage.removeItem('babyShower_sessionId');
      setJoined(false);
      setPhase('lobby');
      setPhaseData(null);
      setTimerLeft(300);
      setIsHost(false);
      setMyWordResults(null);
    });

    socket.on('player:removed', () => {
      localStorage.removeItem('babyShower_name');
      localStorage.removeItem('babyShower_sessionId');
      setPhase('removed');
    });

    return () => socket.disconnect();
  }, []);

  const handleJoin = (name) => {
    localStorage.setItem('babyShower_name', name);
    socket.emit('player:join', { name, sessionId: getOrCreateSessionId() });
  };

  const handleStartRound = (round) => {
    socket.emit('host:start-round', { round });
  };

  if (phase === 'removed') {
    return (
      <div className="center-screen">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👋</div>
          <h2>You've been removed</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>The host removed you from the game.</p>
        </div>
      </div>
    );
  }

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

      {isHost && <AdminPanel players={players} />}

      {phase === 'lobby' && (
        <Lobby
          players={players}
          isHost={isHost}
          joined={joined}
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
                {(phaseData?.answers || []).map((a, i) => {
                  const result = myWordResults?.[i];
                  return (
                    <div key={i} className="answer-item">
                      <span className="scrambled">{a.scrambled}</span>
                      <span className="arrow">→</span>
                      <span className={`answer ${result ? (result.correct ? 'correct' : 'incorrect') : ''}`}>
                        {a.answer}{result?.correct ? ` +${result.points}` : ''}
                      </span>
                    </div>
                  );
                })}
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
                          className={`letter-answer-chip ${info.invalid ? 'invalid' : info.scored ? 'unique' : 'shared'}`}
                        >
                          {playerNames[pid] || pid}: {info.answer}
                          {info.scored ? ' +10' : ''}
                          {isHost && info.invalid === 'wrong_letter' ? ' (wrong letter)' : ''}
                          {isHost && info.invalid === 'not_word' ? ' (not a word)' : ''}
                          {isHost && info.invalid === 'host' ? ' (disallowed)' : ''}
                          {isHost && (
                            <button
                              className="atoz-override-btn"
                              title={info.invalid ? 'Approve' : 'Disallow'}
                              onClick={() => socket.emit('host:atoz-override', { playerId: pid, letter })}
                            >
                              {info.invalid ? '✓' : '✕'}
                            </button>
                          )}
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
          onNext={() => handleStartRound('final')}
          nextLabel="View Final Leaderboard"
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
                            {isWinner ? ' +10' : ''}
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

      {phase === 'final' && (
        <FinalLeaderboard leaderboard={phaseData?.leaderboard || []} />
      )}
    </div>
  );
}
