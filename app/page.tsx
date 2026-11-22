'use client';

import { useRef, useState } from 'react';
import { Activity, ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Download, FileCheck2, FileText, Gauge, LayoutGrid, ListChecks, Mail, Plus, Send, Settings2, ShieldCheck, Sparkles, TriangleAlert, Upload, X } from 'lucide-react';
import { applicants, assess, defaults, documentRequest, documentStatus, fields, product, requestSubject, resolveFields, sampleDocs, samples, types, type DocType, type DocumentRecord, type Field, type Values } from '../lib/loan';
import { extractPdf } from '../lib/pdf';

import { intakeTabs, nextWorkflowAction, type IntakeTab, type ReviewDecision } from '../lib/workflow';
import { AgentEvaluation } from './agent-evaluation';

const intakeIcons = {
  'document-processing': FileCheck2,
  affordability: Gauge,
  'credit-proposal': Banknote,
};
const money = (value: number | null | undefined, cents = false) => value == null ? '—' : new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:cents ? 2 : 0,minimumFractionDigits:cents ? 2 : 0}).format(value);
const percent = (n: number | null) => n == null ? '—' : n.toFixed(1) + '%';
const assumptionFields = [
  {id:'rate', label:'Annual interest rate (%)', min:0, max:50, step:0.01},
  {id:'balanceFactor', label:'Qualifying payment floor (% of balance)', min:0.01, max:100, step:0.01},
  {id:'dti', label:'Maximum total DTI (%)', min:1, max:100, step:1},
  {id:'ltv', label:'Maximum loan-to-value (%)', min:1, max:100, step:1},
] as const;

