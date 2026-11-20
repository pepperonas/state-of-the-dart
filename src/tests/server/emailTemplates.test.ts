import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  verificationMail, passwordResetMail, welcomeMail, trialReminderMail, contactMail, esc,
} from '../../../server/src/services/emailTemplates';

/**
 * 0.49.2: Gmail accepted the old registration mail (250 OK) and then dropped
 * it silently. A plain mail from the same account arrived. These pin what
 * made the difference — and what was unsafe besides.
 */
const URL = 'https://stateofthedart.com/verify-email?token=abc';
const all = [
  verificationMail('Anna', URL),
  passwordResetMail('Anna', URL),
  welcomeMail('Anna', 'https://stateofthedart.com'),
  trialReminderMail('Anna', 3, 'https://stateofthedart.com/pricing'),
  contactMail('Anna', 'anna@example.com', 'Frage', 'Hallo'),
];
const EMOJI = /\p{Extended_Pictographic}/u;

describe('app mails', () => {
  it('every mail has a text part and an HTML part', () => {
    for (const m of all) {
      expect(m.text.length, m.subject).toBeGreaterThan(20);
      expect(m.html, m.subject).toContain('<html');
    }
  });

  it('no emoji in a subject or a title, no gradient, no <style> block', () => {
    for (const m of all) {
      expect(EMOJI.test(m.subject), m.subject).toBe(false);
      expect(m.html).not.toMatch(/linear-gradient|<style/);
      expect(EMOJI.test(m.html.replace(/<[^>]+>/g, '')), m.subject).toBe(false);
    }
  });

  it('the link is in both parts, so the mail works without HTML', () => {
    for (const m of [verificationMail('Anna', URL), passwordResetMail('Anna', URL)]) {
      expect(m.text).toContain(URL);
      expect(m.html).toContain(esc(URL));
    }
  });

  it('whatever a user typed is escaped, and a subject stays on one line', () => {
    const evil = '<a href="https://evil.example">klick</a>';
    for (const m of [verificationMail(evil, URL), contactMail(evil, 'x@y.z', 'Hi\r\nBcc: victim@example.com', evil)]) {
      expect(m.html).not.toContain('<a href="https://evil.example">');
      expect(m.html).toContain('&lt;a href=');
      expect(m.subject).not.toMatch(/[\r\n]/);
    }
  });

  it('the service sends every mail with both parts and a reply-to', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../server/src/services/email.ts'), 'utf8');
    expect(src).toMatch(/sendMail\(\{[^}]*text: mail\.text, html: mail\.html/);
    expect(src).toMatch(/replyTo/);
    expect(src).not.toMatch(/html: `/);
  });
});
