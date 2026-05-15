const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const englishWords = new Set(require('an-array-of-english-words'));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const WORD_SCRAMBLE = [
  { scrambled: 'PLSEES', answer: 'SLEEPS' },
  { scrambled: 'TESA', answer: 'EATS' },
  { scrambled: 'ECIRS', answer: 'CRIES' },
  { scrambled: 'PRBSU', answer: 'BURPS' },
  { scrambled: 'LSSMIE', answer: 'SMILES' },
  { scrambled: 'WSYNA', answer: 'YAWNS' },
  { scrambled: 'DSCEDULD', answer: 'CUDDLES' },
  { scrambled: 'CSTHRETS', answer: 'STRETCHES' },
  { scrambled: 'PCSCIUH', answer: 'HICCUPS' },
  { scrambled: 'OSOPP', answer: 'POOPS' },
  { scrambled: 'ESEP', answer: 'PEES' },
  { scrambled: 'SPSRAG', answer: 'GRASPS' },
  { scrambled: 'CKISK', answer: 'KICKS' },
  { scrambled: 'LIBSNK', answer: 'BLINKS' },
  { scrambled: 'OSOC', answer: 'COOS' },
];

const PRICE_ITEMS = [
  { name: 'Diapers (Small Pack)', actual: 13 },
  { name: 'Teething Toy', actual: 12 },
  { name: 'Stroller', actual: 350 },
  { name: 'Baby Socks (3-6 Pack)', actual: 9 },
  { name: 'Baby Bottle', actual: 14 },
  { name: 'Baby Shampoo', actual: 8 },
  { name: 'Baby Monitor', actual: 120 },
  { name: 'Swaddle Blanket', actual: 18 },
];

const BINGO_ITEMS = [
  'Stroller', 'Diapers', 'Onesie', 'Pacifier', 'Crib',
  'Baby Wipes', 'Gift Cards', 'Teether', 'Baby Shoes', 'Sound Machine',
  'Bottle', 'Swaddle', 'Bib', 'Baby Shampoo',
  'Blanket', 'Hooded Towel', "Children's Bible", 'Diaper Cream', 'Baby Cups',
  'Playmat', 'Baby Monitor', 'Burp Cloth', 'Formula', 'Stuffed Animal',
];

let gameState = {
  phase: 'lobby',
  players: {},
  wordScramble: { answers: {}, timeLeft: 300, results: null },
  atoz: { answers: {}, timeLeft: 300, results: null },
  namePrice: { guesses: {}, timeLeft: 300, results: null },
  bingo: { cards: {}, markedTiles: {}, winner: null },
};

let hostId = null;
let timerInterval = null;
let lastPhaseEvent = null;

function emitPhase(data) {
  lastPhaseEvent = data;
  io.emit('game:phase', data);
}

function getPlayerList() {
  return Object.values(gameState.players)
    .filter((p) => !p.disconnected)
    .map((p) => ({ id: p.id, name: p.name, isHost: p.isHost, scores: p.scores }));
}

function startTimer(duration, onTick, onEnd) {
  if (timerInterval) clearInterval(timerInterval);
  let timeLeft = duration;
  timerInterval = setInterval(() => {
    timeLeft--;
    onTick(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      onEnd();
    }
  }, 1000);
}

