# Startup Control Centre

A simple prototype web app for tracking business setup details, account registers, income, expenses, founder work time, due dates, and monthly reconciliation.

## Run on Mac

```bash
cd startup-control-centre
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Important security note

This prototype is not a password manager. Do not store real passwords, bank card details, API keys, or private recovery codes in it. Store only the username/email and the location where credentials are securely stored, such as Apple Passwords, 1Password, or Bitwarden.

## Pages

- Dashboard
- Business Profile
- Accounts Register
- Expenses
- Income
- Founder Work Log
- Due Dates
- Monthly Reconciliation
- Reports

## Database

The local SQLite database is stored in:

```text
data/startup-control-centre.sqlite
```



## Added Reference Guides

The app now includes `/guides`, a built-in reference area for Turso/database billing checks, OpenAI/API billing checks, monthly reconciliation and EOFY preparation. Use this as a guide only; always check live provider invoices for current pricing and tax records.
