import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";

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
    });
  });

  // Proxy route for generating from LLMs securely
  app.post("/api/llm/generate", async (req, res) => {
    const { provider, prompt, max_tokens = 4000 } = req.body;
    
    try {
      const tokenLimit = Math.min(Math.max(1, max_tokens), 16000);
      if (max_tokens > 16000) {
        return res.status(400).json({ error: "max_tokens cannot exceed 16000" });
      }

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      const validProviders = ["gemini", "anthropic", "openai", "xai"];
      if (provider && !validProviders.includes(provider)) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Check for missing API keys
      const providerKeyMap: Record<string, string | undefined> = {
        gemini: process.env.GEMINI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        xai: process.env.XAI_API_KEY
      };

      const selectedProvider = provider || "gemini";
      if (!providerKeyMap[selectedProvider]) {
        return res.status(503).json({
          error: "provider_unavailable",
          provider: selectedProvider,
          reason: "API key not configured"
        });
      }

      // Caveat A Mitigation: In a real implementation we route to Anthropic/OpenAI/Gemini here.
      // We must fail loudly if real normalization fails.
      // For now, we mock the normalized response format securely.
      res.json({ 
        provider: provider || "gemini",
        text: `[MOCK / NOT VERIFIED] Provider ${provider || "gemini"} has a configured key, but this browser proxy has not executed an SDK call. Use integrations/uws_tool_agent.py for real GPT-compatible inference and UWS tool calls.`,
        tokens_used: null,
        finish_reason: "mock"
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to normalize provider response." });
    }
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
