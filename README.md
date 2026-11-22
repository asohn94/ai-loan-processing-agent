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

1. Start with John Smith (`johnsmith@gmail.com`) or switch to Jane Doe to try a complete application. Choose **New application** for an empty custom case.
2. The default checklist includes three sample documents marked **Received and Verified** for the demo. Use **Request Missing Documents** to open the email composer for the missing tax return. **Send** confirms a simulation locally.
3. To complete the checklist, open **Sample PDFs** and process the tax return. You can also download and upload it manually. Manual uploads remain **Pending Verification** until marked verified in the demo.
4. Inspect extracted values and enter corrections under **Document processing**. Under **Affordability**, edit the requested credit limit, annual interest rate, qualifying payment floor, maximum DTI, and maximum LTV.
5. Use **Human review** to see checklist progress, the proposed credit limit, and any outstanding requirements. Record an illustrative human approval or rejection. Changes to inputs reset the decision.

## Model and boundaries

- For this secured line of credit, income-based capacity divides monthly DTI headroom (maximum DTI × gross monthly income minus existing monthly liabilities, floored at zero) by the greater of the monthly interest rate and the qualifying payment floor. The example assumes a full draw for underwriting. Collateral-based capacity equals collateral value × maximum LTV. The proposed limit is the smallest of the request and both capacities.
- The interest illustration uses outstanding balance × annual interest rate ÷ 12. The qualifying payment is an underwriting assumption and does not amortize the line. Figures exclude fees, taxes, and insurance.
- PDF.js extracts selectable text locally. Deterministic rules match supported labels and track source filenames, derived values, fictional profile values, and human corrections. Scanned PDFs require OCR, which is outside this demo.
- Verification statuses and human decisions are illustrative. Successfully extracted financial text does not establish authenticity. The demo has no mail delivery, credit bureau, banking API, or durable case storage. Reloading resets the workspace. Use fictional PDFs only.

## Deploy to Vercel

Import this repository as a Vercel project, choose the Next.js framework preset, and use `npm run build`. No environment variables are required. After deployment, verify that the production URL opens without authentication and that the sample PDF extracts successfully. Encode that production URL in the resume QR code.

## Human evaluation

Human Review includes applicant-specific Agent Evaluation. Thumbs up records an acceptance; thumbs down requires a comment and stores a selected improvement area. The history and assessment snapshots stay in local browser storage and survive refresh on the same browser profile. Use fictional data only. The demo has no backend or shared feedback dashboard.

Document Processing and Affordability let reviewers correct inputs and rerun the same rules. Feedback does not modify those rules or underwriting decisions. A real improvement workflow would require authenticated reviewer access, a protected feedback store, review and annotation, an offline evaluation dataset, and a gated release process for changes.
