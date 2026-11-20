/**
 * The app's mails (0.49.2) — pure, so they can be tested without a mail server.
 *
 * Gmail accepted the old registration mail (250 OK) and then dropped it: no
 * inbox, no spam, no trash. A plain test from the same account, with the same
 * sender name and a link to stateofthedart.com, arrived. What the old
 * template had on top: HTML only (no text part), emoji in subject and title,
 * a gradient header, a <style> block, and the "verify your email [button]"
 * shape of phishing. Every mail is now a text part plus simple HTML with
 * inline styles, subjects without emoji, and everything the user typed is
 * escaped (a name or contact message could carry markup into the mail).
 */

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

const SUPPORT = 'support@celox.io';

/** Escape for HTML text and attribute values. */
export const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** A subject is a single line: no line breaks (header injection), trimmed. */
const oneLine = (value: unknown): string => String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 150);

interface Layout {
  title: string;
  /** Paragraphs, already escaped HTML. */
  body: string[];
  action?: { label: string; url: string };
  /** A quieter last paragraph, already escaped HTML. */
  note?: string;
}

const layout = ({ title, body, action, note }: Layout): string => `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f1f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f2;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;font-family:Arial,Helvetica,sans-serif;color:#22191b;">
<tr><td style="padding:24px 28px 8px;font-size:13px;font-weight:bold;letter-spacing:0.04em;color:#b5124f;">STATE OF THE DART</td></tr>
<tr><td style="padding:0 28px;"><h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;color:#22191b;">${esc(title)}</h1></td></tr>
<tr><td style="padding:0 28px;font-size:15px;line-height:1.6;">
${body.map(p => `<p style="margin:0 0 14px;">${p}</p>`).join('\n')}
${action ? `<p style="margin:22px 0;"><a href="${esc(action.url)}" style="display:inline-block;background:#b5124f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:24px;">${esc(action.label)}</a></p>
<p style="margin:0 0 14px;font-size:13px;color:#524345;">Falls der Knopf nicht funktioniert, öffne diesen Link:<br><a href="${esc(action.url)}" style="color:#b5124f;word-break:break-all;">${esc(action.url)}</a></p>` : ''}
${note ? `<p style="margin:18px 0 0;font-size:13px;color:#524345;">${note}</p>` : ''}
</td></tr>
<tr><td style="padding:24px 28px;font-size:12px;color:#524345;border-top:1px solid #f0dee0;">State of the Dart · stateofthedart.com · Fragen: <a href="mailto:${SUPPORT}" style="color:#b5124f;">${SUPPORT}</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const footerText = `\n\n--\nState of the Dart, stateofthedart.com\nFragen: ${SUPPORT}`;

export const verificationMail = (name: string, url: string): MailContent => ({
  subject: 'Bestätige deine E-Mail-Adresse für State of the Dart',
  text: `Hallo ${oneLine(name)},\n\ndanke für deine Registrierung bei State of the Dart. Bestätige bitte deine E-Mail-Adresse, damit dein Konto aktiv wird:\n\n${url}\n\nDer Link ist 24 Stunden gültig. Danach hast du 30 Tage lang alles frei, anschließend spielst du kostenlos weiter.\n\nWenn du dich nicht registriert hast, kannst du diese Mail ignorieren.${footerText}`,
  html: layout({
    title: 'Bestätige deine E-Mail-Adresse',
    body: [
      `Hallo ${esc(name)},`,
      'danke für deine Registrierung bei State of the Dart. Bestätige bitte deine E-Mail-Adresse, damit dein Konto aktiv wird.',
    ],
    action: { label: 'E-Mail-Adresse bestätigen', url },
    note: 'Der Link ist 24 Stunden gültig. Danach hast du 30 Tage lang alles frei, anschließend spielst du kostenlos weiter. Wenn du dich nicht registriert hast, kannst du diese Mail ignorieren.',
  }),
});

export const passwordResetMail = (name: string, url: string): MailContent => ({
  subject: 'Neues Passwort für State of the Dart',
  text: `Hallo ${oneLine(name)},\n\ndu hast ein neues Passwort angefordert. Hier kannst du es setzen:\n\n${url}\n\nDer Link ist 1 Stunde gültig. Wenn du das nicht angefordert hast, ignoriere diese Mail, dein Passwort bleibt unverändert.${footerText}`,
  html: layout({
    title: 'Neues Passwort setzen',
    body: [`Hallo ${esc(name)},`, 'du hast ein neues Passwort angefordert. Über den Knopf setzt du es.'],
    action: { label: 'Neues Passwort setzen', url },
    note: 'Der Link ist 1 Stunde gültig. Wenn du das nicht angefordert hast, ignoriere diese Mail, dein Passwort bleibt unverändert.',
  }),
});

export const welcomeMail = (name: string, appUrl: string): MailContent => ({
  subject: 'Willkommen bei State of the Dart',
  text: `Hallo ${oneLine(name)},\n\ndein Konto ist aktiv. 30 Tage lang ist alles frei: bis zu 8 Spieler pro Spiel, Online-Duelle, Turniere, alle Trainingsmodi, Heatmaps und die komplette Statistik.\n\nDanach spielst du kostenlos weiter (X01, Cricket, Around the Clock und Shanghai mit 2 Spielern pro Spiel) oder schaltest mit Abo oder Lifetime-Lizenz alles frei.\n\nLos geht's: ${appUrl}${footerText}`,
  html: layout({
    title: `Willkommen, ${name}`.length > 60 ? 'Willkommen bei State of the Dart' : `Willkommen, ${name}`,
    body: [
      'dein Konto ist aktiv. 30 Tage lang ist alles frei: bis zu 8 Spieler pro Spiel, Online-Duelle, Turniere, alle Trainingsmodi, Heatmaps und die komplette Statistik.',
      'Danach spielst du kostenlos weiter (X01, Cricket, Around the Clock und Shanghai mit 2 Spielern pro Spiel) oder schaltest mit Abo oder Lifetime-Lizenz alles frei.',
    ],
    action: { label: 'Zur App', url: appUrl },
  }),
});

