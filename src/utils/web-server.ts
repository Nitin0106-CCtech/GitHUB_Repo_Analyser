// src/web-server.ts
import express from "express";
import path from "path";

export function startWebServer(port = 3000) {
  const app = express();

  // Serve the UI
  app.use(express.static(path.join(__dirname, "../public")));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.listen(port, () => {
    process.stderr.write(`UI running at http://localhost:${port}\n`);
  });
}