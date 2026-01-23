import { get, put } from "@vercel/blob";

const BLOB_FILE = "never-games.json";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { gameId } = req.body;

    // 1. Load current games from Blob
    let games = [];
    try {
      const blob = await get(BLOB_FILE);
      if (blob && blob.url) {
        const json = await fetch(blob.url).then(r => r.json());
        games = Array.isArray(json) ? json : [];
      }
    } catch (err) {
      games = [];
    }

    // 2. Remove the game
    const idx = games.findIndex(g => g.id === gameId);
    if (idx === -1) {
      return res.status(404).json({ error: "Game not found" });
    }

    games.splice(idx, 1);

    // 3. Save updated list back to Blob
    await put(BLOB_FILE, JSON.stringify(games, null, 2), {
      access: "public",
      contentType: "application/json"
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("END GAME ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
