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

  if (webhookSecret && signature) {
    const rawBody = req.rawBody;
    if (!rawBody) return res.status(400).send('Missing raw body.');

    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature);
    const digestBuf = Buffer.from(digest);
    if (sigBuf.length !== digestBuf.length || !crypto.timingSafeEqual(sigBuf, digestBuf)) {
      return res.status(401).send('Invalid signature.');
    }
  }

  try {
    const prompt = req.body.prompt || req.body.message?.content || 'Review this code for quality and bugs.';
    const client = new CopilotClient();
    
    const session = await client.createSession({
      model: 'claude-3.5-sonnet',
      systemMessage: 'You are an aggressive, witty code reviewer known as The Roaster. Tear bad code apart with humor and precision, but offer constructive fixes.'
    });

    const response = await session.sendAndWait(prompt);
    return res.json({ roast: response?.data?.content || 'Your code is spotless... suspiciously spotless.' });
  } catch (error: any) {
    console.error('Copilot SDK Error:', error);
    return res.status(500).json({ error: 'The Roaster choked on your code.', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`🔥 Roaster bot listening on port ${port}`);
});
