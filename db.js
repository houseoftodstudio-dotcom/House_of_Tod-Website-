require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');

let mongoose = null;
let isMongo = false;

// Check if MONGODB_URI is provided
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (MONGODB_URI) {
  try {
    mongoose = require('mongoose');
    isMongo = true;
  } catch (e) {
    console.warn("Mongoose module not loaded:", e.message);
    isMongo = false;
  }
}

// Global Mongoose Models container
let models = {};

if (isMongo && mongoose) {
  // Define Schemas
  const AdminUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true }
  });

  const StudioInfoSchema = new mongoose.Schema({
    id: { type: Number, default: 1 },
    title: { type: String, default: 'SOUND THAT STAYS. LONG AFTER THE CAMPAIGN ENDS.' },
    sub_title: { type: String, default: 'We craft brand identities, ad campaigns, and sound design engineered for memory — not just attention.' },
    credo: { type: String, default: '"We don\'t make noise. We make memory."' },
    bio_title: { type: String, default: 'House of Tod' },
    bio_text: { type: String, default: 'A budget-friendly production studio out of Pune, built around one belief: in a world of fast, disposable content, the brands that win are the ones that stay in people\'s heads. We craft brand identities, ad campaigns, and sounds engineered for memory — not just attention.' },
    quote_text: { type: String, default: 'We build sound design and brand identities that stay with people — long after the campaign ends.' },
    quote_author: { type: String, default: 'Karan Aherewal, Founder' },
    email: { type: String, default: 'houseoftod.studio@gmail.com' },
    phone_1: { type: String, default: '+91 94035 40578' },
    phone_2: { type: String, default: '+91 95615 91601' },
    address: { type: String, default: 'Pune, Maharashtra' },
    founder_photo: { type: String, default: 'https://static.wixstatic.com/media/686f69_5519b8c692cf495a8491124abd5e105e~mv2.png/v1/crop/x_698,y_1688,w_1738,h_2344/fill/w_480,h_647,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_9213_heic.png' },
    founder_name: { type: String, default: 'Karan Aherewal' },
    founder_role: { type: String, default: 'Founder, House of Tod' },
    founder_portfolio: { type: String, default: '' }
  });

  const ServiceSchema = new mongoose.Schema({
    title: String,
    description: String,
    icon: String
  });

  const CreditSchema = new mongoose.Schema({
    title: String,
    role: String,
    award: { type: Number, default: 0 }
  });

  const PricingSchema = new mongoose.Schema({
    name: String,
    price: String,
    period: String,
    description: String,
    features: String
  });

  const InquirySchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    message: String,
    date: String,
    status: { type: String, default: 'unread' }
  });

  const ProjectSchema = new mongoose.Schema({
    project_index: String,
    tag: String,
    title: String,
    description: String,
    chips: String,
    highlight: { type: Number, default: 0 },
    music_url: String,
    poster_url: String
  });

  const MusicTrackSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, default: 'House of Tod' },
    filename: { type: String, required: true },
    duration: { type: Number, default: 0 },
    display_order: { type: Number, default: 1 },
    active: { type: Number, default: 1 },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() }
  });

  const MediaFileSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true },
    contentType: String,
    dataUri: String,
    created_at: { type: Date, default: Date.now }
  });

  models = {
    AdminUser: mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema),
    StudioInfo: mongoose.models.StudioInfo || mongoose.model('StudioInfo', StudioInfoSchema),
    Service: mongoose.models.Service || mongoose.model('Service', ServiceSchema),
    Credit: mongoose.models.Credit || mongoose.model('Credit', CreditSchema),
    Pricing: mongoose.models.Pricing || mongoose.model('Pricing', PricingSchema),
    Inquiry: mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema),
    Project: mongoose.models.Project || mongoose.model('Project', ProjectSchema),
    MusicTrack: mongoose.models.MusicTrack || mongoose.model('MusicTrack', MusicTrackSchema),
    MediaFile: mongoose.models.MediaFile || mongoose.model('MediaFile', MediaFileSchema)
  };
}

