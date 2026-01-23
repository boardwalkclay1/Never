import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const file = path.join(process.cwd(), "data/games.json");
  const games = JSON.parse(fs.readFileSync(file, "utf8"));

  const { gameId, text } = req.body;

  const game = games.find(g => g.id === gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });

  game.prompts.push({
    id: Date.now().toString(),
    text,
    at: Date.now()
  });

  if (game.currentPromptIndex === -1) {
    game.currentPromptIndex = 0;
  }

  fs.writeFileSync(file, JSON.stringify(games, null, 2));

  res.status(200).json({ game });
}
