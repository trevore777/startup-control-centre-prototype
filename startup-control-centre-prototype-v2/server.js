import express from 'express';
import dotenv from 'dotenv';
import { db, initDb } from './db.js';

dotenv.config();
initDb();

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);

const linkCount = db.prepare(
  "SELECT COUNT(*) AS count FROM important_links"
).get().count;

if (linkCount === 0) {
  const insert = db.prepare(`
    INSERT INTO important_links
    (title,url,category,notes)
    VALUES (?,?,?,?)
  `);

  insert.run(
    "ABN Lookup",
    "https://abr.business.gov.au/",
    "Government",
    "ABN search"
  );

  insert.run(
    "ATO Business",
    "https://www.ato.gov.au/businesses-and-organisations",
    "Tax",
    "Australian Tax Office"
  );

  insert.run(
    "Render",
    "https://render.com",
    "Hosting",
    "Hosting dashboard"
  );

  insert.run(
    "Turso",
    "https://turso.tech",
    "Database",
    "Database hosting"
  );

  insert.run(
    "Vercel",
    "https://vercel.com",
    "Hosting",
    "Frontend hosting"
  );

  insert.run(
    "OpenAI",
    "https://platform.openai.com",
    "AI",
    "API billing"
  );

  insert.run(
    "Stripe",
    "https://dashboard.stripe.com",
    "Payments",
    "Subscriptions"
  );

  insert.run(
    "GitHub",
    "https://github.com",
    "Code",
    "Repositories"
  );

  insert.run(
    "Cloudflare",
    "https://dash.cloudflare.com",
    "DNS",
    "Domains and email routing"
  );
}


app.use((req, res, next) => {
  res.locals.currency = (n) => currency.format(Number(n || 0));
  res.locals.today = today();
  res.locals.monthNow = monthNow();
  next();
});

function totals() {
  const income = db.prepare('SELECT COALESCE(SUM(gross_amount - stripe_fee),0) AS total FROM income').get().total;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount * business_percent / 100.0),0) AS total FROM expenses').get().total;
  const work = db.prepare('SELECT COALESCE(SUM(hours),0) AS hours, COALESCE(SUM(hours * hourly_value),0) AS value FROM work_log').get();
  const due = db.prepare(`SELECT COUNT(*) AS count FROM due_dates WHERE completed = 0 AND due_date <= date('now', '+30 day')`).get().count;
  return { income, expenses, profit: income - expenses, workHours: work.hours, workValue: work.value, due };
}

app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/guides', (req, res) => {
  res.render('guides', { title: 'Reference Guides' });
});
app.get('/dashboard', (req, res) => {
  const profile = db.prepare('SELECT * FROM business_profile WHERE id=1').get();
  const upcoming = db.prepare('SELECT * FROM due_dates WHERE completed=0 ORDER BY due_date ASC LIMIT 6').all();
  const recentExpenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC LIMIT 5').all();
  const recentIncome = db.prepare('SELECT * FROM income ORDER BY income_date DESC, id DESC LIMIT 5').all();
  res.render('dashboard', { title: 'Dashboard', profile, totals: totals(), upcoming, recentExpenses, recentIncome });
});

app.get('/business-profile', (req, res) => {
  res.render('business-profile', { title: 'Business Profile', profile: db.prepare('SELECT * FROM business_profile WHERE id=1').get() });
});
app.post('/business-profile', (req, res) => {
  const p = req.body;
  db.prepare(`UPDATE business_profile SET business_name=?, trading_name=?, abn=?, website=?, business_email=?, business_phone=?, business_structure=?, financial_year_end=?, accountant_name=?, accountant_email=?, notes=? WHERE id=1`)
    .run(p.business_name, p.trading_name, p.abn, p.website, p.business_email, p.business_phone, p.business_structure, p.financial_year_end, p.accountant_name, p.accountant_email, p.notes);
  res.redirect('/business-profile');
});

function listPage(table, view, title) {
  app.get(`/${table}`, (req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
    res.render(view, { title, rows });
  });
}
listPage('accounts', 'accounts', 'Accounts Register');
listPage('expenses', 'expenses', 'Expenses');
listPage('income', 'income', 'Income');
listPage('work_log', 'work-log', 'Founder Work Log');
listPage('due_dates', 'due-dates', 'Due Dates');
listPage('reconciliations', 'reconciliation', 'Monthly Reconciliation');

