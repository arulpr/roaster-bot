import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { CopilotClient } from '@github/copilot-sdk';

// Extend Express Request type properly
declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

const app = express();
const port = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="background: #1a1a1a; color: #ff4444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
        <div style="text-align: center;">
          <h1 style="font-size: 3rem;">🔥 The Roaster is Online 🔥</h1>
          <p style="color: #ccc;">Prepare your code for total annihilation.</p>
        </div>
      </body>
    </html>
  `);
});

app.post('/agent', limiter, async (req: Request, res: Response) => {
  // Webhook signature verification
  const signature = req.get('X-Hub-Signature-256');
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!signature) {
      return res.status(401).send('Missing signature.');
    }
    const rawBody = req.rawBody;
    if (!rawBody) return res.status(400).send('Missing raw body.');

    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

    try {
      const sigBuffer = Buffer.from(signature);
      const digestBuffer = Buffer.from(digest);
      if (sigBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
        return res.status(401).send('Invalid signature.');
      }
    } catch (e) {
      return res.status(401).send('Invalid signature.');
    }
  }

  const { prompt, repoContext } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const copilot = new CopilotClient();
    const session = await copilot.createSession({
      model: 'claude-3.5-sonnet',
      systemPrompt: 'You are an elite, brutally honest code reviewer and refactoring expert. Your job is to roast code unmercifully, then fix it with surgical precision.'
    });

    const response = await session.send(`Review and roast this code/context:

Prompt: ${prompt}
Context: ${JSON.stringify(repoContext || {})}`);

    res.json({
      status: 'success',
      roastAndFix: response.content
    });
  } catch (error: any) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Internal agent error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`🔥 The Roaster is listening on port ${port}`);
});
