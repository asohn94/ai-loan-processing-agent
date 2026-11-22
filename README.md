# AI Loan Processing Agent

A recruiter-facing portfolio demo of document intake, illustrative loan assessment, and human underwriting. No login, credentials, database, or external banking connection is required. All bundled applicants and PDFs are fictional.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To validate changes:

```sh
npm test
npm run typecheck
npm run build
```

The build exports a static site to `out/`. The package install step copies the matching PDF.js worker into `public/`. Run `npx tsx scripts/generate-samples.ts` to regenerate the bundled PDFs after editing the fictional profiles.

## Try the workflow

1. Start with Morgan Ellis or switch fictional applicants. Choose **New application** for an empty custom case.
2. Open **Sample PDFs** and select **Process PDF** beside Tax return to complete the default checklist with real text extraction. You can also download the PDF and upload it as a tax return. The default case starts with three simulated documents.
3. Open **Document processing** to inspect the financial values and source labels. Enter human corrections as needed.
4. Open **Affordability** and adjust the requested amount, interest rate, term, DTI limit, and loan-to-value limit under **Edit assumptions**.
5. Review the proposal, then record an illustrative approval or rejection. Approval requires a positive proposal and all configured documents. Changes to the inputs reset the decision.
6. Use **Draft document request** on an incomplete checklist to generate editable, copyable email text.

## Model and boundaries

- Current DTI divides existing monthly debt by gross monthly income. Projected DTI includes the proposed loan payment.
- Monthly payment capacity equals maximum DTI × gross monthly income, less existing monthly debt, floored at zero. A fixed-rate annuity factor converts payment capacity to borrowing capacity. Proposed principal is the smallest of the requested amount, borrowing capacity, and collateral × maximum loan-to-value. Coverage divides collateral by proposed principal.
- PDF.js extracts selectable text in the browser. Deterministic rules match supported financial labels. The app can derive annual or monthly income from the other period when one source takes precedence. Source labels distinguish simulated values, PDF filenames, derived values, and corrections.
- Scans require OCR, which is outside the demo. Unrecognized labels and ambiguous values may require human correction. PDF extraction uses no language model or calibrated confidence scores.
- Figures exclude fees, taxes, and insurance. The model demonstrates a secured loan workflow and produces illustrative figures only. The app has no mail delivery, credit bureau, banking API, automated lending decision, or durable case storage. Reloading resets the workspace. Use fictional PDFs only.

## Deploy to Vercel

Import this repository as a Vercel project, choose the Next.js framework preset, and use `npm run build`. No environment variables are required. After deployment, verify that the production URL opens without authentication and that the sample PDF extracts successfully. Encode that production URL in the resume QR code.