app.post('/accounts', (req, res) => {
  const p=req.body;
  db.prepare(`INSERT INTO accounts (service,purpose,username,url,renewal_date,monthly_cost,password_location,two_factor_enabled,notes) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(p.service,p.purpose,p.username,p.url,p.renewal_date,Number(p.monthly_cost||0),p.password_location,p.two_factor_enabled?1:0,p.notes);
  res.redirect('/accounts');
});
app.post('/expenses', (req, res) => {
  const p=req.body;
  db.prepare(`INSERT INTO expenses (expense_date,supplier,category,description,amount,gst_included,business_percent,receipt_saved,paid_from,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(p.expense_date,p.supplier,p.category,p.description,Number(p.amount||0),p.gst_included?1:0,Number(p.business_percent||100),p.receipt_saved?1:0,p.paid_from,p.notes);
  res.redirect('/expenses');
});
app.post('/income', (req, res) => {
  const p=req.body;
  db.prepare(`INSERT INTO income (income_date,customer,product,gross_amount,stripe_fee,invoice_ref,notes) VALUES (?,?,?,?,?,?,?)`)
    .run(p.income_date,p.customer,p.product,Number(p.gross_amount||0),Number(p.stripe_fee||0),p.invoice_ref,p.notes);
  res.redirect('/income');
});
app.post('/work_log', (req, res) => {
  const p=req.body;
  db.prepare(`INSERT INTO work_log (work_date,project,task,hours,hourly_value,notes) VALUES (?,?,?,?,?,?)`)
    .run(p.work_date,p.project,p.task,Number(p.hours||0),Number(p.hourly_value||60),p.notes);
  res.redirect('/work_log');
});
app.post('/due_dates', (req, res) => {
  const p=req.body;
  db.prepare(`INSERT INTO due_dates (title,due_date,category,completed,notes) VALUES (?,?,?,?,?)`)
    .run(p.title,p.due_date,p.category,p.completed?1:0,p.notes);
  res.redirect('/due_dates');
});
app.post('/reconciliations', (req, res) => {
  const p=req.body;
  db.prepare(`INSERT INTO reconciliations (month,bank_checked,stripe_report_saved,openai_invoice_saved,hosting_invoice_saved,receipts_saved,profit_reviewed,notes)
              VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(month) DO UPDATE SET bank_checked=excluded.bank_checked, stripe_report_saved=excluded.stripe_report_saved, openai_invoice_saved=excluded.openai_invoice_saved, hosting_invoice_saved=excluded.hosting_invoice_saved, receipts_saved=excluded.receipts_saved, profit_reviewed=excluded.profit_reviewed, notes=excluded.notes`)
    .run(p.month,p.bank_checked?1:0,p.stripe_report_saved?1:0,p.openai_invoice_saved?1:0,p.hosting_invoice_saved?1:0,p.receipts_saved?1:0,p.profit_reviewed?1:0,p.notes);
  res.redirect('/reconciliations');
});

app.post('/toggle-due/:id', (req, res) => {
  db.prepare('UPDATE due_dates SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END WHERE id=?').run(req.params.id);
  res.redirect('/due_dates');
});

app.post('/delete/:table/:id', (req, res) => {
  const allowed = ['accounts','expenses','income','work_log','due_dates','reconciliations'];
  if (!allowed.includes(req.params.table)) return res.status(400).send('Invalid table');
  db.prepare(`DELETE FROM ${req.params.table} WHERE id=?`).run(req.params.id);
  res.redirect('/' + req.params.table);
});

app.get('/reports', (req, res) => {
  const monthly = db.prepare(`
    WITH months AS (
      SELECT substr(income_date,1,7) AS month FROM income
      UNION SELECT substr(expense_date,1,7) AS month FROM expenses
    )
    SELECT m.month,
      COALESCE((SELECT SUM(gross_amount - stripe_fee) FROM income WHERE substr(income_date,1,7)=m.month),0) AS income,
      COALESCE((SELECT SUM(amount * business_percent / 100.0) FROM expenses WHERE substr(expense_date,1,7)=m.month),0) AS expenses
    FROM months m ORDER BY m.month DESC
  `).all();
  const categories = db.prepare(`SELECT category, SUM(amount * business_percent / 100.0) AS total FROM expenses GROUP BY category ORDER BY total DESC`).all();
  res.render('reports', { title: 'Reports', totals: totals(), monthly, categories });
});

app.get('/export/:table.csv', (req, res) => {
  const allowed = ['accounts','expenses','income','work_log','due_dates','reconciliations'];
  if (!allowed.includes(req.params.table)) return res.status(400).send('Invalid table');
  const rows = db.prepare(`SELECT * FROM ${req.params.table}`).all();
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.table}.csv"`);
  res.send(csv);
});

app.get("/important-links", (req, res) => {
  const rows = db.prepare(`
    SELECT *
    FROM important_links
    ORDER BY category, title
  `).all();

  res.render("important-links", {
    title: "Important Links",
    rows
  });
});

app.post("/important-links", (req, res) => {
  const p = req.body;

  db.prepare(`
    INSERT INTO important_links
    (title,url,category,notes)
    VALUES (?,?,?,?)
  `).run(
    p.title,
    p.url,
    p.category,
    p.notes
  );

  res.redirect("/important-links");
});

app.post("/important-links/delete/:id", (req, res) => {
  db.prepare(`
    DELETE FROM important_links
    WHERE id = ?
  `).run(req.params.id);

  res.redirect("/important-links");
});

app.listen(port, () => console.log(`Startup Control Centre running: http://localhost:${port}`));