function normalizeAnswer(s) {
  return (s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function scoreWordScramble() {
  const answers = gameState.wordScramble.answers;
  Object.entries(answers).forEach(([playerId, playerAnswers]) => {
    if (!gameState.players[playerId]) return;
    let score = 0;
    Object.entries(playerAnswers).forEach(([idx, answer]) => {
      const word = WORD_SCRAMBLE[parseInt(idx)];
      if (!word) return;
      const norm = normalizeAnswer(answer);
      if (norm === word.answer || (word.answer === 'CUDDLES' && norm === 'CUDDLED') || (word.answer === 'STRETCHES' && norm === 'STRETCH')) {
        score += 10;
      }
    });
    gameState.players[playerId].scores.wordScramble = score;
    gameState.players[playerId].scores.total += score;
  });
}

function scoreAtoZ() {
  const answers = gameState.atoz.answers;
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const letterResults = {};

  letters.forEach((letter) => {
    const letterAnswers = {};
    Object.entries(answers).forEach(([playerId, playerAnswers]) => {
      const ans = normalizeAnswer(playerAnswers[letter] || '').toLowerCase();
      if (ans) letterAnswers[playerId] = ans;
    });

    const counts = {};
    Object.values(letterAnswers).forEach((ans) => {
      counts[ans] = (counts[ans] || 0) + 1;
    });

    const scored = {};
    Object.entries(letterAnswers).forEach(([playerId, ans]) => {
      const wrongLetter = !ans.startsWith(letter);
      // Multi-word phrases (e.g. "car seat") skip dictionary check
      const isMultiWord = ans.includes(' ');
      const notWord = !wrongLetter && !isMultiWord && !englishWords.has(ans);
      const invalid = wrongLetter ? 'wrong_letter' : notWord ? 'not_word' : false;
      const isUnique = counts[ans] === 1;
      const getsPoints = !invalid && isUnique;
      scored[playerId] = { answer: ans, scored: getsPoints, invalid };
      if (getsPoints && gameState.players[playerId]) {
        gameState.players[playerId].scores.atoz += 10;
        gameState.players[playerId].scores.total += 10;
      }
    });

    letterResults[letter] = scored;
  });

  gameState.atoz.results = letterResults;
}

function recalculateAtozScores() {
  Object.values(gameState.players).forEach((p) => {
    p.scores.total -= p.scores.atoz;
    p.scores.atoz = 0;
  });
  Object.entries(gameState.atoz.results || {}).forEach(([, letterData]) => {
    const validCounts = {};
    Object.values(letterData).forEach((info) => {
      if (!info.invalid) validCounts[info.answer] = (validCounts[info.answer] || 0) + 1;
    });
    Object.entries(letterData).forEach(([pid, info]) => {
      const isUnique = !info.invalid && validCounts[info.answer] === 1;
      info.scored = isUnique;
      if (isUnique && gameState.players[pid]) {
        gameState.players[pid].scores.atoz += 10;
        gameState.players[pid].scores.total += 10;
      }
    });
  });
}

function scoreNamePrice() {
  const guesses = gameState.namePrice.guesses;
  const itemResults = PRICE_ITEMS.map((item, idx) => {
    const entries = [];
    Object.entries(guesses).forEach(([playerId, playerGuesses]) => {
      const raw = playerGuesses[idx];
      if (raw === undefined || raw === '') return;
      const guess = parseFloat(raw);
      if (isNaN(guess) || guess < 0) return;
      entries.push({ playerId, guess, diff: Math.abs(guess - item.actual) });
    });
    if (entries.length === 0) return { name: item.name, actual: item.actual, guesses: [], winners: [] };
    entries.sort((a, b) => a.diff - b.diff);
    const minDiff = entries[0].diff;
    const winners = entries.filter((e) => e.diff === minDiff).map((e) => e.playerId);
    winners.forEach((pid) => {
      if (gameState.players[pid]) {
        gameState.players[pid].scores.namePrice += 10;
        gameState.players[pid].scores.total += 10;
      }
    });
    return { name: item.name, actual: item.actual, guesses: entries, winners };
  });
  gameState.namePrice.results = itemResults;
}

function generateBingoCard() {
  const shuffled = [...BINGO_ITEMS].sort(() => Math.random() - 0.5);
  const card = [];
  let itemIdx = 0;
  for (let row = 0; row < 5; row++) {
    card.push([]);
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        card[row].push('FREE');
      } else {
        card[row].push(shuffled[itemIdx++]);
      }
    }
  }
  return card;
}

function checkBingo(card, calledItems) {
  const called = new Set([...calledItems, 'FREE']);
  for (let r = 0; r < 5; r++) {
    if (card[r].every((c) => called.has(c))) return true;
  }
  for (let c = 0; c < 5; c++) {
    if (card.every((row) => called.has(row[c]))) return true;
  }
  if ([0, 1, 2, 3, 4].every((i) => called.has(card[i][i]))) return true;
  if ([0, 1, 2, 3, 4].every((i) => called.has(card[i][4 - i]))) return true;
  return false;
}

