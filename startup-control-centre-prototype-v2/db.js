import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'startup-control-centre.sqlite'));
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT,
      trading_name TEXT,
      abn TEXT,
      website TEXT,
      business_email TEXT,
      business_phone TEXT,
      business_structure TEXT DEFAULT 'Sole trader',
      financial_year_end TEXT DEFAULT '30 June',
      accountant_name TEXT,
      accountant_email TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      purpose TEXT,
      username TEXT,
      url TEXT,
      renewal_date TEXT,
      monthly_cost REAL DEFAULT 0,
      password_location TEXT DEFAULT 'Apple Passwords / 1Password / Bitwarden',
      two_factor_enabled INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_date TEXT NOT NULL,
      supplier TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      gst_included INTEGER DEFAULT 0,
      business_percent REAL DEFAULT 100,
      receipt_saved INTEGER DEFAULT 0,
      paid_from TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_date TEXT NOT NULL,
      customer TEXT NOT NULL,
      product TEXT,
      gross_amount REAL NOT NULL DEFAULT 0,
      stripe_fee REAL DEFAULT 0,
      invoice_ref TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_date TEXT NOT NULL,
      project TEXT NOT NULL,
      task TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      hourly_value REAL DEFAULT 60,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS due_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      completed INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reconciliations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      bank_checked INTEGER DEFAULT 0,
      stripe_report_saved INTEGER DEFAULT 0,
      openai_invoice_saved INTEGER DEFAULT 0,
      hosting_invoice_saved INTEGER DEFAULT 0,
      receipts_saved INTEGER DEFAULT 0,
      profit_reviewed INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.prepare(`INSERT OR IGNORE INTO business_profile (id, business_name, trading_name, website, business_email)
              VALUES (1, 'EDU Apps Plus', 'EDU Apps Plus', 'eduappsplus.com.au', '')`).run();

  const accountCount = db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count;
  if (accountCount === 0) {
    const insert = db.prepare(`INSERT INTO accounts (service, purpose, username, url, renewal_date, monthly_cost, two_factor_enabled, notes)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insert.run('OpenAI', 'AI API usage and billing', '', 'https://platform.openai.com', '', 0, 1, 'Do not store API keys here. Store only where credentials are kept.');
    insert.run('Render', 'Web app hosting', '', 'https://render.com', '', 0, 1, 'Student Evidence / app hosting.');
    insert.run('Turso', 'Production database', '', 'https://turso.tech', '', 0, 1, 'Database hosting.');
    insert.run('Stripe', 'Customer payments', '', 'https://stripe.com', '', 0, 1, 'Download monthly reports for reconciliation.');
  }
}