// Seed MongoDB initial collections if empty
const seedMongo = async () => {
  try {
    const adminCount = await models.AdminUser.countDocuments();
    if (adminCount === 0) {
      const defaultUser = (process.env.ADMIN_DEFAULT_USER || 'admin').trim().toLowerCase();
      const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin123';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(defaultPass, salt);
      await models.AdminUser.create({ username: defaultUser, password_hash: hash });
      console.log(`Seeded default admin user (${defaultUser}) in MongoDB.`);
    }

    const studioCount = await models.StudioInfo.countDocuments();
    if (studioCount === 0) {
      await models.StudioInfo.create({ id: 1 });
      console.log("Seeded general studio info in MongoDB.");
    }

    const servicesCount = await models.Service.countDocuments();
    if (servicesCount === 0) {
      const initialServices = [
        { title: 'Music production', description: 'Original musical scores, sonic branding, and custom compositions.', icon: 'music' },
        { title: 'Sound design', description: 'Custom soundscapes, Foley, and audio effects for ads, film, and media.', icon: 'activity' },
        { title: 'Audio engineering', description: 'Technical precision across every stage of audio production.', icon: 'volume-2' },
        { title: 'Live sound', description: 'High-impact live audio setup, acoustics, and stage engineering.', icon: 'volume-2' },
        { title: 'Background scores', description: 'Immersive cinematic scoring that elevates visual storytelling.', icon: 'film' },
        { title: 'Studio recordings', description: 'High-fidelity multitrack recording in acoustically treated space.', icon: 'disc' },
        { title: 'Mixing mastering', description: 'Industry-standard stereo & spatial audio balancing for release.', icon: 'sliders' },
        { title: 'End to end sound production', description: 'Full-spectrum audio production under one roof from concept to master.', icon: 'headphones' }
      ];
      await models.Service.insertMany(initialServices);
      console.log("Seeded initial services in MongoDB.");
    }

    const creditsCount = await models.Credit.countDocuments();
    if (creditsCount === 0) {
      const initialCredits = [
        { title: 'RED FM 93.5', role: 'Sound Engineer', award: 0 },
        { title: 'Radio Mirchi', role: 'Composer', award: 0 },
        { title: 'Aadriyano Audio-Film', role: 'IPAR Festival Winner', award: 1 },
        { title: 'Sadakchaap', role: 'Bassist & Recording Engineer', award: 0 },
        { title: 'Pune Warriors', role: 'WMPL Anthem', award: 0 },
        { title: 'Happy Dent', role: 'Ad Film Sound Design', award: 0 }
      ];
      await models.Credit.insertMany(initialCredits);
      console.log("Seeded initial credits in MongoDB.");
    }

    const pricingCount = await models.Pricing.countDocuments();
    if (pricingCount === 0) {
      const initialPricing = [
        { name: 'Studio Session', price: '₹2,500', period: 'hour', description: 'Ideal for dry recording, vocal tracking, and basic instrumentation setups.', features: 'Professional Vocal Booth,High-End Studio Microphones,Dedicated Sound Engineer,Raw Unprocessed WAV Export' },
        { name: 'Stereo Mix & Master', price: '₹12,000', period: 'track', description: 'Transform your raw multitracks into a polished, industry-standard final product.', features: 'Up to 48 Multitracks,Analog Warmth Processing,Pitch Correction & Alignment,Streaming Ready Masters (Spotify/Apple),2 Revision Rounds Included' },
        { name: 'Full Sonic Branding', price: '₹45,000', period: 'project', description: 'A complete auditory identity built from scratch for your brand, ad campaign, or podcast.', features: 'Original 3-Second Sonic Logo,30-Second Ad Campaign Theme,Fully Custom Composition,Unlimited Mixing/Mastering Revisions,Commercial Rights Included' }
      ];
      await models.Pricing.insertMany(initialPricing);
      console.log("Seeded initial pricing in MongoDB.");
    }

    const projectCount = await models.Project.countDocuments();
    if (projectCount === 0) {
      const initialProjects = [
        { project_index: '01', tag: 'Jazz', title: 'Just One More Drink -- Jazz Noir', description: 'A test', chips: 'Prototype', highlight: 1, music_url: 'https://youtu.be/7gtIh5dF9Xk?si=IalfTd8bT9gmu4Le', poster_url: '/uploads/channels4_banner_1784798744026.jpg' },
        { project_index: '02', tag: 'Podcast', title: 'MIRCHI GULZAR NAAMA', description: 'A tribute to the legend - Gulzar sahab on his birthday !', chips: 'Sound engineer, Mirchi, Pune', highlight: 1, music_url: 'https://gaana.com/podcast/stories/marathi/mirchi-cyber-ki-khabar', poster_url: '/uploads/WhatsApp_Image_2026-07-25_at_10_29_08_PM_1784998825863.jpeg' },
        { project_index: '03', tag: 'Background Score', title: 'Under tha Jackfruit Tree', description: '', chips: 'Background Score', highlight: 1, music_url: 'https://youtu.be/HIIlfs60rp8?si=bc4ripK5uYvX-5MK', poster_url: '/uploads/1750482660761_1785091477255.avif' },
        { project_index: '04', tag: 'Music', title: 'R.A.M', description: '', chips: 'Music production', highlight: 1, music_url: 'https://linktr.ee/randomaccessmachinery?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZnRzaATQNltwZG9mAmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDzEyNDAyNDU3NDI4NzQxNAABp819We_IV0HycmzATkJpxvyrqflLiJmOfwM9yiEYK3iDY3-uytL68qD_NXF0_aem_qrMkoHdz70NHjzjxGtdlfw', poster_url: '/uploads/Of_1785091689340.avif' }
      ];
      await models.Project.insertMany(initialProjects);
      console.log("Seeded initial projects in MongoDB.");
    }

    const musicCount = await models.MusicTrack.countDocuments();
    if (musicCount === 0) {
      const now = new Date().toISOString();
      await models.MusicTrack.create({
        title: 'Midnight Echo',
        artist: 'House of Tod',
        filename: '/uploads/audio/sample_midnight_echo.mp3',
        duration: 180,
        display_order: 1,
        active: 1,
        created_at: now,
        updated_at: now
      });
      console.log("Seeded initial music track in MongoDB.");
    }
  } catch (err) {
    console.error("Error seeding MongoDB:", err.message);
  }
};

