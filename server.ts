import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import { prepareGenerationResponse, providerStatus } from './server/provider-boundary.mjs';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Multi-LLM / Integration API Routes
  app.get("/api/integrations/status", (req, res) => {
    res.json({
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      xai: !!process.env.XAI_API_KEY,
      notion: !!process.env.NOTION_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      ...providerStatus(process.env),
    });
  });

  // This proxy is unconfigured. Key presence does not prove a working provider.
  app.post("/api/llm/generate", async (req, res) => {
    const result=prepareGenerationResponse(req.body);
    res.status(result.status).json(result.body);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
