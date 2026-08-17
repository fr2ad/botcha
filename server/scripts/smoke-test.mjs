// Scripted end-to-end smoke test: logs in 3 mock "humans", queues them,
// plays through 3 chat rounds + guess phase against the real bot logic,
// and asserts the game reaches a result. Not part of the shipped app —
// a manual verification tool for local dev. Run with the server already
// listening on PORT (default 8787).
const BASE = process.env.BASE_URL ?? 'http://localhost:8787';
const WS_BASE = BASE.replace('http', 'ws');

async function mockLogin(nickname) {
  const res = await fetch(`${BASE}/api/auth/mock-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, avatar: 'dot' })
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const { player } = await res.json();
  return player;
}

function connect(playerId, nickname) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}/ws?playerId=${playerId}`);
    const state = { ws, nickname, mySeatIndex: null, log: [] };

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'queue.join' }));
      resolve(state);
    });

    ws.addEventListener('error', (e) => reject(e));

    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      state.log.push(msg.type);
      console.log(`[${nickname}] <- ${msg.type}`, summarize(msg));

      if (msg.type === 'game.start') {
        state.mySeatIndex = msg.yourSeatIndex;
      }

      if (msg.type === 'turn.begin' && msg.seatIndex === state.mySeatIndex) {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'turn.message', text: `hi from ${nickname} r${msg.round}` }));
        }, 200 + Math.random() * 400);
      }

      if (msg.type === 'guess.begin') {
        setTimeout(() => {
          const guess = (state.mySeatIndex + 1) % 4;
          ws.send(JSON.stringify({ type: 'guess.submit', seatIndex: guess }));
        }, 300);
      }
    });
  });
}

function summarize(msg) {
  const { type, ...rest } = msg;
  const s = JSON.stringify(rest);
  return s.length > 140 ? s.slice(0, 140) + '…' : s;
}

async function main() {
  const players = await Promise.all(
    ['Alicia', 'Marco', 'Priya'].map((n) => mockLogin(n))
  );
  console.log('logged in:', players.map((p) => `${p.nickname}(${p.id})`).join(', '));

  const connections = await Promise.all(players.map((p) => connect(p.id, p.nickname)));

  const results = await Promise.all(
    connections.map(
      (state) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`${state.nickname} never got game.result`)), 45_000);
          state.ws.addEventListener('message', function handler(evt) {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'game.result') {
              clearTimeout(timeout);
              state.ws.removeEventListener('message', handler);
              resolve({ nickname: state.nickname, ...msg });
            }
            if (msg.type === 'game.cancelled') {
              clearTimeout(timeout);
              reject(new Error(`${state.nickname} got game.cancelled: ${msg.reason}`));
            }
          });
        })
    )
  );

  console.log('\n=== RESULTS ===');
  for (const r of results) {
    console.log(`${r.nickname}: ${r.outcome} score${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} coin${r.coinDelta >= 0 ? '+' : ''}${r.coinDelta} rank#${r.leaderboardRank}`);
  }

  const lb = await (await fetch(`${BASE}/api/leaderboard`)).json();
  console.log('\n=== LEADERBOARD ===');
  console.log(lb.players);

  for (const c of connections) c.ws.close();
  console.log('\nSMOKE TEST PASSED');
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
