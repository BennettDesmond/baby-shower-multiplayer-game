# Baby Stablein! Baby Shower Games

A multiplayer baby shower game with 4 rounds:

1. **Word Scramble** — Unscramble 15 newborn activities (5 min)
2. **A-Z Baby Items** — One baby item per letter, Scattergories-style scoring (5 min)
3. **Over/Under** — Guess if actual price is higher or lower than quoted (5 min)
4. **Bingo** — Host calls items, first BINGO wins! (untimed)

## Run Locally

```bash
# Install everything
npm install
npm run build          # builds the React client

# Start the server
npm start              # http://localhost:3001
```

For development (with hot reload on the client):
```bash
# Terminal 1 - server
npm run dev:server

# Terminal 2 - client (hot reload)
cd client && npm run dev    # http://localhost:5173
```

## Deploy to Railway

1. Install the Railway CLI: `npm install -g @railway/cli`
2. Run `railway login`
3. Run `railway init` in this folder
4. Run `railway up`
5. Share the generated URL with your guests!

Or deploy via the Railway dashboard at railway.app:
- Connect your GitHub repo
- Railway auto-detects the build and start commands from railway.toml

## How to Play

1. Host shares the URL with guests
2. Everyone enters their name on the join screen
3. Host clicks **Start Game**
4. Between rounds, the host clicks **Start Next Round**
5. Final leaderboard shows after Bingo ends

## Scoring

| Round | Points |
|-------|--------|
| Word Scramble | 10 pts per correct answer |
| A-Z | 10 pts per *unique* answer (Scattergories rules) |
| Over/Under | 10 pts per correct guess |
| Bingo winner | 50 pts; others get 1 pt per marked item |
