// app.js
// NEVER HAVE I EVER // OFFLINE CREW EDITION
// Frontend is 100% client-side. All sync happens via Vercel serverless routes under /api/game/*

const state = {
  role: null,          // "host" | "client" | null
  game: null,          // full game object from server
  playerId: null,      // id of this player (for strikes, etc.)
  loading: false,
  error: null,
  pollIntervalId: null // for live state polling
};

const API_BASE = "/api/game";

// ---------- Core helpers ----------

async function api(path, options = {}) {
  const finalOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  };

  if (finalOptions.body && typeof finalOptions.body !== "string") {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  const res = await fetch(`${API_BASE}${path}`, finalOptions);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

function setLoading(isLoading, error = null) {
  state.loading = isLoading;
  state.error = error;
  render();
}

function startPolling(gameId) {
  stopPolling();
  state.pollIntervalId = setInterval(async () => {
    try {
      const data = await api(`/state?gameId=${encodeURIComponent(gameId)}`);
      state.game = data.game;
      render(false); // don't show loading flicker on poll
    } catch (err) {
      // silent fail on poll; host might have ended game
      console.warn("Polling error:", err.message);
    }
  }, 2000);
}

function stopPolling() {
  if (state.pollIntervalId) {
    clearInterval(state.pollIntervalId);
    state.pollIntervalId = null;
  }
}

// ---------- Render root ----------

function render(showLoader = true) {
  const root = document.getElementById("app-root");
  if (!root) return;

  // If first paint, remove loader shell if present
  const loader = root.querySelector(".nhie-loader");
  if (loader) loader.remove();

  root.innerHTML = "";

  if (state.loading && showLoader) {
    root.innerHTML = `
      <div class="screen screen--center">
        <div class="nhie-loader-inline">
          <div class="nhie-loader-mark">NEVER HAVE I EVER</div>
          <div class="nhie-loader-sub">Syncing your crew…</div>
          <div class="nhie-loader-pulse"></div>
        </div>
      </div>
    `;
    return;
  }

  if (!state.role) {
    renderLanding(root);
    return;
  }

  if (state.role === "host") {
    renderHost(root);
  } else if (state.role === "client") {
    renderClient(root);
  }
}

// ---------- Screens ----------

function renderLanding(root) {
  root.innerHTML = `
    <div class="screen screen--center">
      <div class="nhie-hero-mark">NEVER HAVE I EVER</div>
      <div class="nhie-hero-sub">OFFLINE CREW EDITION</div>

      <div class="nhie-hero-actions">
        <button id="hostBtn" class="btn btn--primary">Host a Crew Game</button>
        <button id="joinBtn" class="btn btn--ghost">Join with Game Code</button>
      </div>

      <div class="nhie-hero-footnote">
        One phone can host. Everyone else joins with a simple code.
      </div>

      ${state.error ? `<div class="nhie-error">${state.error}</div>` : ""}
    </div>
  `;

  document.getElementById("hostBtn").onclick = () => startHostFlow();
  document.getElementById("joinBtn").onclick = () => startJoinFlow();
}

async function startHostFlow() {
  setLoading(true);
  try {
    // Default mode + spice for now; can be a pre-screen later
    const payload = { mode: "5", spice: "spicy" };
    const data = await api("/create", {
      method: "POST",
      body: payload
    });

    state.role = "host";
    state.game = data.game;
    state.playerId = data.hostId || null;

    startPolling(state.game.id);
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(false, "Could not start host session. Try again.");
  }
}

function startJoinFlow() {
  state.role = "client";
  state.game = null;
  state.playerId = null;
  stopPolling();
  render();
}

function renderHost(root) {
  const g = state.game;
  if (!g) {
    root.innerHTML = `
      <div class="screen screen--center">
        <div class="nhie-hero-mark">Setting up your room…</div>
      </div>
    `;
    return;
  }

  const prompt =
    g.currentPromptIndex >= 0 && g.prompts[g.currentPromptIndex]
      ? g.prompts[g.currentPromptIndex]
      : null;

  root.innerHTML = `
    <div class="screen screen--host">
      <header class="nhie-header">
        <div class="nhie-header-left">
          <div class="nhie-tag">HOST</div>
          <div class="nhie-title">Spice: ${g.spice?.toUpperCase() || "MIXED"}</div>
        </div>
        <div class="nhie-header-right">
          <div class="nhie-game-code-label">Game Code</div>
          <div class="nhie-game-code">${g.code || g.id}</div>
        </div>
      </header>

      <main class="nhie-main">
        <section class="nhie-prompt-section">
          <div class="nhie-prompt-label">Current Prompt</div>
          <div class="nhie-prompt">
            ${prompt ? prompt.text : "Add a prompt to start the first round."}
          </div>

          <div class="nhie-prompt-input-row">
            <input
              id="promptInput"
              class="input"
              placeholder="Type a new 'Never have I ever…' prompt"
              maxlength="200"
            />
            <button id="addPromptBtn" class="btn btn--primary">Add Prompt</button>
          </div>
        </section>

        <section class="nhie-players-section">
          <div class="nhie-section-header">
            <h3>Players</h3>
            <span class="nhie-pill">${g.players?.length || 0} joined</span>
          </div>
          <div class="players">
            ${(g.players || [])
              .map(
                (p) => `
              <div class="player">
                <div class="emoji">${p.emoji || "🙂"}</div>
                <div class="name">${p.name || "Player"}</div>
                <div class="fingers">Fingers: ${p.fingersLeft ?? 5}</div>
              </div>
            `
              )
              .join("") || `<div class="nhie-empty">Waiting for your crew to join…</div>`}
          </div>
        </section>
      </main>

      <footer class="nhie-footer">
        <button id="endGameBtn" class="btn btn--ghost">End Game</button>
      </footer>

      ${state.error ? `<div class="nhie-error nhie-error--inline">${state.error}</div>` : ""}
    </div>
  `;

  document.getElementById("addPromptBtn").onclick = onHostAddPrompt;
  document.getElementById("endGameBtn").onclick = onEndGame;
}

async function onHostAddPrompt() {
  const input = document.getElementById("promptInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  setLoading(true);
  try {
    const payload = {
      gameId: state.game.id,
      text
    };
    const data = await api("/add-prompt", {
      method: "POST",
      body: payload
    });

    state.game = data.game;
    input.value = "";
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(false, "Could not add prompt. Try again.");
  }
}

async function onEndGame() {
  setLoading(true);
  try {
    await api("/end", {
      method: "POST",
      body: { gameId: state.game.id }
    });
  } catch (err) {
    console.warn("End game error (non-fatal):", err.message);
  }
  stopPolling();
  state.role = null;
  state.game = null;
  state.playerId = null;
  setLoading(false);
}

// ---------- Client / Join flow ----------

function renderClient(root) {
  if (!state.game) {
    renderJoinForm(root);
    return;
  }

  const g = state.game;
  const prompt =
    g.currentPromptIndex >= 0 && g.prompts[g.currentPromptIndex]
      ? g.prompts[g.currentPromptIndex]
      : null;

  root.innerHTML = `
    <div class="screen screen--client">
      <header class="nhie-header">
        <div class="nhie-header-left">
          <div class="nhie-tag">PLAYER</div>
          <div class="nhie-title">Game: ${g.code || g.id}</div>
        </div>
      </header>

      <main class="nhie-main">
        <section class="nhie-prompt-section">
          <div class="nhie-prompt-label">Prompt</div>
          <div class="nhie-prompt">
            ${prompt ? prompt.text : "Waiting for host to start the first prompt…"}
          </div>
        </section>

        <section class="nhie-action-section">
          <button id="doneBtn" class="btn btn--primary">
            I've done this
          </button>
        </section>

        <section class="nhie-players-section">
          <div class="nhie-section-header">
            <h3>Crew</h3>
            <span class="nhie-pill">${g.players?.length || 0} in</span>
          </div>
          <div class="players">
            ${(g.players || [])
              .map(
                (p) => `
              <div class="player ${p.id === state.playerId ? "player--me" : ""}">
                <div class="emoji">${p.emoji || "🙂"}</div>
                <div class="name">${p.name || "Player"}</div>
                <div class="fingers">Fingers: ${p.fingersLeft ?? 5}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </section>
      </main>

      <footer class="nhie-footer">
        <button id="leaveGameBtn" class="btn btn--ghost">Leave Game</button>
      </footer>

      ${state.error ? `<div class="nhie-error nhie-error--inline">${state.error}</div>` : ""}
    </div>
  `;

  document.getElementById("doneBtn").onclick = onClientStrike;
  document.getElementById("leaveGameBtn").onclick = onLeaveGame;
}

function renderJoinForm(root) {
  root.innerHTML = `
    <div class="screen screen--center">
      <div class="nhie-hero-mark">Join a Crew Game</div>
      <div class="nhie-hero-sub">Ask the host for the game code.</div>

      <div class="nhie-form">
        <label class="label">
          Game Code
          <input id="joinCodeInput" class="input" placeholder="e.g. 4F9K" maxlength="8" />
        </label>

        <label class="label">
          Your Name
          <input id="joinNameInput" class="input" placeholder="What should they call you?" maxlength="16" />
        </label>

        <label class="label">
          Emoji
          <input id="joinEmojiInput" class="input" placeholder="Pick an emoji (e.g. 😈)" maxlength="4" />
        </label>

        <button id="joinGameBtn" class="btn btn--primary">Join Game</button>
        <button id="backHomeBtn" class="btn btn--ghost">Back</button>

        ${state.error ? `<div class="nhie-error">${state.error}</div>` : ""}
      </div>
    </div>
  `;

  document.getElementById("joinGameBtn").onclick = onJoinGame;
  document.getElementById("backHomeBtn").onclick = () => {
    state.role = null;
    state.game = null;
    state.playerId = null;
    stopPolling();
    render();
  };
}

async function onJoinGame() {
  const codeInput = document.getElementById("joinCodeInput");
  const nameInput = document.getElementById("joinNameInput");
  const emojiInput = document.getElementById("joinEmojiInput");

  const code = codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();
  const emoji = emojiInput.value.trim() || "🙂";

  if (!code || !name) {
    state.error = "Game code and name are required.";
    render();
    return;
  }

  setLoading(true);
  try:
    const payload = { code, name, emoji };
    const data = await api("/join", {
      method: "POST",
      body: payload
    });

    state.game = data.game;
    state.playerId = data.playerId;
    state.error = null;

    startPolling(state.game.id);
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(false, "Could not join that game. Check the code and try again.");
  }
}

async function onClientStrike() {
  if (!state.game || !state.playerId) return;

  setLoading(true);
  try {
    const payload = {
      gameId: state.game.id,
      playerId: state.playerId
    };
    const data = await api("/strike", {
      method: "POST",
      body: payload
    });

    state.game = data.game;
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(false, "Could not send your strike. Try again.");
  }
}

async function onLeaveGame() {
  if (!state.game || !state.playerId) {
    state.role = null;
    state.game = null;
    state.playerId = null;
    stopPolling();
    render();
    return;
  }

  setLoading(true);
  try {
    await api("/leave", {
      method: "POST",
      body: {
        gameId: state.game.id,
        playerId: state.playerId
      }
    });
  } catch (err) {
    console.warn("Leave game error (non-fatal):", err.message);
  }

  stopPolling();
  state.role = null;
  state.game = null;
  state.playerId = null;
  setLoading(false);
}

// ---------- Boot ----------

document.addEventListener("DOMContentLoaded", () => {
  render();
});