let connectionPromise = null;
const ensureConnected = async () => {
  if (!isMongo || !mongoose) return;
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })
      .then(async () => {
        console.log("Connected successfully to MongoDB Atlas.");
        await seedMongo();
      })
      .catch(err => {
        connectionPromise = null;
        console.error("MongoDB connection error:", err.message);
      });
  }
  try {
    await connectionPromise;
  } catch (e) {}
};

// Fallback SQLite Database handle (for local offline dev)
let sqliteDb = null;
if (!isMongo) {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);

    sqliteDb.serialize(() => {
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password_hash TEXT
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS studio_info (
          id INTEGER PRIMARY KEY,
          title TEXT, sub_title TEXT, credo TEXT, bio_title TEXT, bio_text TEXT,
          quote_text TEXT, quote_author TEXT, email TEXT, phone_1 TEXT, phone_2 TEXT,
          address TEXT, founder_photo TEXT, founder_name TEXT, founder_role TEXT, founder_portfolio TEXT
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT, description TEXT, icon TEXT
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS credits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT, role TEXT, award INTEGER DEFAULT 0
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS pricing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT, price TEXT, period TEXT, description TEXT, features TEXT
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS inquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT, email TEXT, phone TEXT, message TEXT, date TEXT, status TEXT DEFAULT 'unread'
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_index TEXT, tag TEXT, title TEXT, description TEXT, chips TEXT, highlight INTEGER DEFAULT 0, music_url TEXT, poster_url TEXT
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS music_tracks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL, artist TEXT NOT NULL, filename TEXT NOT NULL, duration INTEGER DEFAULT 0,
          display_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb.get("SELECT COUNT(*) as count FROM admin_users", [], (err, row) => {
        if (!err && row && row.count === 0) {
          const defaultUser = (process.env.ADMIN_DEFAULT_USER || 'admin').trim().toLowerCase();
          const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin123';
          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync(defaultPass, salt);
          sqliteDb.run("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", [defaultUser, hash]);
        }
      });

      sqliteDb.get("SELECT COUNT(*) as count FROM studio_info", [], (err, row) => {
        if (!err && row && row.count === 0) {
          sqliteDb.run(`
            INSERT INTO studio_info (
              id, title, sub_title, credo, bio_title, bio_text, quote_text, quote_author, email, phone_1, phone_2, address, founder_photo, founder_name, founder_role, founder_portfolio
            ) VALUES (
              1, 
              'SOUND THAT STAYS. LONG AFTER THE CAMPAIGN ENDS.',
              'We craft brand identities, ad campaigns, and sound design engineered for memory — not just attention.',
              '"We don''t make noise. We make memory."',
              'House of Tod',
              'A budget-friendly production studio out of Pune, built around one belief: in a world of fast, disposable content, the brands that win are the ones that stay in people''s heads. We craft brand identities, ad campaigns, and sounds engineered for memory — not just attention.',
              'We build sound design and brand identities that stay with people — long after the campaign ends.',
              'Karan Aherewal, Founder',
              'houseoftod.studio@gmail.com',
              '+91 94035 40578',
              '+91 95615 91601',
              'Pune, Maharashtra',
              'https://static.wixstatic.com/media/686f69_5519b8c692cf495a8491124abd5e105e~mv2.png/v1/crop/x_698,y_1688,w_1738,h_2344/fill/w_480,h_647,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_9213_heic.png',
              'Karan Aherewal',
              'Founder, House of Tod',
              '#'
            )
          `);
        }
      });
    });
  } catch (sqliteErr) {
    console.warn("SQLite initialization bypassed on serverless platform:", sqliteErr.message);
  }
}

