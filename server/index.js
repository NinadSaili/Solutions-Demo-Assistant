import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map(o => o.trim()),
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert IAM/Identity Security presales engineer assistant.
You generate highly practical, customer-specific demo scripts for identity
and access management solutions. Your output is used live during sales demos,
so it must be confident, concise, and technically credible.`;

function buildUserPrompt({ industry, useCase, persona, techStack, additionalContext }) {
  return `Generate a complete presales demo script for the following scenario:

- Industry: ${industry}
- Use Case: ${useCase}
- Audience Persona: ${persona}
- Product/Tech Stack: ${techStack}
- Additional Context: ${additionalContext || 'None provided'}

Structure your response in clearly labeled sections using these exact markdown headers:

## 🎯 Demo Storyline
A 3-4 sentence narrative hook tailored to this industry and persona.
Make it pain-point first.

## 🖥️ Step-by-Step Demo Flow
Numbered steps (6-10 steps). Each step should include:
- What to click / show on screen
- What is happening technically (brief)

## 💬 Talking Points
Bullet points of what to say during the demo.
Persona-specific language (CISO speaks risk, Architect speaks integration, Business speaks ROI).

## ⚠️ Objection Handling
List 3-5 likely objections for this persona + industry,
each with a sharp 2-sentence response.

## 💼 Value Positioning
3 bullet points tying the demo outcome to business value.
Include a one-liner "elevator pitch" at the end.`;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/generate', async (req, res) => {
  const { industry, useCase, persona, techStack, additionalContext } = req.body;

  if (!industry || !useCase || !persona || !techStack) {
    return res.status(400).json({ error: 'Missing required fields: industry, useCase, persona, techStack' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt({ industry, useCase, persona, techStack, additionalContext }) }
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