function getSortedLeaderboard() {
  return Object.values(gameState.players)
    .map((p) => ({ id: p.id, name: p.name, scores: { ...p.scores } }))
    .sort((a, b) => b.scores.total - a.scores.total);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Send current state to new connection
  socket.emit('game:init', { phase: gameState.phase });

  socket.on('player:join', ({ name, sessionId }) => {
    // Check if this is a returning session
    const existing = Object.entries(gameState.players).find(([, p]) => p.sessionId === sessionId);

    if (existing) {
      const [oldId, player] = existing;
      // Cancel any pending cleanup timer
      if (player._cleanupTimer) { clearTimeout(player._cleanupTimer); delete player._cleanupTimer; }
      player.disconnected = false;
      // Migrate player to new socket ID
      delete gameState.players[oldId];
      player.id = socket.id;
      gameState.players[socket.id] = player;
      if (gameState.bingo.cards[oldId]) {
        gameState.bingo.cards[socket.id] = gameState.bingo.cards[oldId];
        delete gameState.bingo.cards[oldId];
      }
      if (gameState.bingo.markedTiles[oldId]) {
        gameState.bingo.markedTiles[socket.id] = gameState.bingo.markedTiles[oldId];
        delete gameState.bingo.markedTiles[oldId];
      }
      ['wordScramble', 'atoz', 'namePrice'].forEach((key) => {
        const store = key === 'namePrice' ? gameState.namePrice.guesses : gameState[key].answers;
        if (store && store[oldId]) { store[socket.id] = store[oldId]; delete store[oldId]; }
      });
      // Restore host role if they were the host
      if (player.isHost) {
        if (hostId !== oldId && hostId && gameState.players[hostId]) {
          gameState.players[hostId].isHost = false;
          io.to(hostId).emit('player:demoted-host');
        }
        hostId = socket.id;
      } else if (hostId === oldId) {
        hostId = socket.id;
      }

      socket.emit('player:joined', { isHost: player.isHost, myCard: gameState.bingo.cards[socket.id] });
    } else {
      const isFirst = Object.keys(gameState.players).filter(id => !gameState.players[id].disconnected).length === 0 || !hostId;
      if (isFirst) hostId = socket.id;
      gameState.players[socket.id] = {
        id: socket.id,
        name: name.trim().slice(0, 20),
        isHost: isFirst,
        sessionId,
        scores: { wordScramble: 0, atoz: 0, namePrice: 0, bingo: 0, total: 0 },
      };
      gameState.bingo.cards[socket.id] = generateBingoCard();
      socket.emit('player:joined', { isHost: isFirst, myCard: gameState.bingo.cards[socket.id] });
    }

    // Sync to current round
    if (gameState.phase !== 'lobby' && lastPhaseEvent) {
      socket.emit('game:phase', lastPhaseEvent);
      const timerMap = { 'word-scramble': 'wordScramble', atoz: 'atoz', 'name-price': 'namePrice' };
      const timerKey = timerMap[gameState.phase];
      if (timerKey) socket.emit('game:timer', { timeLeft: gameState[timerKey].timeLeft });
      if (gameState.phase === 'bingo') {
        const marked = [...(gameState.bingo.markedTiles[socket.id] || new Set(['FREE']))];
        socket.emit('bingo:card', { card: gameState.bingo.cards[socket.id], markedTiles: marked });
      }
    }

    // Always tell this socket what phase to show
    if (gameState.phase === 'lobby') {
      socket.emit('game:phase', { phase: 'lobby' });
    }

    io.emit('game:players', getPlayerList());
  });

  socket.on('host:start-round', ({ round }) => {
    if (socket.id !== hostId) return;

    if (round === 'word-scramble') {
      gameState.phase = 'word-scramble';
      gameState.wordScramble.answers = {};
      gameState.wordScramble.timeLeft = 300;
      emitPhase( { phase: 'word-scramble', words: WORD_SCRAMBLE.map((w) => w.scrambled) });
      startTimer(
        300,
        (t) => { gameState.wordScramble.timeLeft = t; io.emit('game:timer', { timeLeft: t }); },
        () => {
          scoreWordScramble();
          gameState.phase = 'word-scramble-results';
          emitPhase( {
            phase: 'word-scramble-results',
            answers: WORD_SCRAMBLE.map((w) => ({ scrambled: w.scrambled, answer: w.answer })),
            leaderboard: getSortedLeaderboard(),
          });
        }
      );
    } else if (round === 'atoz') {
      gameState.phase = 'atoz';
      gameState.atoz.answers = {};
      gameState.atoz.results = null;
      gameState.atoz.timeLeft = 300;
      emitPhase( { phase: 'atoz' });
      startTimer(
        300,
        (t) => { gameState.atoz.timeLeft = t; io.emit('game:timer', { timeLeft: t }); },
        () => {
          scoreAtoZ();
          gameState.phase = 'atoz-results';
          emitPhase( {
            phase: 'atoz-results',
            letterResults: gameState.atoz.results,
            playerNames: Object.fromEntries(Object.values(gameState.players).map((p) => [p.id, p.name])),
            leaderboard: getSortedLeaderboard(),
          });
        }
      );
    } else if (round === 'name-price') {
      gameState.phase = 'name-price';
      gameState.namePrice.guesses = {};
      gameState.namePrice.results = null;
      gameState.namePrice.timeLeft = 300;
      emitPhase( {
        phase: 'name-price',
        items: PRICE_ITEMS.map((i) => ({ name: i.name })),
      });
      startTimer(
        300,
        (t) => { gameState.namePrice.timeLeft = t; io.emit('game:timer', { timeLeft: t }); },
        () => {
          scoreNamePrice();
          gameState.phase = 'name-price-results';
          emitPhase( {
            phase: 'name-price-results',
            itemResults: gameState.namePrice.results,
            playerNames: Object.fromEntries(Object.values(gameState.players).map((p) => [p.id, p.name])),
            leaderboard: getSortedLeaderboard(),
          });
        }
      );
    } else if (round === 'bingo') {
      gameState.phase = 'bingo';
      gameState.bingo.markedTiles = {};
      gameState.bingo.winner = null;
      emitPhase( { phase: 'bingo' });
      Object.entries(gameState.players).forEach(([pid]) => {
        const s = io.sockets.sockets.get(pid);
        if (s) s.emit('bingo:card', { card: gameState.bingo.cards[pid] });
      });
    }
  });

  socket.on('host:end-round', () => {
    if (socket.id !== hostId) return;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (gameState.phase === 'word-scramble') {
      scoreWordScramble();
      gameState.phase = 'word-scramble-results';
      emitPhase( {
        phase: 'word-scramble-results',
        answers: WORD_SCRAMBLE.map((w) => ({ scrambled: w.scrambled, answer: w.answer })),
        leaderboard: getSortedLeaderboard(),
      });
    } else if (gameState.phase === 'atoz') {
      scoreAtoZ();
      gameState.phase = 'atoz-results';
      emitPhase( {
        phase: 'atoz-results',
        letterResults: gameState.atoz.results,
        playerNames: Object.fromEntries(Object.values(gameState.players).map((p) => [p.id, p.name])),
        leaderboard: getSortedLeaderboard(),
      });
    } else if (gameState.phase === 'name-price') {
      scoreNamePrice();
      gameState.phase = 'name-price-results';
      emitPhase( {
        phase: 'name-price-results',
        itemResults: gameState.namePrice.results,
        playerNames: Object.fromEntries(Object.values(gameState.players).map((p) => [p.id, p.name])),
        leaderboard: getSortedLeaderboard(),
      });
    }
  });

  socket.on('host:atoz-override', ({ playerId, letter }) => {
    if (socket.id !== hostId || gameState.phase !== 'atoz-results') return;
    const entry = gameState.atoz.results?.[letter]?.[playerId];
    if (!entry) return;
    entry.invalid = entry.invalid ? false : 'host';
    recalculateAtozScores();
    emitPhase({
      phase: 'atoz-results',
      letterResults: gameState.atoz.results,
      playerNames: Object.fromEntries(Object.values(gameState.players).map((p) => [p.id, p.name])),
      leaderboard: getSortedLeaderboard(),
    });
  });

  socket.on('player:word-answer', ({ wordIndex, answer }) => {
    if (gameState.phase !== 'word-scramble') return;
    if (!gameState.wordScramble.answers[socket.id]) gameState.wordScramble.answers[socket.id] = {};
    gameState.wordScramble.answers[socket.id][wordIndex] = answer;
  });

  socket.on('player:atoz-answer', ({ letter, answer }) => {
    if (gameState.phase !== 'atoz') return;
    if (!gameState.atoz.answers[socket.id]) gameState.atoz.answers[socket.id] = {};
    gameState.atoz.answers[socket.id][letter] = answer;
  });

  socket.on('player:name-price', ({ itemIndex, guess }) => {
    if (gameState.phase !== 'name-price') return;
    if (!gameState.namePrice.guesses[socket.id]) gameState.namePrice.guesses[socket.id] = {};
    gameState.namePrice.guesses[socket.id][itemIndex] = guess;
  });

  socket.on('player:mark-tile', ({ item, marked }) => {
    if (gameState.phase !== 'bingo') return;
    if (!gameState.bingo.markedTiles[socket.id]) gameState.bingo.markedTiles[socket.id] = new Set(['FREE']);
    if (marked) gameState.bingo.markedTiles[socket.id].add(item);
    else gameState.bingo.markedTiles[socket.id].delete(item);
  });

  socket.on('player:claim-bingo', () => {
    if (gameState.phase !== 'bingo' || gameState.bingo.winner) return;
    const card = gameState.bingo.cards[socket.id];
    if (!card) return;
    const marked = gameState.bingo.markedTiles[socket.id] || new Set(['FREE']);
    if (checkBingo(card, [...marked])) {
      gameState.bingo.winner = socket.id;
      const winner = gameState.players[socket.id];
      if (winner) {
        winner.scores.bingo = 50;
        winner.scores.total += 50;
      }
      gameState.phase = 'final';
      emitPhase( {
        phase: 'final',
        bingoWinner: winner?.name || 'Unknown',
        leaderboard: getSortedLeaderboard(),
      });
    } else {
      socket.emit('bingo:false-alarm');
    }
  });

  socket.on('host:end-bingo', () => {
    if (socket.id !== hostId || gameState.phase !== 'bingo') return;
    gameState.phase = 'final';
    emitPhase( {
      phase: 'final',
      bingoWinner: null,
      leaderboard: getSortedLeaderboard(),
    });
  });

  socket.on('host:restart-game', () => {
    if (socket.id !== hostId) return;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    gameState.phase = 'lobby';
    gameState.wordScramble = { answers: {}, timeLeft: 300, results: null };
    gameState.atoz = { answers: {}, timeLeft: 300, results: null };
    gameState.namePrice = { guesses: {}, timeLeft: 300, results: null };
    gameState.bingo = { cards: {}, markedTiles: {}, winner: null };
    lastPhaseEvent = null;
    Object.values(gameState.players).forEach((p) => {
      p.scores = { wordScramble: 0, atoz: 0, namePrice: 0, bingo: 0, total: 0 };
      gameState.bingo.cards[p.id] = generateBingoCard();
    });
    io.emit('game:restart');
    io.emit('game:players', getPlayerList());
  });

  socket.on('host:remove-player', ({ playerId }) => {
    if (socket.id !== hostId) return;
    if (!gameState.players[playerId]) return;
    delete gameState.players[playerId];
    delete gameState.bingo.cards[playerId];
    delete gameState.bingo.markedTiles[playerId];
    delete gameState.wordScramble.answers[playerId];
    delete gameState.atoz.answers[playerId];
    delete gameState.namePrice.guesses[playerId];
    const removedSocket = io.sockets.sockets.get(playerId);
    if (removedSocket) removedSocket.emit('player:removed');
    io.emit('game:players', getPlayerList());
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    const player = gameState.players[socket.id];
    if (!player) return;

    player.disconnected = true;
    io.emit('game:players', getPlayerList());

    // Give the player 60s to reconnect before cleaning up
    player._cleanupTimer = setTimeout(() => {
      if (!gameState.players[socket.id]?.disconnected) return;
      delete gameState.players[socket.id];
      delete gameState.bingo.cards[socket.id];
      delete gameState.bingo.markedTiles[socket.id];
      if (socket.id === hostId) {
        const ids = Object.keys(gameState.players).filter((id) => !gameState.players[id].disconnected);
        if (ids.length > 0) {
          hostId = ids[0];
          gameState.players[hostId].isHost = true;
          io.to(hostId).emit('player:promoted-host');
        } else {
          hostId = null;
        }
      }
      io.emit('game:players', getPlayerList());
    }, 60000);
  });
});

app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