// Helper to normalize Mongo document `_id` to `id` string
const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id ? obj._id.toString() : obj.id;
  return obj;
};

const formatDocs = (docs) => {
  if (!Array.isArray(docs)) return [];
  return docs.map(formatDoc);
};


// Unified Export Interface
module.exports = {
  isMongo,
  mongoose,

  getStudioInfo: (cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.StudioInfo ? models.StudioInfo.findOne({ id: 1 }) : null)
        .then(info => cb(null, formatDoc(info)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.get("SELECT * FROM studio_info WHERE id = 1", [], cb);
    } else {
      cb(null, null);
    }
  },

  updateStudioInfo: (data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.StudioInfo.findOneAndUpdate(
          { id: 1 },
          {
            $set: {
              title: data.title, sub_title: data.sub_title, credo: data.credo,
              bio_title: data.bio_title, bio_text: data.bio_text, quote_text: data.quote_text,
              quote_author: data.quote_author, email: data.email, phone_1: data.phone_1,
              phone_2: data.phone_2, address: data.address, founder_photo: data.founder_photo || '',
              founder_name: data.founder_name || 'Karan Aherewal', founder_role: data.founder_role || 'Founder, House of Tod',
              founder_portfolio: data.founder_portfolio || ''
            }
          },
          { upsert: true, new: true }
        ))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run(
        `UPDATE studio_info SET 
          title = ?, sub_title = ?, credo = ?, bio_title = ?, bio_text = ?, 
          quote_text = ?, quote_author = ?, email = ?, phone_1 = ?, phone_2 = ?, address = ?,
          founder_photo = ?, founder_name = ?, founder_role = ?, founder_portfolio = ?
         WHERE id = 1`,
        [
          data.title, data.sub_title, data.credo, data.bio_title, data.bio_text,
          data.quote_text, data.quote_author, data.email, data.phone_1, data.phone_2, data.address,
          data.founder_photo || '', data.founder_name || 'Karan Aherewal', data.founder_role || 'Founder, House of Tod', data.founder_portfolio || ''
        ],
        cb
      );
    } else {
      cb(null);
    }
  },

  getServices: (cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Service ? models.Service.find().sort({ _id: 1 }) : [])
        .then(docs => cb(null, formatDocs(docs)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.all("SELECT * FROM services ORDER BY id ASC", [], cb);
    } else {
      cb(null, []);
    }
  },

  addService: (data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Service.create(data))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("INSERT INTO services (title, description, icon) VALUES (?, ?, ?)", [data.title, data.description, data.icon], cb);
    } else {
      cb(null);
    }
  },

  updateService: (id, data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Service.findByIdAndUpdate(id, { $set: data }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("UPDATE services SET title = ?, description = ?, icon = ? WHERE id = ?", [data.title, data.description, data.icon, id], cb);
    } else {
      cb(null);
    }
  },

  deleteService: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Service.findByIdAndDelete(id))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM services WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  getCredits: (cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Credit ? models.Credit.find().sort({ _id: 1 }) : [])
        .then(docs => cb(null, formatDocs(docs)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.all("SELECT * FROM credits ORDER BY id ASC", [], cb);
    } else {
      cb(null, []);
    }
  },

  addCredit: (data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Credit.create(data))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("INSERT INTO credits (title, role, award) VALUES (?, ?, ?)", [data.title, data.role, data.award], cb);
    } else {
      cb(null);
    }
  },

  updateCredit: (id, data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Credit.findByIdAndUpdate(id, { $set: data }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("UPDATE credits SET title = ?, role = ?, award = ? WHERE id = ?", [data.title, data.role, data.award, id], cb);
    } else {
      cb(null);
    }
  },

  deleteCredit: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Credit.findByIdAndDelete(id))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM credits WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  getPricing: (cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Pricing ? models.Pricing.find().sort({ _id: 1 }) : [])
        .then(docs => cb(null, formatDocs(docs)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.all("SELECT * FROM pricing ORDER BY id ASC", [], cb);
    } else {
      cb(null, []);
    }
  },

  addPricing: (data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Pricing.create(data))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("INSERT INTO pricing (name, price, period, description, features) VALUES (?, ?, ?, ?, ?)", [data.name, data.price, data.period, data.description, data.features], cb);
    } else {
      cb(null);
    }
  },

  updatePricing: (id, data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Pricing.findByIdAndUpdate(id, { $set: data }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("UPDATE pricing SET name = ?, price = ?, period = ?, description = ?, features = ? WHERE id = ?", [data.name, data.price, data.period, data.description, data.features, id], cb);
    } else {
      cb(null);
    }
  },

  deletePricing: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Pricing.findByIdAndDelete(id))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM pricing WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  getInquiries: (cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Inquiry ? models.Inquiry.find().sort({ _id: -1 }) : [])
        .then(docs => cb(null, formatDocs(docs)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.all("SELECT * FROM inquiries ORDER BY id DESC", [], cb);
    } else {
      cb(null, []);
    }
  },

  addInquiry: (data, cb) => {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').slice(0, 19);
    if (isMongo) {
      ensureConnected()
        .then(() => models.Inquiry.create({ ...data, date: formattedDate }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("INSERT INTO inquiries (name, email, phone, message, date) VALUES (?, ?, ?, ?, ?)", [data.name, data.email, data.phone, data.message, formattedDate], cb);
    } else {
      cb(null);
    }
  },

  markInquiryRead: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Inquiry.findByIdAndUpdate(id, { $set: { status: 'read' } }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("UPDATE inquiries SET status = 'read' WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  deleteInquiry: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Inquiry.findByIdAndDelete(id))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM inquiries WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  verifyAdmin: (username, password, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.AdminUser ? models.AdminUser.findOne({ username }) : null)
        .then(user => {
          if (!user) return cb(null, false);
          const matches = bcrypt.compareSync(password, user.password_hash);
          cb(null, matches ? formatDoc(user) : false);
        })
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, user) => {
        if (err) return cb(err);
        if (!user) return cb(null, false);
        const matches = bcrypt.compareSync(password, user.password_hash);
        cb(null, matches ? user : false);
      });
    } else {
      cb(null, false);
    }
  },

  updateAdminPassword: (username, newPassword, cb) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    if (isMongo) {
      ensureConnected()
        .then(() => models.AdminUser.findOneAndUpdate({ username }, { $set: { password_hash: hash } }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("UPDATE admin_users SET password_hash = ? WHERE username = ?", [hash, username], cb);
    } else {
      cb(null);
    }
  },

  getProjects: (cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Project ? models.Project.find().sort({ _id: 1 }) : [])
        .then(docs => cb(null, formatDocs(docs)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.all("SELECT * FROM projects ORDER BY id ASC", [], cb);
    } else {
      cb(null, []);
    }
  },

  addProject: (data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Project.create(data))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run(
        "INSERT INTO projects (project_index, tag, title, description, chips, highlight, music_url, poster_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [data.project_index, data.tag, data.title, data.description || '', data.chips || '', data.highlight || 0, data.music_url || '', data.poster_url || ''],
        cb
      );
    } else {
      cb(null);
    }
  },

  updateProject: (id, data, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Project.findByIdAndUpdate(id, { $set: data }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run(
        "UPDATE projects SET project_index = ?, tag = ?, title = ?, description = ?, chips = ?, highlight = ?, music_url = ?, poster_url = ? WHERE id = ?",
        [data.project_index, data.tag, data.title, data.description || '', data.chips || '', data.highlight || 0, data.music_url || '', data.poster_url || '', id],
        cb
      );
    } else {
      cb(null);
    }
  },

  deleteProject: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.Project.findByIdAndDelete(id))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM projects WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  getMusicTracks: (includeInactive, cb) => {
    if (isMongo) {
      const query = includeInactive ? {} : { active: 1 };
      ensureConnected()
        .then(() => models.MusicTrack ? models.MusicTrack.find(query).sort({ display_order: 1, _id: 1 }).limit(includeInactive ? 100 : 1) : [])
        .then(docs => cb(null, formatDocs(docs)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      const sql = includeInactive
        ? "SELECT * FROM music_tracks ORDER BY display_order ASC, id ASC"
        : "SELECT * FROM music_tracks WHERE active = 1 ORDER BY display_order ASC, id ASC LIMIT 1";
      sqliteDb.all(sql, [], cb);
    } else {
      cb(null, []);
    }
  },

  getMusicTrackById: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.MusicTrack ? models.MusicTrack.findById(id) : null)
        .then(doc => cb(null, formatDoc(doc)))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.get("SELECT * FROM music_tracks WHERE id = ?", [id], cb);
    } else {
      cb(null, null);
    }
  },

  addMusicTrack: (data, cb) => {
    const now = new Date().toISOString();
    if (isMongo) {
      ensureConnected()
        .then(() => models.MusicTrack.deleteMany({}))
        .then(() => {
          return models.MusicTrack.create({
            title: data.title,
            artist: data.artist || 'House of Tod',
            filename: data.filename,
            duration: data.duration || 0,
            display_order: 1,
            active: data.active !== undefined ? data.active : 1,
            created_at: now,
            updated_at: now
          });
        })
        .then(created => cb(null, { id: created._id.toString() }))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM music_tracks", [], (delErr) => {
        if (delErr) return cb(delErr);
        sqliteDb.run(
          "INSERT INTO music_tracks (title, artist, filename, duration, display_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            data.title,
            data.artist || 'House of Tod',
            data.filename,
            data.duration || 0,
            1,
            data.active !== undefined ? data.active : 1,
            now,
            now
          ],
          function(err) {
            if (err) return cb(err);
            cb(null, { id: this.lastID });
          }
        );
      });
    } else {
      cb(null, { id: "1" });
    }
  },

  updateMusicTrack: (id, data, cb) => {
    const now = new Date().toISOString();
    const updateObj = {
      title: data.title,
      artist: data.artist,
      active: data.active !== undefined ? data.active : 1,
      updated_at: now
    };
    if (data.filename) updateObj.filename = data.filename;

    if (isMongo) {
      ensureConnected()
        .then(() => models.MusicTrack.findByIdAndUpdate(id, { $set: updateObj }))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run(
        "UPDATE music_tracks SET title = ?, artist = ?, filename = COALESCE(NULLIF(?, ''), filename), active = ?, updated_at = ? WHERE id = ?",
        [data.title, data.artist, data.filename || '', data.active !== undefined ? data.active : 1, now, id],
        cb
      );
    } else {
      cb(null);
    }
  },

  deleteMusicTrack: (id, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.MusicTrack.findByIdAndDelete(id))
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.run("DELETE FROM music_tracks WHERE id = ?", [id], cb);
    } else {
      cb(null);
    }
  },

  reorderMusicTracks: (orderedIds, cb) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return cb(null);
    if (isMongo) {
      ensureConnected()
        .then(() => {
          const promises = orderedIds.map((id, idx) =>
            models.MusicTrack.findByIdAndUpdate(id, { $set: { display_order: idx + 1 } })
          );
          return Promise.all(promises);
        })
        .then(() => cb(null))
        .catch(err => cb(err));
    } else if (sqliteDb) {
      sqliteDb.serialize(() => {
        const stmt = sqliteDb.prepare("UPDATE music_tracks SET display_order = ? WHERE id = ?");
        orderedIds.forEach((id, idx) => {
          stmt.run([idx + 1, id]);
        });
        stmt.finalize(cb);
      });
    } else {
      cb(null);
    }
  },

  saveMediaFile: (filename, contentType, dataUri, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.MediaFile ? models.MediaFile.findOneAndUpdate(
          { filename },
          { $set: { filename, contentType, dataUri, created_at: new Date() } },
          { upsert: true, new: true }
        ) : null)
        .then(file => cb(null, file))
        .catch(err => cb(err));
    } else {
      cb(null, { filename, dataUri });
    }
  },

  getMediaFile: (filename, cb) => {
    if (isMongo) {
      ensureConnected()
        .then(() => models.MediaFile ? models.MediaFile.findOne({ filename }) : null)
        .then(file => cb(null, file))
        .catch(err => cb(err));
    } else {
      cb(null, null);
    }
  }
};
