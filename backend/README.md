# Backend API (Production-grade Foundation)

This backend supports a full invoice-quotation lifecycle with role-based permissions, validations, audit logs, payments, credit notes, reporting, and automation hooks.

## Setup

1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`

Server: `http://localhost:4000`

## Deploy on Vercel

1. Set Vercel project root to `backend`.
2. Keep framework preset as `Other`.
2. Add required environment variables in Vercel Project Settings:
	- `MONGODB_URI`
	- `MONGODB_DB_NAME`
	- `JWT_SECRET`
	- `JWT_EXPIRES_IN`
	- `CORS_ORIGIN`
3. Redeploy after every env change.

Notes:
- Vercel uses `api/index.js` as the serverless entrypoint.
- All routes are rewritten to the Express app through `vercel.json`.
- Local-only `backend/.env` is not used by Vercel; configure env values in Vercel dashboard.
- If deployment succeeds but runtime fails, check Vercel Function Logs for missing/invalid env values.

## Roles

- `admin`: full access
- `sales`: clients + quotations + invoices + conversions + approvals + reports
- `accounts`: payments + credit notes + reports + notifications + invoice status updates
- `viewer`: read-only
- Backward-compatible aliases: `manager`, `staff`

## Main Modules

- Auth + Users (`/api/auth`, `/api/users`)
- Company settings (`/api/company/me`)
- Clients (`/api/clients`)
- Product/Service catalog (`/api/catalog`)
- Documents: quotation/invoice lifecycle + revisions + conversion (`/api/documents`)
- Payments + receipts (`/api/payments`)
- Credit notes (`/api/credit-notes`)
- Notifications scheduler hooks (`/api/notifications`)
- Activity logs (`/api/activities`)
- Reports (`/api/reports`)

## Lifecycle Highlights

### Quotations
`Draft -> Sent -> Viewed -> Approval Pending -> Approved -> Accepted/Rejected/Expired`

### Invoices
`Draft -> Sent -> Viewed -> Partially Paid -> Paid -> Overdue -> Cancelled`

## Compliance Features

- Immutable, sequence-based document numbers
- Invoice lock after payment/cancellation
- Activity audit log for critical actions
- Credit note linkage to original invoice

## Data Store

Current implementation uses MongoDB through mongoose models (users, companies, clients, documents, payments, credit notes, quote versions, activities, notifications, sequences) with queued writes for consistency.

Environment:
- `MONGODB_URI` (default: `mongodb://localhost:27017`)
- `MONGODB_DB_NAME` (default: `generic_invoice_quotation`)

Migration behavior:
- On first run, if no MongoDB state exists, backend attempts to seed from `backend/data/db.json`.
