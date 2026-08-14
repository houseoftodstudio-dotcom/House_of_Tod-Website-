require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel / reverse proxy headers for secure session cookies
app.set('trust proxy', 1);

// Health check endpoint for deployment validation
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.isMongo ? 'MongoDB Atlas' : 'SQLite',
    mongoConnected: db.isMongo && db.mongoose ? db.mongoose.connection.readyState === 1 : false,
    timestamp: new Date().toISOString()
  });
});

// Setup Multer for in-memory file uploads (to convert to Base64 & save in MongoDB serverlessly)
const uploadDir = path.join(__dirname, 'public', 'uploads');
const audioUploadDir = path.join(uploadDir, 'audio');
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(audioUploadDir)) fs.mkdirSync(audioUploadDir, { recursive: true });
} catch (e) {}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const audioUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for audio tracks
  fileFilter: (req, file, cb) => {
    const isMimeAudio = file.mimetype.startsWith('audio/');
    const allowedExts = /\.(mp3|wav|m4a|ogg|flac|aac|mpeg|mpga|mp4|wma|aiff|aif|opus|webm)$/i;
    const extOk = allowedExts.test(path.extname(file.originalname));
    if (isMimeAudio || extOk) {
      return cb(null, true);
    }
    cb(new Error('Only audio files (MP3, WAV, M4A, OGG, FLAC, AAC, MPEG, etc.) are allowed!'));
  }
});


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session configuration (uses MongoStore when connected to MongoDB Atlas)
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'houseoftod_production_studio_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
};

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (MONGODB_URI) {
  try {
    sessionConfig.store = MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: 'sessions',
      ttl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (sessionErr) {
    console.warn("MongoStore initialization bypassed:", sessionErr.message);
  }
}

app.use(session(sessionConfig));

// Simple custom rate limiting & lockout stores
const rateLimits = new Map();
const loginFailures = new Map();

// Periodic cleanup of rate limits & login lockouts (only when running as standalone server)
if (!process.env.VERCEL) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimits.entries()) {
      if (now > val.resetTime) rateLimits.delete(key);
    }
    for (const [key, val] of loginFailures.entries()) {
      if (now > val.lockUntil) loginFailures.delete(key);
    }
  }, 60000);
}

// Custom Rate Limiting Middleware
const apiLimiter = (options) => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const key = `${options.prefix || 'general'}__${ip}`;
    const now = Date.now();

    if (!rateLimits.has(key)) {
      rateLimits.set(key, {
        count: 1,
        resetTime: now + (options.windowMs || 15 * 60 * 1000)
      });
      return next();
    }

    const limitInfo = rateLimits.get(key);
    if (now > limitInfo.resetTime) {
      limitInfo.count = 1;
      limitInfo.resetTime = now + (options.windowMs || 15 * 60 * 1000);
      return next();
    }

    limitInfo.count++;
    if (limitInfo.count > (options.max || 100)) {
      return res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.'
      });
    }
    next();
  };
};

// Input sanitization / validation helpers
const sanitizeString = (str, maxLen = 500) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
};

const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// Admin Authentication Middleware for API routes
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Admin session required' });
  }
};

// Route protection for static files
app.get('/login.html', (req, res) => {
  res.redirect('/admin/login.html');
});

