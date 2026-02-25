import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { Newsletter } from '../models/newsletter.model';
import { sendSuccess, sendBadRequest, sendServerError } from '../utils/response';

const router = Router();
const resend  = new Resend(process.env.RESEND_API_KEY);

// Your verified sender domain — update this to match your Resend verified domain.
// During development you can use: onboarding@resend.dev (Resend's test address)
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL ?? 'onboarding@resend.dev';
const APP_NAME   = process.env.APP_NAME ?? 'NFT Marketplace';

// ── POST /api/newsletter/subscribe ───────────────────────────────────────────
router.post('/subscribe', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return void sendBadRequest(res, 'Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return void sendBadRequest(res, 'Invalid email address');
  }

  const normalised = email.trim().toLowerCase();

  try {
    const existing = await Newsletter.findOne({ email: normalised });

    if (existing?.active) {
      // Already subscribed — still return success (privacy best practice)
      return void sendSuccess(res, { message: 'Already subscribed' });
    }

    if (existing && !existing.active) {
      // Reactivate
      existing.active       = true;
      existing.subscribedAt = new Date();
      await existing.save();
    } else {
      await Newsletter.create({ email: normalised });
    }

    // ── Send confirmation email ───────────────────────────────────────────
    try {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      normalised,
        subject: `Welcome to ${APP_NAME}! You're subscribed 🎉`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f0f0f; color: #ffffff; border-radius: 12px;">
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">You're in! 🎉</h1>
            <p style="color: #aaaaaa; margin-bottom: 24px;">
              Thanks for subscribing to <strong style="color: #ffffff;">${APP_NAME}</strong>.
              You'll receive exclusive updates, drops, and promotions directly in your inbox.
            </p>
            <p style="color: #aaaaaa; font-size: 13px; margin-top: 32px; border-top: 1px solid #222; padding-top: 16px;">
              If you didn't subscribe, you can safely ignore this email.
              <br/>
              <a href="${process.env.FRONTEND_URL ?? '#'}/newsletter/unsubscribe?email=${encodeURIComponent(normalised)}"
                style="color: #6366f1;">Unsubscribe</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Email sending failed — log it but don't fail the subscription
      // The user is already saved to DB, email can be retried manually
      console.error('Failed to send confirmation email:', emailErr);
    }

    sendSuccess(res, { message: 'Subscribed successfully' });
  } catch (err) {
    sendServerError(res, err, 'POST /newsletter/subscribe');
  }
});

// ── POST /api/newsletter/unsubscribe ─────────────────────────────────────────
router.post('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) return void sendBadRequest(res, 'Email is required');

  try {
    await Newsletter.findOneAndUpdate(
      { email: email.toLowerCase() },
      { active: false }
    );
    sendSuccess(res, { message: 'Unsubscribed successfully' });
  } catch (err) {
    sendServerError(res, err, 'POST /newsletter/unsubscribe');
  }
});

// ── GET /api/newsletter/subscribers ──────────────────────────────────────────
router.get('/subscribers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await Newsletter.find({ active: true }).sort({ subscribedAt: -1 });
    sendSuccess(res, subscribers);
  } catch (err) {
    sendServerError(res, err, 'GET /newsletter/subscribers');
  }
});

export default router;