export const types = ['Pay stub', 'Bank statement', 'Tax return', 'Asset statement'] as const;
export type DocType = typeof types[number];
export const fields = {
  annual: 'Annual income', monthly: 'Monthly income', cash: 'Cash balance',
  investments: 'Investments', debt: 'Monthly debt payments', collateral: 'Collateral value',
};
export type Field = keyof typeof fields;
export type Values = Partial<Record<Field, number>>;
export const product = 'Secured Line of Credit';
export type DocumentStatus = 'Received and Verified' | 'Pending Verification' | 'Missing';
export type DocumentRecord = {
  id: string; name: string; type: DocType; status: Exclude<DocumentStatus, 'Missing'>;
  extraction?: 'processing' | 'extracted' | 'failed';
  values: Values; detail?: string; href?: string;
};
export const applicants = [
  { name: 'John Smith', email: 'johnsmith@gmail.com', id: 'LP-1042', initials: 'JS', request: 85000, values: {annual: 126000, monthly: 10500, cash: 34800, investments: 72500, debt: 2175, collateral: 140000}},
  { name: 'Jordan Hayes', id: 'LP-1043', initials: 'JH', request: 48000, values: {annual: 78000, monthly: 6500, cash: 17500, investments: 23000, debt: 1820, collateral: 60000}},
  { name: 'Casey Rivera', id: 'LP-1044', initials: 'CR', request: 110000, values: {annual: 156000, monthly: 13000, cash: 61800, investments: 89500, debt: 2800, collateral: 165000}},
];
export const samples = ['pay-stub', 'bank-statement', 'tax-return', 'asset-statement'];
export function sampleDocs(index: number): DocumentRecord[] {
  const { values } = applicants[index];
  const { annual, monthly, cash, investments, debt, collateral } = values;
  const sets = [{monthly}, {cash, debt}, {annual}, {investments, collateral}];
  return [0, 1, 3].map(i => ({
    id: samples[i], name: samples[i] + '.pdf', type: types[i],
    status: 'Received and Verified', values: sets[i], href: '/samples/' + index + '-' + samples[i] + '.pdf',
  }));
}
export function documentStatus(docs: DocumentRecord[], type: DocType): DocumentStatus {
  const matching = docs.filter(doc => doc.type === type);
  if (matching.some(doc => doc.status === 'Received and Verified')) return 'Received and Verified';
  return matching.length ? 'Pending Verification' : 'Missing';
}

export const requestSubject = 'Additional Documentation Required – Line of Credit Application';
export function documentRequest(name: string, missing: DocType[]) {
  return [
    'Dear ' + name + ',',
    'Thank you for applying for a secured line of credit. To continue our review, please upload the following outstanding documents through your secure document portal:',
    missing.map(type => '• ' + type).join('\n'),
    'Please contact us if you have questions or need help submitting these documents.',
    'Sincerely,\nLoan Operations',
  ].join('\n\n');
}

export const defaults = { rate: 7.25, balanceFactor: 1, dti: 40, ltv: 80 };
export function assess(values: Values, request: number, assumptions: typeof defaults) {
  const income = values.monthly ?? (values.annual === undefined ? undefined : values.annual / 12);
  const debt = values.debt;
  const collateral = values.collateral;
  const monthlyRate = assumptions.rate / 1200;
  const qualifyingFactor = Math.max(monthlyRate, assumptions.balanceFactor / 100);
  const dti = income && debt !== undefined ? debt / income * 100 : null;
  const incomeLimit = income && debt !== undefined
    ? Math.floor(Math.max(0, income * assumptions.dti / 100 - debt) / qualifyingFactor)
    : null;
  const collateralLimit = collateral === undefined ? null : Math.floor(collateral * assumptions.ltv / 100);
  const capacity = incomeLimit === null || collateralLimit === null ? null : Math.min(incomeLimit, collateralLimit);
  const limit = capacity === null ? null : Math.min(request, capacity);
  const monthlyInterest = limit === null ? null : limit * monthlyRate;
  const qualifyingPayment = limit === null ? null : limit * qualifyingFactor;
  const projected = qualifyingPayment !== null && income && debt !== undefined
    ? (debt + qualifyingPayment) / income * 100
    : null;
  return { dti, incomeLimit, collateralLimit, capacity, limit, monthlyInterest, qualifyingPayment, projected };
}
const patterns: Record<Field, string> = {
  annual: 'annual (?:gross )?income|annual salary|adjusted gross income',
  monthly: 'monthly (?:gross )?income|gross monthly pay',
  cash: 'cash balance|ending balance|closing balance',
  investments: 'investments|investment balance|portfolio value',
  debt: 'monthly debt payments?|monthly liabilities|monthly debt obligations',
  collateral: 'collateral value|appraised value',
};
export function parseFields(lines: string[]): Values {
  const result: Values = {};
  for (const key of Object.keys(patterns) as Field[]) {
    const re = new RegExp('^(' + patterns[key] + ')\\s*[:=]?\\s*\\$?\\s*(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d{1,2})?\\s*$', 'i');
    const matches = new Set(lines.map(line => line.trim().match(re)).filter(match => match !== null)
      .map(match => Number((match[2] + (match[3] ?? '')).replaceAll(',', ''))).filter(Number.isFinite));
    if (matches.size === 1) result[key] = [...matches][0];
  }
  return result;
}
export function resolveFields(docs: DocumentRecord[], manual: Values, sample: Values) {
  const values: Values = {};
  const sources: Partial<Record<Field, string>> = {};
  for (const key of Object.keys(fields) as Field[]) {
    const direct = docs.filter(doc => doc.extraction === 'extracted' && doc.values[key] !== undefined);
    if (manual[key] !== undefined) {
      values[key] = manual[key]; sources[key] = 'Human correction';
    } else if (new Set(direct.map(doc => doc.values[key])).size > 1) {
      sources[key] = 'Conflicting PDFs';
    } else if (direct.length) {
      values[key] = direct[0].values[key]; sources[key] = direct[0].name;
    } else if (sample[key] !== undefined) {
      values[key] = sample[key]; sources[key] = 'Fictional profile';
    }
  }
  // Prefer extracted or corrected income over fictional profile values.
  const priority = (key: Field) => sources[key] === 'Human correction' ? 3 : values[key] === undefined ? 0 : sources[key] === 'Fictional profile' ? 1 : 2;
  if (priority('annual') > priority('monthly')) {
    values.monthly = values.annual! / 12; sources.monthly = 'Derived from annual income';
  } else if (priority('monthly') > priority('annual')) {
    values.annual = values.monthly! * 12; sources.annual = 'Derived from monthly income';
  }
  return {values, sources};
}