app.get('/admin/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/index.html', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

/* ==========================================================================
   SERVERLESS MEDIA DISPATCHER (Serves Base64 / MongoDB / Local Files)
   ========================================================================== */
app.get('/api/media/:filename', (req, res) => {
  const filename = req.params.filename;

  db.getMediaFile(filename, (err, file) => {
    if (!err && file && file.dataUri) {
      const parts = file.dataUri.split(',');
      const match = parts[0].match(/:(.*?);/);
      const mime = match ? match[1] : 'application/octet-stream';
      const imgBuffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(imgBuffer);
    }

    const localUploadPath = path.join(uploadDir, filename);
    const localAudioPath = path.join(audioUploadDir, filename);

    if (fs.existsSync(localUploadPath)) {
      return res.sendFile(localUploadPath);
    }
    if (fs.existsSync(localAudioPath)) {
      return res.sendFile(localAudioPath);
    }

    res.status(404).send('Media file not found');
  });
});

/* ==========================================================================
   FILE UPLOAD API
   ========================================================================== */
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const ext = path.extname(req.file.originalname);
  const name = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${name}_${Date.now()}${ext}`;
  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  db.saveMediaFile(filename, req.file.mimetype, dataUri, (err) => {
    if (err) console.error("Error saving media to DB:", err.message);

    try {
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    } catch (e) {}

    const fileUrl = `/api/media/${filename}`;
    res.json({ success: true, url: fileUrl, filename: filename });
  });
});

/* ==========================================================================
   AUTHENTICATION API
   ========================================================================== */
app.post('/api/login', apiLimiter({
  prefix: 'login',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Try again after 15 mins'
}), (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password must be valid strings' });
  }

  const trimmedUser = username.trim().toLowerCase();
  const now = Date.now();

  if (loginFailures.has(trimmedUser)) {
    const failureInfo = loginFailures.get(trimmedUser);
    if (failureInfo.attempts >= 10 && now < failureInfo.lockUntil) {
      return res.status(423).json({
        error: 'Try again after 15 mins'
      });
    }
    if (failureInfo.lockUntil > 0 && now > failureInfo.lockUntil) {
      loginFailures.delete(trimmedUser);
    }
  }

  db.verifyAdmin(trimmedUser, password, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error during login' });
    }
    if (!user) {
      let failureInfo = loginFailures.get(trimmedUser) || { attempts: 0, lockUntil: 0 };
      failureInfo.attempts++;
      if (failureInfo.attempts >= 10) {
        failureInfo.lockUntil = now + 15 * 60 * 1000;
      }
      loginFailures.set(trimmedUser, failureInfo);

      const remaining = 10 - failureInfo.attempts;
      const errorMsg = remaining > 0
        ? `Invalid credentials. ${remaining} attempts remaining before lock.`
        : 'Try again after 15 mins';

      return res.status(401).json({ error: errorMsg });
    }

    loginFailures.delete(trimmedUser);

    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
    }

    req.session.user = { id: user.id, username: user.username };
    req.session.save((saveErr) => {
      if (saveErr) {
        return res.status(500).json({ error: 'Session save error' });
      }
      res.json({ success: true, user: req.session.user });
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/change-password', requireAuth, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  db.updateAdminPassword(req.session.user.username, newPassword, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update password' });
    }
    res.json({ success: true, message: 'Password updated successfully' });
  });
});

/* ==========================================================================
   STUDIO INFO API
   ========================================================================== */
app.get('/api/studio-info', (req, res) => {
  db.getStudioInfo((err, info) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch studio info' });
    }
    res.json(info);
  });
});

app.post('/api/studio-info', requireAuth, (req, res) => {
  const { bio_title, bio_text, quote_text, quote_author, email, phone_1, phone_2, address, founder_photo, founder_name, founder_role, founder_portfolio } = req.body;

  if (!bio_title || !bio_text || !quote_text || !quote_author || !email || !phone_1 || !address) {
    return res.status(400).json({ error: 'All required general info fields must be populated' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid studio contact email is required' });
  }

  db.updateStudioInfo({
    bio_title: sanitizeString(bio_title, 100),
    bio_text: sanitizeString(bio_text, 1000),
    quote_text: sanitizeString(quote_text, 500),
    quote_author: sanitizeString(quote_author, 100),
    email: sanitizeString(email, 100),
    phone_1: sanitizeString(phone_1, 30),
    phone_2: phone_2 ? sanitizeString(phone_2, 30) : '',
    address: sanitizeString(address, 200),
    founder_photo: founder_photo ? sanitizeString(founder_photo, 500) : '',
    founder_name: founder_name ? sanitizeString(founder_name, 100) : 'Karan Aherewal',
    founder_role: founder_role ? sanitizeString(founder_role, 100) : 'Founder, House of Tod',
    founder_portfolio: founder_portfolio ? sanitizeString(founder_portfolio, 500) : ''
  }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update studio info' });
    }
    res.json({ success: true, message: 'Studio info updated successfully' });
  });
});

/* ==========================================================================
   SERVICES API
   ========================================================================== */
app.get('/api/services', (req, res) => {
  db.getServices((err, services) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch services' });
    }
    res.json(services);
  });
});

app.post('/api/services', requireAuth, (req, res) => {
  const { id, title, description, icon } = req.body;
  if (!title || !icon) {
    return res.status(400).json({ error: 'Title and icon are required' });
  }

  const cleanTitle = sanitizeString(title, 100);
  const cleanDesc = description ? sanitizeString(description, 500) : '';
  const cleanIcon = sanitizeString(icon, 500);

  if (id) {
    db.updateService(id, { title: cleanTitle, description: cleanDesc, icon: cleanIcon }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update service' });
      res.json({ success: true, message: 'Service updated successfully' });
    });
  } else {
    db.addService({ title: cleanTitle, description: cleanDesc, icon: cleanIcon }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to add service' });
      res.json({ success: true, message: 'Service added successfully' });
    });
  }
});

app.delete('/api/services/:id', requireAuth, (req, res) => {
  db.deleteService(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete service' });
    res.json({ success: true, message: 'Service deleted successfully' });
  });
});

/* ==========================================================================
   CREDITS API
   ========================================================================== */
app.get('/api/credits', (req, res) => {
  db.getCredits((err, credits) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch credits' });
    }
    res.json(credits);
  });
});

app.post('/api/credits', requireAuth, (req, res) => {
  const { id, title, role, award } = req.body;
  if (!title || !role) {
    return res.status(400).json({ error: 'Title and role are required' });
  }

  const cleanTitle = sanitizeString(title, 100);
  const cleanRole = sanitizeString(role, 100);
  const isAward = award ? 1 : 0;

  if (id) {
    db.updateCredit(id, { title: cleanTitle, role: cleanRole, award: isAward }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update credit' });
      res.json({ success: true, message: 'Credit updated successfully' });
    });
  } else {
    db.addCredit({ title: cleanTitle, role: cleanRole, award: isAward }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to add credit' });
      res.json({ success: true, message: 'Credit added successfully' });
    });
  }
});

app.delete('/api/credits/:id', requireAuth, (req, res) => {
  db.deleteCredit(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete credit' });
    res.json({ success: true, message: 'Credit deleted successfully' });
  });
});

/* ==========================================================================
   PRICING API
   ========================================================================== */
app.get('/api/pricing', (req, res) => {
  db.getPricing((err, pricing) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch pricing' });
    }
    res.json(pricing);
  });
});

app.post('/api/pricing', requireAuth, (req, res) => {
  const { id, name, price, period, description, features } = req.body;
  if (!name || !price || !period || !description || !features) {
    return res.status(400).json({ error: 'All pricing fields are required' });
  }

  const cleanName = sanitizeString(name, 100);
  const cleanPrice = sanitizeString(price, 50);
  const cleanPeriod = sanitizeString(period, 50);
  const cleanDesc = sanitizeString(description, 300);
  const cleanFeatures = sanitizeString(features, 1000);

  if (id) {
    db.updatePricing(id, { name: cleanName, price: cleanPrice, period: cleanPeriod, description: cleanDesc, features: cleanFeatures }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update pricing plan' });
      res.json({ success: true, message: 'Pricing plan updated successfully' });
    });
  } else {
    db.addPricing({ name: cleanName, price: cleanPrice, period: cleanPeriod, description: cleanDesc, features: cleanFeatures }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to add pricing plan' });
      res.json({ success: true, message: 'Pricing plan added successfully' });
    });
  }
});

app.delete('/api/pricing/:id', requireAuth, (req, res) => {
  db.deletePricing(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete pricing plan' });
    res.json({ success: true, message: 'Pricing plan deleted successfully' });
  });
});

/* ==========================================================================
   PROJECTS API
   ========================================================================== */
app.get('/api/projects', (req, res) => {
  db.getProjects((err, projects) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
    res.json(projects);
  });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { id, project_index, tag, title, description, chips, highlight, music_url, poster_url } = req.body;

  if (!project_index || !tag || !title) {
    return res.status(400).json({ error: 'Project Index, Tag, and Title are required' });
  }

  const cleanIndex = sanitizeString(project_index, 10);
  const cleanTag = sanitizeString(tag, 50);
  const cleanTitle = sanitizeString(title, 100);
  const cleanDesc = description ? sanitizeString(description, 500) : '';
  const cleanChips = chips ? sanitizeString(chips, 300) : '';
  const cleanMusicUrl = music_url ? sanitizeString(music_url, 500) : '';
  const cleanPosterUrl = poster_url ? sanitizeString(poster_url, 500) : '';
  const isHighlight = highlight ? 1 : 0;

  const payload = {
    project_index: cleanIndex,
    tag: cleanTag,
    title: cleanTitle,
    description: cleanDesc,
    chips: cleanChips,
    highlight: isHighlight,
    music_url: cleanMusicUrl,
    poster_url: cleanPosterUrl
  };

  if (id) {
    db.updateProject(id, payload, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update project' });
      res.json({ success: true, message: 'Project updated successfully' });
    });
  } else {
    db.addProject(payload, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to add project' });
      res.json({ success: true, message: 'Project added successfully' });
    });
  }
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  db.deleteProject(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete project' });
    res.json({ success: true, message: 'Project deleted successfully' });
  });
});

/* ==========================================================================
   INQUIRIES (CONTACT) API
   ========================================================================== */
app.post('/api/inquiries', apiLimiter({
  prefix: 'inquiries',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many message submissions. Please try again in an hour.'
}), (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Your name is required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Brief / Message content is required.' });
  }

  const cleanName = sanitizeString(name, 100);
  const cleanEmail = email.trim().substring(0, 100);
  const cleanPhone = phone ? sanitizeString(phone, 30).replace(/[^+\d\s-()]/g, '') : '';
  const cleanMessage = sanitizeString(message, 1500);

  db.addInquiry({ name: cleanName, email: cleanEmail, phone: cleanPhone, message: cleanMessage }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to submit contact message' });
    }
    res.json({ success: true, message: 'Inquiry received. Thank you!' });
  });
});

app.get('/api/inquiries', requireAuth, (req, res) => {
  db.getInquiries((err, inquiries) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
    res.json(inquiries);
  });
});

app.post('/api/inquiries/:id/read', requireAuth, (req, res) => {
  db.markInquiryRead(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to mark inquiry as read' });
    res.json({ success: true, message: 'Inquiry marked as read' });
  });
});

app.delete('/api/inquiries/:id', requireAuth, (req, res) => {
  db.deleteInquiry(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete inquiry' });
    res.json({ success: true, message: 'Inquiry deleted successfully' });
  });
});

/* ==========================================================================
   MUSIC PLAYER & MANAGER API
   ========================================================================== */

app.get('/api/music', (req, res) => {
  const includeInactive = (req.query.all === 'true' || req.query.admin === 'true') && req.session && req.session.user;
  db.getMusicTracks(includeInactive, (err, tracks) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch music playlist' });
    }
    res.json(tracks || []);
  });
});

app.post('/api/music/upload', requireAuth, (req, res) => {
  audioUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Audio file size exceeds the 100MB limit.' });
      }
      return res.status(400).json({ error: err.message || 'Audio file upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    const ext = path.extname(req.file.originalname);
    const name = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${name}_${Date.now()}${ext}`;
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    db.saveMediaFile(filename, req.file.mimetype, dataUri, (saveErr) => {
      if (saveErr) console.error("Error saving audio media to DB:", saveErr.message);

      try {
        if (!fs.existsSync(audioUploadDir)) fs.mkdirSync(audioUploadDir, { recursive: true });
        fs.writeFileSync(path.join(audioUploadDir, filename), req.file.buffer);
      } catch (e) {}

      const fileUrl = `/api/media/${filename}`;
      res.json({
        success: true,
        url: fileUrl,
        filename: filename,
        originalName: req.file.originalname
      });
    });
  });
});

