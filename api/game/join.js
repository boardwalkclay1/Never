import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const file = path.join(process.cwd(), "data/games.json");
  const games = JSON.parse(fs.readFileSync(file, "utf8"));

  const { code, name, emoji } = req.body;

  const game = games.find(g => g.code === code);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const playerId = "p-" + Date.now();
  game.players.push({
    id: playerId,
    name,
    emoji,
    fingersLeft: 5
  });

  fs.writeFileSync(file, JSON.stringify(games, null, 2));

  res.status(200).json({ game, playerId });
}
