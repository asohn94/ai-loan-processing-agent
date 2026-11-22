'use client';

import { useRef, useState } from 'react';
import { Activity, BadgeCheck, Banknote, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Send, Download, FileCheck2, FileText, Gauge, LayoutGrid, ListChecks, Mail, Plus, Settings2, ShieldCheck, Sparkles, TriangleAlert, Upload, X } from 'lucide-react';
import { applicants, assess, defaults, documentRequest, documentStatus, fields, product, requestSubject, resolveFields, sampleDocs, samples, types, type DocType, type DocumentRecord, type Field, type Values } from '../lib/loan';
import { extractPdf } from '../lib/pdf';

const steps = [
  {title:'Client intake', short:'Intake', icon: BriefcaseBusiness},
  {title:'Document processing', short:'Documents', icon: FileCheck2},
  {title:'Affordability', short:'Assessment', icon: Gauge},
  {title:'Credit proposal', short:'Proposal', icon: Banknote},
  {title:'Human review', short:'Review', icon: ShieldCheck},
];
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
  const [step, setStep] = useState(0);
  const [docs, setDocs] = useState(() => sampleDocs(0));
  const [required, setRequired] = useState<DocType[]>([...types]);
  const [selectedType, setSelectedType] = useState<DocType>('Pay stub');
  const [manual, setManual] = useState<Values>({});
  const [assumptions, setAssumptions] = useState(defaults);
  const [request, setRequest] = useState(applicants[0].request);
  const [status, setStatus] = useState('Pending review');
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
  const done = required.length - missing.length - unverified.length;
  const result = assess(values, request, assumptions);
  const pending = docs.some(doc => doc.extraction === 'processing');
  const outstanding = [
    ...missing.map(type => type + ' — Missing'),
    ...unverified.map(type => type + ' — Pending Verification'),
    ...(pending ? ['PDF processing is in progress.'] : []),
    ...(result.limit === null ? ['Complete gross income, monthly liabilities, and collateral value.'] : []),
    ...(result.limit === 0 ? ['The current inputs support no positive credit limit.'] : []),
  ];
  const proposalReady = outstanding.length === 0;
  const approved = status === 'Approved in demo';
  const decisionRecorded = status !== 'Pending review';
  const reviewStatus = decisionRecorded ? status : proposalReady ? 'Ready for human review' : 'Pending review';
  const underwritingAction = 'Human underwriter to verify the findings and approve or reject the proposal.';
  const nextAction = pending ? 'Wait for PDF processing to finish.'
    : missing.length ? 'Request outstanding documents before final underwriting.'
    : unverified.length ? 'Review documents pending verification.'
    : result.limit === null ? 'Complete the financial information needed for the credit assessment.'
    : result.limit === 0 ? 'Review the credit request and assessment inputs.'
    : decisionRecorded ? 'Review the recorded demo decision.'
    : underwritingAction;
  const documentActivity = done === required.length && required.length > 0
    ? 'All required documents are on file'
    : docs.length ? 'Document intake reviewed' : 'Document intake started';
  const assessmentActivity = result.limit === null ? 'assessment awaiting financial inputs'
    : result.limit === 0 ? 'assessment found no positive credit limit'
    : proposalReady ? 'illustrative credit proposal prepared' : 'illustrative credit assessment prepared';
  const resetReview = () => setStatus('Pending review');
  function selectApplicant(next: number) {
    session.current++;
    setIndex(next); setDocs(next < 0 ? [] : sampleDocs(next)); setManual({}); resetReview();
    setRequest(applicants[next]?.request ?? 0);
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
  const nextStep = () => setStep(Math.min(4, step + 1));
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
      <div className="panel-foot"><button className="text-button" onClick={() => {setMessage(''); setModal('samples');}}><Download size={15}/> Sample PDFs</button>{step === 0 && <button className="secondary" onClick={nextStep}>Review extracted data</button>}</div>
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
      <button className="secondary email-button" onClick={openEmail} disabled={!missing.length}><Mail size={16}/> Request Missing Documents</button>
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
      <section className="panel">
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
        <p className="review-next"><strong>Next action:</strong> {nextAction}</p>
        <div className="panel-foot review-actions">
          <button className="secondary" onClick={openEmail} disabled={!missing.length}><Mail size={16}/> Request Missing Documents</button>
          <button className="secondary" onClick={() => setStatus('Rejected in demo')}>Reject proposal</button>
          <button className="primary" disabled={!proposalReady || approved} onClick={() => setStatus('Approved in demo')}><BadgeCheck size={17}/> Approve proposal</button>
        </div>
      </section>
    </div>;
  }
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Activity size={23}/></div><div><strong>LoanFlow</strong><small>AI PROCESSING AGENT</small></div></div>
      <nav aria-label="Workflow navigation"><div className="nav-label">WORKSPACE</div>
        {steps.map(({title,short,icon:Icon},i) => <button key={title} className={step === i ? 'selected' : ''} aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}><Icon size={19}/><span className="nav-full">{title}</span><span className="nav-short">{short}</span>{step === i && <span className="nav-indicator"/>}</button>)}
        <div className="nav-label tools-label">TOOLS</div>
        <button onClick={() => setModal('settings')}><Settings2 size={19}/><span>Assumptions</span></button>
        <button onClick={() => setModal('help')}><CircleHelp size={19}/><span>About the demo</span></button>
      </nav>
      <div className="sidebar-foot"><div className="demo-info"><ShieldCheck size={19}/><div><strong>Portfolio sandbox</strong><small>Fictional data only</small></div></div></div>
    </aside>
    <main>
      <header className="topbar"><div className="breadcrumbs"><LayoutGrid size={16}/> <span>Workspace</span><ChevronRight size={14}/><strong>{product}</strong></div><span className="demo-badge"><span/> Demo environment</span></header>
      <div className="workspace">
        <div className="intro"><div><h1>AI Loan Processing Agent</h1><p>An AI-powered agent that reviews loan documents, assesses credit eligibility, and prepares loan proposals for human approval.</p></div><button className="secondary" onClick={() => {selectApplicant(-1); setStep(0);}}><Plus size={17}/> New application</button></div>
        <section className="hero" aria-label="Active application">
          <div className="hero-content">
            <div className="hero-kicker"><span/> ACTIVE APPLICATION</div>
            <div className="hero-profile"><div className="avatar">{applicant?.initials ?? 'NA'}</div><div><h2>{applicant?.name ?? 'New application'}</h2><p>{applicant?.id ?? 'Custom demo'} <span>·</span> {product}</p>{applicant && <p>{applicant.email}</p>}</div></div>
          </div>
          <div className="hero-side"><label htmlFor="applicant">Fictional applicant</label><div className="select-shell"><select id="applicant" value={index < 0 ? '' : index} ref={select => { if (select && index < 0) select.selectedIndex = -1; }} onChange={event => selectApplicant(Number(event.target.value))}>{applicants.map((item,i) => <option key={item.id} value={i}>{item.name}</option>)}</select><ChevronDown size={16}/></div></div>
        </section>

        <section className="agent-activity" aria-labelledby="activity-heading">
          <Activity size={18} aria-hidden="true"/>
          <div>
            <h2 id="activity-heading">Agent Activity Summary</h2>
            <p>{documentActivity}{missing.length > 0 ? ` · ${missing.length} missing` : ''} · {assessmentActivity}. <strong>Next:</strong> {nextAction}</p>
          </div>
        </section>

        {step === 0 && <div className="main-grid">{documents()}{checklist()}</div>}
        {step === 1 && <div className="stack">{finances()}<div className="main-grid">{documents()}{checklist()}</div></div>}
        {step === 2 && <div className="stack">{metrics()}{proposal()}</div>}
        {step === 3 && <div className="stack">{proposal()}{checklist()}</div>}
        {step === 4 && humanReview()}
        <div className="bottom"><span><ShieldCheck size={16}/> Demo only. Verification statuses are illustrative. PDF text extraction does not authenticate documents.</span>{step > 0 && step < 4 && <button className="primary" onClick={nextStep}>Continue to {steps[step+1].short.toLowerCase()}</button>}</div>
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