app.post('/api/music', requireAuth, (req, res) => {
  const { title, artist, filename, duration, active } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Song title is required' });
  }
  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const cleanTitle = sanitizeString(title, 150);
  const cleanArtist = artist ? sanitizeString(artist, 150) : 'House of Tod';
  const cleanFilename = sanitizeString(filename, 500);
  const cleanDuration = duration ? parseInt(duration, 10) : 0;
  const isActive = active !== undefined ? (active ? 1 : 0) : 1;

  db.addMusicTrack({
    title: cleanTitle,
    artist: cleanArtist,
    filename: cleanFilename,
    duration: cleanDuration,
    active: isActive
  }, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save track to database' });
    }
    res.json({ success: true, message: 'Track added successfully', id: result ? result.id : null });
  });
});

app.put('/api/music/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const { title, artist, filename, active } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Song title is required' });
  }

  const cleanTitle = sanitizeString(title, 150);
  const cleanArtist = artist ? sanitizeString(artist, 150) : 'House of Tod';
  const cleanFilename = filename ? sanitizeString(filename, 500) : '';
  const isActive = active !== undefined ? (active ? 1 : 0) : 1;

  db.updateMusicTrack(id, {
    title: cleanTitle,
    artist: cleanArtist,
    filename: cleanFilename,
    active: isActive
  }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update track' });
    }
    res.json({ success: true, message: 'Track updated successfully' });
  });
});

app.delete('/api/music/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  db.getMusicTrackById(id, (err, track) => {
    if (err || !track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    db.deleteMusicTrack(id, (delErr) => {
      if (delErr) {
        return res.status(500).json({ error: 'Failed to delete track record' });
      }

      if (track.filename && (track.filename.startsWith('/uploads/audio/') || track.filename.startsWith('/api/media/'))) {
        const fname = path.basename(track.filename);
        const filePath = path.join(audioUploadDir, fname);
        fs.unlink(filePath, () => {});
      }

      res.json({ success: true, message: 'Track deleted successfully' });
    });
  });
});

app.post('/api/music/reorder', requireAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }

  db.reorderMusicTracks(orderedIds, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to reorder playlist' });
    }
    res.json({ success: true, message: 'Playlist reordered successfully' });
  });
});

// Catch-all route to serve static index.html for frontend navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for Vercel Serverless Function deployment
module.exports = app;

// Start local dev server if not executing inside Vercel serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`House of Tod Server running at http://localhost:${PORT}`);
  });
}