export default function Home() {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<'client-intake' | 'human-review'>('client-intake');
  const [intakeTab, setIntakeTab] = useState<IntakeTab | 'client-intake'>('client-intake');
  const [customId, setCustomId] = useState('');
  const [rerunNotice, setRerunNotice] = useState('');
  const [docs, setDocs] = useState(() => sampleDocs(0));
  const [required, setRequired] = useState<DocType[]>([...types]);
  const [selectedType, setSelectedType] = useState<DocType>('Pay stub');
  const [manual, setManual] = useState<Values>({});
  const [assumptions, setAssumptions] = useState(defaults);
  const [request, setRequest] = useState(applicants[0].request);
  const [proposalReviewed, setProposalReviewed] = useState(true);
  const [status, setStatus] = useState<ReviewDecision>('Pending review');
  const [modal, setModal] = useState<'upload' | 'checklist' | 'settings' | 'email' | 'samples' | 'help' | null>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const session = useRef(0);
  const applicant = applicants[index];
  const {values, sources} = resolveFields(docs, manual, applicant?.values ?? {});
  const missing = required.filter(type => documentStatus(docs, type) === 'Missing');
  const unverified = required.filter(type => documentStatus(docs, type) === 'Pending Verification');
  const received = required.filter(type => documentStatus(docs, type) === 'Received and Verified');
  const done = received.length;
  const result = assess(values, request, assumptions);
  const pending = docs.some(doc => doc.extraction === 'processing');
  const otherRequirements = [
    ...(pending ? ['PDF processing is in progress.'] : []),
    ...(result.limit === null ? ['Complete gross income, monthly liabilities, and collateral value.'] : []),
    ...(result.limit === 0 ? ['The current inputs support no positive credit limit.'] : []),
  ];
  const outstanding = [
    ...missing.map(type => type + ' — Missing'),
    ...unverified.map(type => type + ' — Pending Verification'),
    ...otherRequirements,
  ];
  const proposalReady = outstanding.length === 0;
  const approved = status === 'Approved in demo';
  const decisionRecorded = status !== 'Pending review';
  const reviewStatus = decisionRecorded ? status : proposalReady ? 'Ready for human review' : 'Pending review';
  const nextAction = nextWorkflowAction({
    processing: pending, missing: missing.length, unverified: unverified.length, limit: result.limit, decision: status, proposalNeedsReview: !proposalReviewed && !(view === 'client-intake' && intakeTab === 'credit-proposal'),
  });
  function openIntake(tab: IntakeTab | 'client-intake') {
    setView('client-intake');
    setIntakeTab(tab);
    if (tab === 'credit-proposal' && proposalReady) setProposalReviewed(true);
  }
  function rerunAssessment() {
    const assessment = assess(values, request, assumptions);
    setRerunNotice(assessment.limit === null
      ? 'Assessment rerun. Financial inputs are still incomplete.'
      : 'Assessment rerun with current inputs. Illustrative credit limit: ' + money(assessment.limit) + '.');
  }
  const overview = view === 'client-intake' && intakeTab === 'client-intake';
  const applicantName = applicant?.name ?? 'This application';
  const summary = decisionRecorded ? applicantName + (approved ? ' was approved in this demo.' : ' was declined in this demo.')
    : pending ? 'I’m processing documents for ' + (applicant?.name ?? 'this application') + '.'
    : missing.length ? (docs.length ? 'I reviewed the documents on file for ' + (applicant?.name ?? 'this application') + '. ' : '') + 'Still needed: ' + missing.join(', ').toLowerCase() + '.'
    : unverified.length ? 'I’ve received the documents for ' + (applicant?.name ?? 'this application') + '. Some still need review.'
    : result.limit === null ? 'I need more financial information to assess ' + (applicant?.name ?? 'this application') + '.'
    : result.limit === 0 ? 'The current figures don’t support a credit limit for ' + (applicant?.name ?? 'this application') + '.'
    : 'The documents are on file and my illustrative credit assessment for ' + (applicant?.name ?? 'this application') + ' is ready.';

  function takeNextAction() {
    if (nextAction.target === 'request-documents') openEmail();
    else if (nextAction.target === 'human-review') {
      if (view === 'human-review') document.getElementById('underwriting-decision')?.focus();
      else setView('human-review');
    } else {
      openIntake(nextAction.target);
      if (nextAction.target === 'affordability' && result.limit === null) rerunAssessment();
      if (view === 'client-intake' && intakeTab === nextAction.target) {
        document.getElementById(intakeTab)?.focus();
      }
    }
  }
  function actionButton() {
    return <button className="primary guided-action" onClick={takeNextAction}>
      {view === 'human-review' && nextAction.label === 'Go to Human Review' ? 'Go to Underwriting Decision' : nextAction.label}<ArrowRight size={18} aria-hidden="true"/>
    </button>;
  }
  function resetReview() {
    setStatus('Pending review');
    setProposalReviewed(false);
    setRerunNotice('');
  }
  function selectApplicant(next: number) {
    session.current++;
    if (next < 0) setCustomId(crypto.randomUUID());
    setIndex(next); setDocs(next < 0 ? [] : sampleDocs(next)); setManual({}); resetReview();
    setRequest(applicants[next]?.request ?? 0);
    if (next >= 0) setProposalReviewed(true);
    setMessage('');
  }
  async function upload(files: FileList | File[] | null, type = selectedType, bundledSample = false) {
    if (!files?.length) return;
    const current = session.current;
    const newDocs: DocumentRecord[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(), name: file.name, type, status:'Pending Verification', extraction:'processing', values:{},
    }));
    setDocs(previous => [...previous, ...newDocs]);
    resetReview();
    setModal(null);
    await Promise.all(Array.from(files).map(async (file, i) => {
      const record = newDocs[i];
      let update: DocumentRecord;
      try {
        const extracted = await extractPdf(file);
        const matched = Object.keys(extracted.values).length > 0;
        update = {
          ...record,
          ...extracted,
          extraction: matched ? 'extracted' : 'failed',
          status: matched && bundledSample ? 'Received and Verified' : 'Pending Verification',
        };
      } catch (error) {
        update = {...record, extraction:'failed', detail:error instanceof Error ? error.message : 'PDF could not be read'};
      }
      if (session.current === current) {
        setDocs(previous => previous.map(doc => doc.id === record.id ? update : doc));
      }
    }));
  }
  async function processSample(type: DocType) {
    const current = session.current;
    const slug = samples[types.indexOf(type)];
    setMessage('Loading sample PDF…');
    try {
      const response = await fetch('/samples/' + Math.max(0,index) + '-' + slug + '.pdf');
      if (!response.ok) throw new Error('Sample PDF unavailable.');
      const file = new File([await response.blob()], slug + '.pdf', {type:'application/pdf'});
      if (session.current === current) await upload([file], type, true);
    } catch {
      if (session.current === current) setMessage('Could not load the sample PDF. Try downloading it instead.');
    }
  }
  function openEmail() {
    setRecipient(applicant?.email ?? '');
    setSubject(requestSubject);
    setDraft(documentRequest(applicant?.name ?? 'Applicant', missing));
    setSent(false);
    setModal('email');
  }
  function changeField(key: Field, input: string) {
    const next = {...manual};
    if (input === '') delete next[key];
    else next[key] = Number(input);
    setManual(next); resetReview();
  }
  function documents() {
    return <section className="panel documents">
      <div className="panel-head"><div><h2>Document intake</h2><p>Manage supporting documents for this application.</p></div><button className="primary" onClick={() => setModal('upload')}><Upload size={16}/> Upload PDF</button></div>
      <div className="table-wrap"><table><thead><tr><th>Document</th><th>Type</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {docs.map(doc => <tr key={doc.id}>
          <td><div className="file"><span className="file-icon"><FileText size={17}/></span><div><strong>{doc.name}</strong><small title={doc.detail}>{doc.detail ?? (doc.extraction === 'processing' ? 'Extracting PDF text…' : 'Fictional sample data')}</small></div></div></td>
          <td>{doc.type}</td><td><span className={'pill ' + (doc.status === 'Pending Verification' ? 'warn' : 'good')}>{doc.status}</span></td>
          <td><div className="row-actions">{doc.status === 'Pending Verification' && doc.extraction !== 'processing' && <button className="text-button" onClick={() => {
            setDocs(previous => previous.map(item => item.id === doc.id ? {...item, status:'Received and Verified'} : item));
            resetReview();
          }}>Mark verified in demo</button>}{doc.href && <a className="icon-button" href={doc.href} download aria-label={'Download ' + doc.name}><Download size={15}/></a>}<button className="icon-button" aria-label={'Remove ' + doc.name} onClick={() => {setDocs(previous => previous.filter(item => item.id !== doc.id)); resetReview();}}><X size={15}/></button></div></td>
        </tr>)}
        {!docs.length && <tr><td colSpan={4} className="empty">Upload a fictional PDF or choose a sample applicant.</td></tr>}
      </tbody></table></div>
      <div className="panel-foot"><button className="text-button" onClick={() => {setMessage(''); setModal('samples');}}><Download size={15}/> Sample PDFs</button></div>
    </section>;
  }
  function checklist() {
    return <section className="panel checklist">
      <div className="panel-head"><div><h2>Document checklist</h2><p>{done} of {required.length} requirements met</p></div><button className="icon-button framed" aria-label="Configure checklist" onClick={() => setModal('checklist')}><Settings2 size={17}/></button></div>
      <progress aria-label="Required documents received" value={done} max={required.length || 1}/>
      <div className="check-items">{required.map(type => {
        const state = documentStatus(docs, type);
        const verified = state === 'Received and Verified';
        return <div key={type}><span className={'check-icon ' + (verified ? 'good' : 'warn')}>{verified ? <Check size={15}/> : <TriangleAlert size={14}/>}</span><span>{type}</span><small className={verified ? '' : 'warning-text'}>{state}</small></div>;
      })}{!required.length && <p>No documents required.</p>}</div>
      {missing.length > 0 && nextAction.target !== 'request-documents' && <button className="secondary email-button" onClick={openEmail}><Mail size={16}/> Request Missing Documents</button>}
    </section>;
  }
  function finances() {
    return <section className="panel">
      <div className="panel-head"><div><h2>Financial profile</h2><p>Review sources and enter corrections. Clear a correction to restore the underlying value.</p></div></div>
      <div className="financial-grid">{(Object.keys(fields) as Field[]).map(key => <label key={key} className="financial">
        <span>{fields[key]}</span><strong>{money(values[key], true)}</strong><small>{sources[key] ?? 'No value available'}</small>
        <input type="number" aria-label={'Correct ' + fields[key]} min="0" max="1000000000" step="0.01" placeholder="Enter correction" value={manual[key] ?? ''} onChange={event => {
          if (event.target.validity.valid) changeField(key,event.target.value);
        }}/>
      </label>)}</div>
    </section>;
  }
  function metrics() {
    const items = [
      ['Current debt-to-income', percent(result.dti), 'Monthly debt ÷ gross monthly income'],
      ['Income-based limit', money(result.incomeLimit), 'DTI headroom ÷ qualifying payment factor'],
      ['Collateral-based limit', money(result.collateralLimit), 'Collateral value × maximum loan-to-value'],
    ];
    return <div className="metrics">{items.map(([title,value,detail]) => <section className="panel metric" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></section>)}</div>;
  }
  function proposal() {
    return <section className="panel">
      <div className="panel-head"><div><h2>Secured Line of Credit proposal</h2><p>The proposed limit is capped by the request and the lower of income-based and collateral-based capacity.</p></div><span className="pill neutral">{reviewStatus}</span></div>
      <div className="financial-grid terms">
        {[
          ['Requested credit limit', money(request)],
          [approved ? 'Human-approved credit limit (demo)' : 'Proposed credit limit', money(result.limit)],
          ['Collateral value', money(values.collateral)],
          ['Annual interest rate', assumptions.rate + '%'],
          ['Borrowing capacity', money(result.capacity)],
          ['Monthly interest at full draw', money(result.monthlyInterest, true)],
          ['Qualifying monthly payment at full draw', money(result.qualifyingPayment, true)],
          ['Projected total DTI at full draw', percent(result.projected)],
        ].map(([label,value]) => <div className="financial" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="panel-foot"><p>Interest accrues on the outstanding balance. Monthly interest is illustrated as balance × annual rate ÷ 12. Fees are excluded.</p><button className="secondary" onClick={() => setModal('settings')}><Settings2 size={16}/> Edit assumptions</button></div>
    </section>;
  }
  function humanReview() {
    return <div className="review-grid" aria-label="Human review summary">
      <section className="panel checklist">
        <div className="panel-head"><h2>Document Verification Summary</h2></div>
        <dl className="review-values">
          <div><dt>Required documents</dt><dd>{required.length}</dd></div>
          <div><dt>Received and Verified</dt><dd>{done}</dd></div>
          <div><dt>Missing or pending</dt><dd>{missing.length + unverified.length}</dd></div>
        </dl>
        <progress aria-label="Illustrative verification completion" value={required.length ? done : 1} max={required.length || 1}/>
        <p className="review-completion">{!required.length ? 'No documents required' : done === required.length ? 'All received and verified' : done + ' of ' + required.length + ' complete'}</p>
      </section>
      <section className="panel" id="underwriting-decision" tabIndex={-1}>
        <div className="panel-head"><h2>Credit Decision Summary</h2><span className={'pill ' + (approved ? 'good' : status === 'Rejected in demo' ? 'warn' : 'neutral')} role="status">{reviewStatus}</span></div>
        <dl className="review-values">
          <div><dt>Requested credit limit</dt><dd>{money(request)}</dd></div>
          <div><dt>{approved ? 'Human-approved credit limit (demo)' : 'Proposed credit limit'}</dt><dd>{money(result.limit)}</dd></div>
          <div><dt>Collateral value</dt><dd>{money(values.collateral)}</dd></div>
          <div><dt>Annual interest rate</dt><dd>{assumptions.rate}%</dd></div>
        </dl>
      </section>
      <section className="panel review-outstanding">
        <div className="panel-head"><div><h2>Outstanding Requirements</h2>
          <p>{outstanding.length ? 'Resolve these items before approving the proposal.' : 'None'}</p>
        </div></div>
        {outstanding.length > 0 && <ul className="review-blockers">{outstanding.map(item => <li key={item}><TriangleAlert size={16}/>{item}</li>)}</ul>}
        <div className="panel-foot review-actions">
          {missing.length > 0 && nextAction.target !== 'request-documents' && <button className="secondary" onClick={openEmail}><Mail size={16}/> Request Missing Documents</button>}
          <button className="secondary" onClick={() => setStatus('Rejected in demo')}>Reject proposal</button>
          <button className="primary" disabled={!proposalReady || approved} onClick={() => setStatus('Approved in demo')}><BadgeCheck size={17}/> Approve proposal</button>
        </div>
      </section>
      <AgentEvaluation
        key={applicant?.id ?? customId}
        applicantId={applicant?.id ?? customId}
        evaluating={pending}
        assessment={{financialValues:values, assumptions, requestedLimit:request, results:result, missingDocuments:missing, pendingDocuments:unverified}}
      />
    </div>;
  }
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Activity size={23} aria-hidden="true"/></div><div><strong>LoanFlow</strong><small>AI PROCESSING AGENT</small></div></div>
      <nav aria-label="Workspace navigation">
        <div className="nav-label">Workspace</div>
        <ul className="sidebar-pages">
          <li>
            <button aria-current={view === 'client-intake' && intakeTab === 'client-intake' ? 'page' : undefined} onClick={() => openIntake('client-intake')}><BriefcaseBusiness size={19} aria-hidden="true"/> Client Intake</button>
            <ul className="intake-pages" aria-label="Client Intake supporting pages">
              {intakeTabs.map(tab => {
                const Icon = intakeIcons[tab.id];
                return <li key={tab.id}><button aria-current={view === 'client-intake' && intakeTab === tab.id ? 'page' : undefined} onClick={() => openIntake(tab.id)}><Icon size={16} aria-hidden="true"/> {tab.label}</button></li>;
              })}
            </ul>
          </li>
          <li><button aria-current={view === 'human-review' ? 'page' : undefined} onClick={() => setView('human-review')}><ShieldCheck size={19} aria-hidden="true"/> Human Review</button></li>
        </ul>
      </nav>
      <div className="sidebar-foot"><ShieldCheck size={18} aria-hidden="true"/><div><strong>Portfolio sandbox</strong><small>Fictional data only</small></div></div>
    </aside>
    <main>
      <header className="topbar"><div className="breadcrumbs"><LayoutGrid size={16}/> <span>Workspace</span><ChevronRight size={14}/><strong>{product}</strong></div><button className="text-button" onClick={() => setModal('help')}><CircleHelp size={16}/> About the demo</button></header>
      <div className="workspace">
        <div className="intro"><div><h1>AI Loan Processing Agent</h1><p>An AI-powered agent that reviews loan documents, assesses credit eligibility, and prepares loan proposals for human approval.</p></div></div>
        <section className="agent-summary" aria-labelledby="activity-heading">
          <div className="agent-summary-copy">
            <div className="agent-summary-label"><Activity size={17} aria-hidden="true"/> Agent Summary</div>
            <h2 id="activity-heading" aria-live="polite">{summary}</h2>
            {!overview && actionButton()}
          </div>
          {view === 'client-intake' && <div className="summary-applicant">
            <label htmlFor="applicant">Fictional applicant</label>
            <div className="select-shell">
              <select id="applicant" value={index < 0 ? '' : index} ref={select => { if (select && index < 0) select.selectedIndex = -1; }} onChange={event => selectApplicant(Number(event.target.value))}>
                {applicants.map((item,i) => <option key={item.id} value={i}>{item.name}</option>)}
              </select>
              <ChevronDown size={16} aria-hidden="true"/>
            </div>
            {intakeTab === 'document-processing' && <button className="hero-new" onClick={() => {selectApplicant(-1); openIntake('document-processing');}}><Plus size={15}/> New application</button>}
          </div>}
        </section>

        {view === 'client-intake' &&
          <div id={intakeTab} className="stack" tabIndex={-1}>
            {overview && <>
              <section className="panel overview-documents" aria-labelledby="overview-documents-heading">
                <h2 id="overview-documents-heading">Document Status</h2>
                <div className="overview-document-groups">
                  <div>
                    <h3>Received &amp; Verified</h3>
                    {received.length === 0 ? <p>No required documents marked verified.</p> : <ul>
                      {received.map(type => <li key={type}><Check className="overview-check" size={18} aria-hidden="true"/>{type}</li>)}
                    </ul>}
                  </div>
                  <div>
                    <h3>Missing or Pending</h3>
                    {outstanding.length === 0 ? <p className="overview-confirmation"><Check className="overview-check" size={18} aria-hidden="true"/>{required.length ? 'All required documents received' : 'No documents required'}</p> : <ul>
                      {outstanding.map(item => <li key={item}><TriangleAlert className="overview-warning" size={17} aria-hidden="true"/>{item}</li>)}
                    </ul>}
                  </div>
                </div>
                <p className="overview-disclaimer">Verification statuses are illustrative. PDF extraction does not verify authenticity.</p>
              </section>
              <section className="panel recommended-action" aria-labelledby="recommended-heading">
                <div><h2 id="recommended-heading">Recommended Next Action</h2><p>{nextAction.detail}</p></div>
                {actionButton()}
              </section>
            </>}
            {intakeTab === 'document-processing' && <><div className="main-grid">{documents()}{checklist()}</div>{finances()}</>}
            {intakeTab === 'affordability' && <>{metrics()}{proposal()}<section className="panel rerun-panel">
              <div className="panel-head"><div><h2>Rerun assessment</h2><p>Apply the current financial values and assumptions to the same assessment rules.</p></div>
                <button className="secondary" onClick={rerunAssessment} disabled={pending}>Rerun assessment</button>
              </div>
              {rerunNotice && <p className="rerun-notice" role="status">{rerunNotice}</p>}
            </section></>}
            {intakeTab === 'credit-proposal' && <>{proposal()}{checklist()}</>}
          </div>
        }
        {view === 'human-review' && <div id="human-review">{humanReview()}</div>}
        {!overview && <div className="bottom"><span><ShieldCheck size={16}/> Demo only. Verification statuses are illustrative. PDF text extraction does not authenticate documents.</span></div>}
      </div>
    </main>
    {modal && <dialog
      ref={dialog => { if (dialog && !dialog.open) dialog.showModal(); }}
      aria-labelledby="dialog-title"
      className={'modal' + (modal === 'email' ? ' compose' : '')}
      onCancel={event => {event.preventDefault(); setModal(null);}}
      onClick={event => {if (event.target === event.currentTarget) setModal(null);}}
    >
        <div className="modal-heading"><h2 id="dialog-title">{{upload:'Upload sample PDFs',checklist:'Configure checklist',settings:'Line of credit assumptions',email:'New message',samples:'Fictional sample PDFs',help:'About this demo'}[modal]}</h2><button autoFocus className="icon-button framed" aria-label={modal === 'email' ? 'Close message' : 'Close dialog'} onClick={() => setModal(null)}><X size={19}/></button></div>
        {modal === 'upload' && <div className="modal-body"><p>Choose a document type, then select fictional PDFs. Files are processed in this browser. Maximum 10 MB and 50 pages per PDF.</p><label>Document type<select value={selectedType} onChange={e => setSelectedType(e.target.value as DocType)}>{types.map(type => <option key={type}>{type}</option>)}</select></label><label className="upload-zone"><Upload size={22}/> Select PDFs<input type="file" multiple accept="application/pdf,.pdf" onChange={e => void upload(e.target.files)}/></label></div>}
        {modal === 'checklist' && <div className="modal-body"><p>Select the document types this application requires.</p>{types.map(type => <label className="checkbox" key={type}><input type="checkbox" checked={required.includes(type)} onChange={e => {setRequired(e.target.checked ? types.filter(t => required.includes(t) || t === type) : required.filter(item => item !== type)); resetReview();}}/>{type}</label>)}</div>}
        {modal === 'settings' && <form className="modal-body" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setAssumptions({rate:Number(form.get('rate')), balanceFactor:Number(form.get('balanceFactor')), dti:Number(form.get('dti')), ltv:Number(form.get('ltv'))});
          setRequest(Number(form.get('request')));
          resetReview(); setModal(null);
        }}><p>The model divides monthly DTI headroom by the greater of the monthly interest rate or the qualifying payment floor, assuming the full line is drawn.</p><label>Requested credit limit (USD)<input type="number" name="request" min="0" max="1000000000" step="1" required defaultValue={request}/></label>{assumptionFields.map(field => <label key={field.id}>{field.label}<input type="number" name={field.id} min={field.min} max={field.max} step={field.step} required defaultValue={assumptions[field.id]}/></label>)}<button className="primary" type="submit">Apply assumptions</button></form>}
        {modal === 'email' && <form className="compose-form" onSubmit={event => {
          event.preventDefault();
          setSent(true);
        }}>
          <div className="compose-toolbar">
            <button className="primary compose-send" type="submit" disabled={sent}><Send size={16}/> Send</button>
            <button className="secondary" type="button" onClick={() => setModal(null)}>Close</button>
            <small>Demo email · simulated send only</small>
          </div>
          <label className="compose-field"><span>To</span><input type="email" required value={recipient} readOnly={sent} onChange={event => setRecipient(event.target.value)}/></label>
          <label className="compose-field"><span>Subject</span><input required value={subject} readOnly={sent} onChange={event => setSubject(event.target.value)}/></label>
          <textarea rows={12} value={draft} readOnly={sent} required onChange={event => setDraft(event.target.value)} aria-label="Message body"/>
          <div className="compose-status" role="status">{sent && <><Check size={17}/> Simulated send complete. No email was sent.</>}</div>
        </form>}
        {modal === 'samples' && <div className="modal-body"><p>Process a fictional PDF in this browser or download it to test the upload flow.</p>{types.map((type, i) => <div className="sample-row" key={type}><span><FileText size={17}/>{type}</span><button className="secondary" onClick={() => void processSample(type)} disabled={message.startsWith('Loading')}>Process PDF</button><a className="icon-button framed" href={'/samples/' + Math.max(0,index) + '-' + samples[i] + '.pdf'} download aria-label={'Download ' + type}><Download size={16}/></a></div>)}<span aria-live="polite">{message}</span></div>}
        {modal === 'help' && <div className="modal-body"><p>This portfolio demo models document intake, financial analysis, and human review with fictional applicants.</p><p><Sparkles size={17}/> PDF.js reads selectable text. Rules match supported labels and surface source filenames. Extraction has no calibrated confidence score.</p><p><ClipboardCheck size={17}/> Decisions and simulated email sends remain in this browser session. Refresh to reset the demo.</p><p><ListChecks size={17}/> Verification statuses are illustrative. Successful PDF extraction reads labeled text and does not establish document authenticity.</p></div>}
      </dialog>}
  </div>;
}
