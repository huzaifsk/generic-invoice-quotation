Generic Invoice & Quotation Tool
================================

Minimal, black-and-white workspace for managing invoices, quotations, clients, and reports with fast local persistence.

Running the App
---------------
1. Install dependencies: `npm install`
2. Run in development mode: `npm run dev`
3. Preview the production build: `npm run preview`
4. Create an optimized production bundle: `npm run build`

Design Notes
------------
- The system now ships with a monochrome layout (pure black, white, and neutral gray) and a consistent spacing scale.
- Navigation, cards, tables, and dialogs all rely on thin borders, generous padding, and subtle hover/scale feedback for clarity.
- Primary actions use a black background with white text, secondary actions are white with black borders, and ghost controls are text-only with subtle underlines.
- Inputs lean on thin borders with a darker focus state, and icons stick to a uniform outline set so the UI feels cohesive.

Architecture
------------
- `components/`: The UI surface components (dashboard, lists, editor, forms, etc.).
- `context/AppContext.tsx`: Centralized localStorage-backed state for authentication, clients, documents, and conversions.
- `hooks/useAppContext.ts`: Convenient hook for accessing the context.
- `types.ts`: Shared TypeScript models for documents, clients, company info, etc.

PDF Export
----------
- The editor renders a hidden `PdfDocument` snapshot and captures it via `html2canvas` + `jsPDF` 4.x to preserve the monochrome aesthetic. Save before downloading to keep the PDF in sync with the editor state.