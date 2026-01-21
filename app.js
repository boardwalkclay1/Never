// app.js

const state = {
  role: null, // "host" | "client"
  game: null,
  hosts: []
};

function render() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  if (!state.role) {
    root.innerHTML = `
      <div class="screen">
        <h1 class="title">NEVER HAVE I EVER</h1>
        <button id="hostBtn">Host Game</button>
        <button id="joinBtn">Join Game</button>
      </div>
    `;
    document.getElementById("hostBtn").onclick = () => startHostFlow();
    document.getElementById("joinBtn").onclick = () => startJoinFlow();
    return;
  }

  if (state.role === "host") {
    renderHost(root);
  } else {
    renderClient(root);
  }
}

function startHostFlow() {
  state.role = "host";
  BLE.startHost("NHIE Room", "5", "spicy");
  state.game = {
    id: "game",
    mode: "5",
    spice: "spicy",
    players: [],
    prompts: [],
    currentPromptIndex: -1,
    notifications: []
  };
  render();
}

function startJoinFlow() {
  state.role = "client";
  BLE.scanForHosts();
  render();
}

function renderHost(root) {
  const g = state.game;
  const prompt = g.currentPromptIndex >= 0 ? g.prompts[g.currentPromptIndex] : null;

  root.innerHTML = `
    <div class="screen">
      <h2 class="title">Host – ${g.spice.toUpperCase()}</h2>
      <div class="prompt">${prompt ? prompt.text : "Add a prompt to start"}</div>
      <input id="promptInput" placeholder="New prompt" />
      <button id="addPromptBtn">Add Prompt</button>
      <h3>Players</h3>
      <div class="players">
        ${g.players.map(p => `
          <div class="player">
            <div class="emoji">${p.emoji}</div>
            <div class="name">${p.name}</div>
            <div class="fingers">Fingers: ${p.fingersLeft}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  document.getElementById("addPromptBtn").onclick = () => {
    const input = document.getElementById("promptInput");
    const text = input.value.trim();
    if (!text) return;
    const msg = {
      type: "new_prompt",
      text,
      spice: g.spice,
      from: "host"
    };
    // host can just apply locally and broadcast via native later
    g.prompts.push({
      id: Date.now().toString(),
      text,
      spice: g.spice,
      authorId: "host",
      authorName: "Host",
      authorEmoji: "👑",
      at: Date.now()
    });
    if (g.currentPromptIndex === -1) g.currentPromptIndex = 0;
    BLE.send(msg);
    render();
  };
}

function renderClient(root) {
  if (!state.game) {
    root.innerHTML = `
      <div class="screen">
        <h2 class="title">Join Game</h2>
        <div id="hostsList">
          ${state.hosts.map(h => `
            <button class="hostBtn" data-id="${h.id}">
              ${h.name} (RSSI: ${h.rssi})
            </button>
          `).join("")}
        </div>
      </div>
    `;
    document.querySelectorAll(".hostBtn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        BLE.connectToHost(id);
      };
    });
    return;
  }

  const g = state.game;
  const prompt = g.currentPromptIndex >= 0 ? g.prompts[g.currentPromptIndex] : null;

  root.innerHTML = `
    <div class="screen">
      <h2 class="title">Player</h2>
      <div class="prompt">${prompt ? prompt.text : "Waiting for prompt…"}</div>
      <button id="doneBtn">I've done this</button>
      <h3>Players</h3>
      <div class="players">
        ${g.players.map(p => `
          <div class="player">
            <div class="emoji">${p.emoji}</div>
            <div class="name">${p.name}</div>
            <div class="fingers">Fingers: ${p.fingersLeft}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  document.getElementById("doneBtn").onclick = () => {
    BLE.send({
      type: "strike",
      targetId: "me", // you’d use real player id
      from: "me"
    });
  };
}

// BLE inbound messages from native
BLE.onMessage(msg => {
  if (msg.type === "host_found") {
    state.hosts.push(msg);
    render();
  } else if (msg.type === "join_accept" || msg.type === "state_update") {
    state.game = msg.game;
    render();
  } else if (msg.type === "notification") {
    // could show toast
  }
});

render();
