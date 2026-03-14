const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'coreinventory_super_secret_jwt_key_2024',
    { expiresIn: '7d' }
  );
};

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    const exists = pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    pool.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [id, name, email, password_hash, role || 'staff']
    );
    const user = { id, name, email, role: role || 'staff', created_at: new Date().toISOString() };
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1', [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = generateToken(user);
    delete user.password_hash;
    delete user.otp_code;
    delete user.otp_expires_at;
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// REQUEST OTP (for both password reset and OTP login)
exports.requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const result = pool.query('SELECT id FROM users WHERE email = ? AND is_active = 1', [email]);
    if (result.rows.length > 0) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      pool.query(
        'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
        [otp, expires, email]
      );
      console.log(`📧 OTP for ${email}: ${otp}`);
      const response = { message: 'If an account exists with this email, an OTP has been sent.' };
      if (process.env.NODE_ENV === 'development') response.otp_dev = otp;
      return res.json(response);
    }
    res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// LOGIN WITH OTP
exports.loginWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });
    const result = pool.query(
      'SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > datetime(\'now\') AND is_active = 1',
      [email, otp]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    const user = result.rows[0];
    // Clear OTP after use
    pool.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [user.id]);
    const token = generateToken(user);
    delete user.password_hash;
    delete user.otp_code;
    delete user.otp_expires_at;
    res.json({ user, token });
  } catch (err) {
    console.error('OTP login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    }
    const result = pool.query(
      'SELECT id FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > datetime(\'now\')',
      [email, otp]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    const password_hash = await bcrypt.hash(new_password, 10);
    pool.query(
      'UPDATE users SET password_hash = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
      [password_hash, email]
    );
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const result = pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
