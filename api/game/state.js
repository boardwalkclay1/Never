import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const { gameId } = req.query;

  const file = path.join(process.cwd(), "data/games.json");
  const games = JSON.parse(fs.readFileSync(file, "utf8"));

  const game = games.find(g => g.id === gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });

  res.status(200).json({ game });
}