export const trialReminderMail = (name: string, daysLeft: number, pricingUrl: string): MailContent => ({
  subject: `Deine Testphase bei State of the Dart endet in ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tagen'}`,
  text: `Hallo ${oneLine(name)},\n\ndeine Testphase endet in ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tagen'}. Danach spielst du kostenlos weiter, mit 2 Spielern pro Spiel und 3 eigenen Spielern. Online-Duelle, Turniere, Heatmaps und alle Trainingsmodi gibt es mit Abo oder Lifetime-Lizenz:\n\n${pricingUrl}${footerText}`,
  html: layout({
    title: 'Deine Testphase endet bald',
    body: [
      `Hallo ${esc(name)},`,
      `deine Testphase endet in ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tagen'}. Danach spielst du kostenlos weiter, mit 2 Spielern pro Spiel und 3 eigenen Spielern.`,
      'Online-Duelle, Turniere, Heatmaps und alle Trainingsmodi gibt es mit Abo oder Lifetime-Lizenz.',
    ],
    action: { label: 'Premium ansehen', url: pricingUrl },
  }),
});

/** To support; the visitor's words are escaped, the subject kept on one line. */
export const contactMail = (name: string, email: string, subject: string, message: string): MailContent => ({
  subject: `Kontaktformular: ${oneLine(subject)}`,
  text: `Name: ${oneLine(name)}\nE-Mail: ${oneLine(email)}\nBetreff: ${oneLine(subject)}\n\n${String(message ?? '')}`,
  html: layout({
    title: 'Neue Kontaktanfrage',
    body: [
      `<strong>Name:</strong> ${esc(name)}`,
      `<strong>E-Mail:</strong> ${esc(email)}`,
      `<strong>Betreff:</strong> ${esc(subject)}`,
      `<strong>Nachricht:</strong><br>${esc(message).replace(/\n/g, '<br>')}`,
    ],
    note: 'Gesendet über das Kontaktformular von stateofthedart.com. Antworten gehen direkt an den Absender.',
  }),
});
