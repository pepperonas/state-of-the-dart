"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
// Create transporter
const transporter = nodemailer_1.default.createTransport({
    host: config_1.config.smtp.host,
    port: config_1.config.smtp.port,
    secure: config_1.config.smtp.secure,
    auth: {
        user: config_1.config.smtp.user,
        pass: config_1.config.smtp.password,
    },
});
// Verify connection
transporter.verify((error) => {
    if (error) {
        console.error('❌ SMTP connection error:', error);
    }
    else {
        console.log('✅ SMTP server ready to send emails');
    }
});
exports.emailService = {
    /**
     * Send verification email
     */
    async sendVerificationEmail(email, token, name) {
        const verificationUrl = `${config_1.config.appUrl}/verify-email?token=${token}`;
        const mailOptions = {
            from: config_1.config.smtp.from,
            to: email,
            subject: '🎯 Verifiziere deine Email-Adresse - State of the Dart',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #0ea5e9; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #0284c7; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Willkommen bei State of the Dart!</h1>
            </div>
            <div class="content">
              <p>Hallo ${name},</p>
              <p>vielen Dank für deine Registrierung! Bitte verifiziere deine Email-Adresse, um deinen Account zu aktivieren.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Email verifizieren</a>
              </p>
              <p>Oder kopiere diesen Link in deinen Browser:</p>
              <p style="background: #fff; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px;">
                ${verificationUrl}
              </p>
              <p><strong>Dein 30-Tage-Trial startet nach der Verification!</strong></p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Dieser Link ist 24 Stunden gültig.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 State of the Dart - Deine Darts-Tracking-App</p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    },
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, token, name) {
        const resetUrl = `${config_1.config.appUrl}/reset-password?token=${token}`;
        const mailOptions = {
            from: config_1.config.smtp.from,
            to: email,
            subject: '🔒 Passwort zurücksetzen - State of the Dart',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #0ea5e9; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Passwort zurücksetzen</h1>
            </div>
            <div class="content">
              <p>Hallo ${name},</p>
              <p>du hast eine Passwort-Zurücksetzung angefordert. Klicke auf den Button, um ein neues Passwort zu setzen:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Neues Passwort setzen</a>
              </p>
              <p>Oder kopiere diesen Link in deinen Browser:</p>
              <p style="background: #fff; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px;">
                ${resetUrl}
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Dieser Link ist 1 Stunde gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese Email.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 State of the Dart</p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
    },
    /**
     * Send welcome email after verification
     */
    async sendWelcomeEmail(email, name) {
        const mailOptions = {
            from: config_1.config.smtp.from,
            to: email,
            subject: '🎉 Willkommen! Dein Trial hat begonnen - State of the Dart',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0ea5e9; }
            .button { display: inline-block; background: #0ea5e9; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Willkommen, ${name}!</h1>
            </div>
            <div class="content">
              <p>Dein Account wurde erfolgreich aktiviert! Dein 30-Tage-Trial hat begonnen.</p>
              
              <h3>🎯 Das kannst du jetzt tun:</h3>
              
              <div class="feature">
                <strong>📊 Matches tracken</strong><br>
                Erfasse jedes Spiel mit detaillierten Statistiken
              </div>
              
              <div class="feature">
                <strong>🎯 Trainingsmodi</strong><br>
                Verbessere deine Skills mit speziellen Übungen
              </div>
              
              <div class="feature">
                <strong>🔥 Heatmaps</strong><br>
                Analysiere deine Wurfmuster
              </div>
              
              <div class="feature">
                <strong>🏆 Achievements</strong><br>
                Schalte Erfolge frei und verfolge deinen Fortschritt
              </div>
              
              <p style="text-align: center;">
                <a href="${config_1.config.appUrl}" class="button">Jetzt loslegen!</a>
              </p>
              
              <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 30px;">
                <strong>💡 Tipp:</strong> Nach 30 Tagen endet dein Trial. Du kannst dann ein Abo abschließen oder einmalig freischalten.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 State of the Dart</p>
              <p>Bei Fragen: <a href="mailto:stateofthedart@celox.io">stateofthedart@celox.io</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${email}`);
    },
    /**
     * Send trial expiry reminder
     */
    async sendTrialExpiryReminder(email, name, daysLeft) {
        const mailOptions = {
            from: config_1.config.smtp.from,
            to: email,
            subject: `⏰ Dein Trial endet in ${daysLeft} Tagen - State of the Dart`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #0ea5e9; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Dein Trial endet bald!</h1>
            </div>
            <div class="content">
              <p>Hallo ${name},</p>
              <p>dein 30-Tage-Trial endet in <strong>${daysLeft} Tagen</strong>.</p>
              <p>Um weiterhin alle Features zu nutzen, schließe jetzt ein Abo ab:</p>
              
              <ul>
                <li><strong>Monatlich:</strong> Flexibel, jederzeit kündbar</li>
                <li><strong>Lifetime:</strong> Einmalige Zahlung, lebenslanger Zugriff</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${config_1.config.appUrl}/pricing" class="button">Jetzt upgraden</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2026 State of the Dart</p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Trial expiry reminder sent to ${email}`);
    },
};
//# sourceMappingURL=email.js.map