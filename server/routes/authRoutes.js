const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const pending = new Map();

const allowedEmails = () =>
  (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const hash = (code) =>
  crypto.createHash('sha256').update(code + process.env.JWT_SECRET).digest('hex');

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const BAD = 'Wrong email or password.';

router.post('/login', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  const deviceToken = String((req.body && req.body.deviceToken) || '');

  const okEmail = email && allowedEmails().includes(email);
  const okPass = process.env.ADMIN_PASSWORD && same(password, process.env.ADMIN_PASSWORD);
  if (!okEmail || !okPass) {
    return res.status(401).json({ message: BAD });
  }

  // Known device: email + password is enough
  if (deviceToken) {
    try {
      const d = jwt.verify(deviceToken, process.env.JWT_SECRET);
      if (d.type === 'device' && d.email === email) {
        const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '12h' });
        return res.json({ token });
      }
    } catch (e) {
      // invalid or expired device token: fall through to the email code
    }
  }

  const existing = pending.get(email);
  if (existing && Date.now() - existing.sentAt < RESEND_MS) {
    const wait = Math.ceil((RESEND_MS - (Date.now() - existing.sentAt)) / 1000);
    return res.status(429).json({ message: `Please wait ${wait} seconds before requesting a new code.` });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  pending.set(email, { hash: hash(code), expires: Date.now() + OTP_TTL_MS, attempts: 0, sentAt: Date.now() });

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[DEV ONLY] Login code for ${email}: ${code}`);
    return res.json({ otpRequired: true, message: 'A login code has been sent to your email.' });
  }

  try {
    await transporter.sendMail({
      from: `"Elite College of Management Sciences" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your timetable login code',
      text: `Your login code is ${code}. It is valid for 10 minutes.`,
      html:
        '<div style="font-family:Arial,sans-serif;max-width:420px">' +
        '<h2 style="color:#0f2557;margin-bottom:4px">Elite College of Management Sciences</h2>' +
        '<p style="color:#475569">Your timetable login code is:</p>' +
        `<p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#0f2557">${code}</p>` +
        '<p style="color:#64748b;font-size:13px">It is valid for 10 minutes. If you did not request it, ignore this email.</p>' +
        '</div>',
    });
    res.json({ otpRequired: true, message: 'A login code has been sent to your email.' });
  } catch (err) {
    console.error('Email error:', err.message);
    pending.delete(email);
    res.status(500).json({ message: 'Could not send the email. Check the SMTP settings on the server.' });
  }
});

router.post('/verify-otp', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const code = String((req.body && req.body.code) || '').trim();
  const entry = pending.get(email);

  if (!entry || Date.now() > entry.expires) {
    pending.delete(email);
    return res.status(401).json({ message: 'This code has expired. Please sign in again.' });
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    pending.delete(email);
    return res.status(401).json({ message: 'Too many wrong attempts. Please sign in again.' });
  }

  entry.attempts += 1;
  const a = Buffer.from(hash(code));
  const b = Buffer.from(entry.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ message: 'Wrong code. Please try again.' });
  }

  pending.delete(email);
  const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  const deviceToken = jwt.sign({ type: 'device', email }, process.env.JWT_SECRET, { expiresIn: '365d' });
  res.json({ token, deviceToken });
});

module.exports = router;
