import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const file = path.join(process.cwd(), "data/games.json");
  const games = JSON.parse(fs.readFileSync(file, "utf8"));

  const { mode, spice } = req.body;

  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  const id = Date.now().toString();

  const hostId = "host-" + id;

  const game = {
    id,
    code,
    mode,
    spice,
    hostId,
    players: [],
    prompts: [],
    currentPromptIndex: -1,
    createdAt: Date.now()
  };

  games.push(game);
  fs.writeFileSync(file, JSON.stringify(games, null, 2));

  res.status(200).json({ game, hostId });
}
