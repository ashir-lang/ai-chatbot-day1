import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const startingPort = Number(process.env.PORT) || 3000;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is missing. Add it to a .env file before using the AI features.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function getDemoReply(messages) {
  const lastUserMessage = [...messages].reverse().find((msg) => msg && msg.role === 'user' && typeof msg.content === 'string');
  const text = lastUserMessage?.content?.trim() || 'your message';

  return `Demo mode: I received your message: "${text}".\n\nTo enable the real Gemini AI response, add a valid GEMINI_API_KEY to your .env file and restart the server.`;
}

app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages payload' });
    }

    const validMessages = messages.filter(
      (msg) => msg && typeof msg.content === 'string' && msg.content.trim()
    );

    if (!validMessages.length) {
      return res.status(400).json({ error: 'No valid chat messages were provided.' });
    }

    if (!ai) {
      return res.json({ reply: getDemoReply(validMessages), demoMode: true });
    }

    const contents = validMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
        });
        break;
      } catch (error) {
        const message = error?.message || '';
        const isRetryable =
          error?.status === 503 ||
          message.toLowerCase().includes('high demand') ||
          message.toLowerCase().includes('temporarily unavailable');

        if (!isRetryable || attempt === 1) {
          throw error;
        }
      }
    }

    const reply =
      response?.text ||
      response?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('') ||
      'No response was generated.';

    res.json({ reply, demoMode: false });
  } catch (error) {
    console.error('API Error:', error);

    const message = error?.message || 'Failed to generate AI response.';
    const errorText = message.toLowerCase();
    const status = error?.status || 500;
    const isApiKeyIssue = errorText.includes('api key') || errorText.includes('invalid_argument');
    const isModelIssue = errorText.includes('model') || errorText.includes('not found') || errorText.includes('not available');
    const isTemporaryServiceIssue =
      status === 503 ||
      errorText.includes('high demand') ||
      errorText.includes('temporarily unavailable') ||
      errorText.includes('unavailable');

    if (isTemporaryServiceIssue) {
      return res.status(503).json({
        error: 'Gemini is temporarily unavailable. Please try again in a moment.',
      });
    }

    if (isApiKeyIssue || isModelIssue) {
      const fallbackMessages = req.body?.messages || [];
      return res.json({
        reply: getDemoReply(Array.isArray(fallbackMessages) ? fallbackMessages : []),
        demoMode: true,
      });
    }

    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
});

function listenOnPort(port) {
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Trying ${nextPort} instead.`);
      server.close(() => listenOnPort(nextPort));
      return;
    }

    console.error('Server startup error:', error);
    process.exit(1);
  });
}

listenOnPort(startingPort);