import nodemailer from 'nodemailer';
import { config } from '../config';
import {
  verificationMail, passwordResetMail, welcomeMail, trialReminderMail, contactMail, type MailContent,
} from './emailTemplates';

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server ready to send emails');
  }
});

/** Replies to an app mail reach a person (support), not the sending account. */
const REPLY_TO = 'support@celox.io';

/** Every mail: a text part and an HTML part (see emailTemplates.ts for why). */
const send = (to: string, mail: MailContent, replyTo: string = REPLY_TO) =>
  transporter.sendMail({ from: config.smtp.from, to, replyTo, subject: mail.subject, text: mail.text, html: mail.html });

export const emailService = {
  async sendVerificationEmail(email: string, token: string, name: string) {
    await send(email, verificationMail(name, `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`));
    console.log(`✅ Verification email sent to ${email}`);
  },

  async sendPasswordResetEmail(email: string, token: string, name: string) {
    await send(email, passwordResetMail(name, `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`));
    console.log(`✅ Password reset email sent to ${email}`);
  },

  async sendWelcomeEmail(email: string, name: string) {
    await send(email, welcomeMail(name, config.appUrl));
    console.log(`✅ Welcome email sent to ${email}`);
  },

  async sendTrialExpiryReminder(email: string, name: string, daysLeft: number) {
    await send(email, trialReminderMail(name, daysLeft, `${config.appUrl}/pricing`));
    console.log(`✅ Trial reminder sent to ${email}`);
  },

  /** To support; replies go to the visitor. */
  async sendContactEmail(name: string, email: string, subject: string, message: string) {
    await send('support@celox.io', contactMail(name, email, subject, message), email);
    console.log(`✅ Contact email sent from ${email}`);
  },
};
