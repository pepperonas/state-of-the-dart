import { Router, Request, Response } from 'express';
import { emailService } from '../services/email';

const router = Router();

// Rate limit: simple in-memory tracker (per IP, max 3 per hour)
const contactRateLimit = new Map<string, { count: number; resetAt: number }>();

router.post('/', async (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
  }

  // Simple rate limiting
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const limit = contactRateLimit.get(ip);
  if (limit) {
    if (now < limit.resetAt) {
      if (limit.count >= 3) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      limit.count++;
    } else {
      contactRateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
    }
  } else {
    contactRateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
  }

  try {
    await emailService.sendContactEmail(name, email, subject, message);
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
