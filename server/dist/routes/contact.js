"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_1 = require("../services/email");
const router = (0, express_1.Router)();
// Rate limit: simple in-memory tracker (per IP, max 3 per hour)
const contactRateLimit = new Map();
router.post('/', async (req, res) => {
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
        }
        else {
            contactRateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
        }
    }
    else {
        contactRateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
    }
    try {
        await email_1.emailService.sendContactEmail(name, email, subject, message);
        res.json({ message: 'Message sent successfully' });
    }
    catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
exports.default = router;
//# sourceMappingURL=contact.js.map