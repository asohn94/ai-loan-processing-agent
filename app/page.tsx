'use client';

import { useRef, useState } from 'react';
import { Activity, BadgeCheck, Banknote, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Copy, Download, FileCheck2, FileText, Gauge, LayoutGrid, ListChecks, Mail, Plus, Settings2, ShieldCheck, Sparkles, TriangleAlert, Upload, X } from 'lucide-react';
import { applicants, assess, defaults, fields, resolveFields, sampleDocs, samples, types, type DocType, type DocumentRecord, type Field, type Values } from '../lib/loan';
import { extractPdf } from '../lib/pdf';

const steps = [
  {title:'Client intake', short:'Intake', description:'Applicant & documents', icon: BriefcaseBusiness},
  {title:'Document processing', short:'Documents', description:'Extract financial data', icon: FileCheck2},
  {title:'Affordability', short:'Assessment', description:'Evaluate loan capacity', icon: Gauge},
  {title:'Loan proposal', short:'Proposal', description:'Review estimated terms', icon: Banknote},
  {title:'Human review', short:'Review', description:'Record a demo decision', icon: ShieldCheck},
];
const money = (value: number | null | undefined, cents = false) => value == null ? '—' : new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:cents ? 2 : 0,minimumFractionDigits:cents ? 2 : 0}).format(value);
const percent = (n: number | null) => n == null ? '—' : n.toFixed(1) + '%';
const assumptionFields = [
  {id:'rate', label:'Annual interest rate (%)', min:0, max:50, step:0.01},
  {id:'years', label:'Term (years)', min:1, max:40, step:1},
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
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const session = useRef(0);
  const applicant = applicants[index];
  const {values, sources} = resolveFields(docs, manual, applicant?.values ?? {});
  const missing = required.filter(type => !docs.some(doc => doc.type === type && ['Extracted','Simulated'].includes(doc.status)));
  const done = required.length - missing.length;
  const result = assess(values, request, assumptions);
  const pending = docs.some(doc => doc.status === 'Processing');
  const proposalReady = !pending && result.amount !== null && result.amount > 0;
  const resetReview = () => setStatus('Pending review');
  function selectApplicant(next: number) {
    session.current++;
    setIndex(next); setDocs(next < 0 ? [] : sampleDocs(next)); setManual({}); resetReview();
    setRequest(applicants[next]?.request ?? 0);
    setMessage('');
  }
  async function upload(files: FileList | File[] | null, type = selectedType) {
    if (!files?.length) return;
    const current = session.current;
    const newDocs: DocumentRecord[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(), name: file.name, type, status:'Processing', values:{},
    }));
    setDocs(previous => [...previous, ...newDocs]);
    resetReview();
    setModal(null);
    await Promise.all(Array.from(files).map(async (file, i) => {
      const record = newDocs[i];
      let update: DocumentRecord;
      try {
        const extracted = await extractPdf(file);
        update = {...record, ...extracted, status:Object.keys(extracted.values).length ? 'Extracted' : 'Needs review'};
      } catch (error) {
        update = {...record, status:'Needs review', detail:error instanceof Error ? error.message : 'PDF could not be read'};
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
      if (session.current === current) await upload([file], type);
    } catch {
      if (session.current === current) setMessage('Could not load the sample PDF. Try downloading it instead.');
    }
  }
  function openEmail() {
    setDraft('Subject: Documents needed for your loan application\n\nHi ' + (applicant?.name.split(' ')[0] ?? 'there') + ',\n\nTo continue reviewing your application, please provide the following via your secure document portal:\n\n' + missing.map(type => '• ' + type).join('\n') + '\n\nThank you,\nLoan Operations');
    setMessage(''); setModal('email');
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
          <td><div className="file"><span className="file-icon"><FileText size={17}/></span><div><strong>{doc.name}</strong><small title={doc.detail}>{doc.detail ?? 'Fictional sample PDF'}</small></div></div></td>
          <td>{doc.type}</td><td><span className={'pill ' + (doc.status === 'Needs review' ? 'warn' : doc.status === 'Processing' ? 'neutral' : 'good')}>{doc.status}</span></td>
          <td><div className="row-actions">{doc.href && <a className="icon-button" href={doc.href} download aria-label={'Download ' + doc.name}><Download size={15}/></a>}<button className="icon-button" aria-label={'Remove ' + doc.name} onClick={() => {setDocs(docs.filter(item => item.id !== doc.id)); resetReview();}}><X size={15}/></button></div></td>
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
      <div className="check-items">{required.map(type => <div key={type}><span className={'check-icon ' + (missing.includes(type) ? 'warn' : 'good')}>{missing.includes(type) ? <TriangleAlert size={14}/> : <Check size={15}/>}</span><span>{type}</span><small className={missing.includes(type) ? 'warning-text' : ''}>{missing.includes(type) ? 'Missing' : 'Received'}</small></div>)}{!required.length && <p>No documents required.</p>}</div>
      <button className="secondary email-button" onClick={openEmail} disabled={!missing.length}><Mail size={16}/> Draft document request</button>
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
      ['Borrowing capacity', money(result.capacity), 'Principal supported by the DTI limit'],
      ['Collateral coverage', percent(result.coverage), 'Collateral value ÷ proposed principal'],
    ];
    return <div className="metrics">{items.map(([title,value,detail]) => <section className="panel metric" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></section>)}</div>;
  }
  function proposal() {
    return <section className="panel">
      <div className="panel-head"><div><h2>Illustrative loan proposal</h2><p>Principal is capped by the request, borrowing capacity, and collateral × maximum loan-to-value.</p></div><span className="pill neutral">Illustrative</span></div>
      <div className="financial-grid terms">
        {[['Requested amount', money(request)],['Proposed amount',money(result.amount)],['Interest assumption',assumptions.rate + '%'],['Loan term',assumptions.years + ' years'],['Monthly payment',money(result.payment,true)],['Projected total DTI',percent(result.projected)]].map(([label,value]) => <div className="financial" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="panel-foot"><p>{pending ? 'PDF processing is in progress.' : result.amount === null ? 'Enter income, monthly debt, and collateral to calculate terms.' : result.amount === 0 ? 'Current inputs support no positive proposal.' : 'Fixed-rate principal and interest. Fees, taxes, and insurance are excluded.'}</p><button className="secondary" onClick={() => setModal('settings')}><Settings2 size={16}/> Edit assumptions</button></div>
    </section>;
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
      <header className="topbar"><div className="breadcrumbs"><LayoutGrid size={16}/> <span>Workspace</span><ChevronRight size={14}/><strong>Loan processing</strong></div><span className="demo-badge"><span/> Demo environment</span></header>
      <div className="workspace">
        <div className="intro"><div><h1>AI Loan Processing Agent</h1><p>From document intake to human underwriting in one workspace.</p></div><button className="secondary" onClick={() => {selectApplicant(-1); setStep(0);}}><Plus size={17}/> New application</button></div>
        <section className="hero" aria-label="Active application">
          <div className="hero-content">
            <div className="hero-kicker"><span/> ACTIVE APPLICATION</div>
            <div className="hero-profile"><div className="avatar">{applicant?.initials ?? 'NA'}</div><div><h2>{applicant?.name ?? 'New application'}</h2><p>{applicant?.id ?? 'Custom demo'} <span>·</span> {applicant?.purpose ?? 'Sample PDF intake'}</p></div></div>
          </div>
          <div className="hero-side"><label htmlFor="applicant">Fictional applicant</label><div className="select-shell"><select id="applicant" value={index} onChange={event => selectApplicant(Number(event.target.value))}>{applicants.map((item,i) => <option key={item.id} value={i}>{item.name}</option>)}<option value={-1}>Custom PDF intake</option></select><ChevronDown size={16}/></div></div>
        </section>

        <section className="flow" aria-label="Application workflow">
          <div className="flow-heading"><h2>Application workflow</h2><span>Step {step + 1} of {steps.length}</span></div>
          <div className="flow-grid">{steps.map(({title,description,icon:Icon},i) => <button key={title} className={'flow-step ' + (step === i ? 'current' : '')} aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}><span className="step-icon"><Icon size={18}/></span><span><strong>{title}</strong><small>{description}</small></span></button>)}</div>
        </section>

        {step === 0 && <div className="main-grid">{documents()}{checklist()}</div>}
        {step === 1 && <div className="stack">{finances()}<div className="main-grid">{documents()}{checklist()}</div></div>}
        {step === 2 && <div className="stack">{metrics()}{proposal()}</div>}
        {step === 3 && <div className="stack">{proposal()}{checklist()}</div>}
        {step === 4 && <div className="stack">{proposal()}{finances()}<section className="panel"><div className="panel-head"><div><h2>Underwriter decision</h2><p>{missing.length ? 'Review outstanding requirements before recording a decision.' : 'Review proposal terms and financial inputs before recording a decision.'}</p></div><span className={'pill ' + (status === 'Approved in demo' ? 'good' : status === 'Rejected in demo' ? 'warn' : 'neutral')} role="status">{status}</span></div><div className="panel-foot"><button className="secondary" onClick={() => setStatus('Rejected in demo')}>Reject proposal</button><button className="primary" disabled={!proposalReady || missing.length > 0} onClick={() => setStatus('Approved in demo')}><BadgeCheck size={17}/> Approve proposal</button></div></section></div>}
        <div className="bottom"><span><ShieldCheck size={16}/> Fictional data and illustrative calculations only.</span>{step > 0 && step < 4 && <button className="primary" onClick={nextStep}>Continue to {steps[step+1].short.toLowerCase()}</button>}</div>
      </div>
    </main>
    {modal && <dialog
      ref={dialog => { if (dialog && !dialog.open) dialog.showModal(); }}
      aria-labelledby="dialog-title"
      className="modal"
      onCancel={event => {event.preventDefault(); setModal(null);}}
      onClick={event => {if (event.target === event.currentTarget) setModal(null);}}
    >
        <div className="modal-heading"><h2 id="dialog-title">{{upload:'Upload sample PDFs',checklist:'Configure checklist',settings:'Loan assumptions',email:'Document request draft',samples:'Fictional sample PDFs',help:'About this demo'}[modal]}</h2><button autoFocus className="icon-button framed" aria-label="Close dialog" onClick={() => setModal(null)}><X size={19}/></button></div>
        {modal === 'upload' && <div className="modal-body"><p>Choose a document type, then select fictional PDFs. Files are processed in this browser. Maximum 10 MB and 50 pages per PDF.</p><label>Document type<select value={selectedType} onChange={e => setSelectedType(e.target.value as DocType)}>{types.map(type => <option key={type}>{type}</option>)}</select></label><label className="upload-zone"><Upload size={22}/> Select PDFs<input type="file" multiple accept="application/pdf,.pdf" onChange={e => void upload(e.target.files)}/></label></div>}
        {modal === 'checklist' && <div className="modal-body"><p>Select the document types this application requires.</p>{types.map(type => <label className="checkbox" key={type}><input type="checkbox" checked={required.includes(type)} onChange={e => {setRequired(e.target.checked ? types.filter(t => required.includes(t) || t === type) : required.filter(item => item !== type)); resetReview();}}/>{type}</label>)}</div>}
        {modal === 'settings' && <form className="modal-body" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setAssumptions({rate:Number(form.get('rate')), years:Number(form.get('years')), dti:Number(form.get('dti')), ltv:Number(form.get('ltv'))});
          setRequest(Number(form.get('request')));
          resetReview(); setModal(null);
        }}><p>Payment capacity equals gross monthly income × maximum DTI minus existing monthly debt. The model converts that payment to principal using a fixed-rate amortization schedule.</p><label>Requested amount (USD)<input type="number" name="request" min="0" max="1000000000" step="1" required defaultValue={request}/></label>{assumptionFields.map(field => <label key={field.id}>{field.label}<input type="number" name={field.id} min={field.min} max={field.max} step={field.step} required defaultValue={assumptions[field.id]}/></label>)}<button className="primary" type="submit">Apply assumptions</button></form>}
        {modal === 'email' && <div className="modal-body"><p>Edit or copy this draft. The demo has no email delivery integration.</p><textarea rows={11} value={draft} onChange={e => setDraft(e.target.value)} aria-label="Draft email"/><button className="primary" onClick={async () => {try {await navigator.clipboard.writeText(draft); setMessage('Draft copied.');} catch {setMessage('Select and copy the text manually.');}}}><Copy size={16}/> Copy draft</button><span aria-live="polite">{message}</span></div>}
        {modal === 'samples' && <div className="modal-body"><p>Process a fictional PDF in this browser or download it to test the upload flow.</p>{types.map((type, i) => <div className="sample-row" key={type}><span><FileText size={17}/>{type}</span><button className="secondary" onClick={() => void processSample(type)} disabled={message.startsWith('Loading')}>Process PDF</button><a className="icon-button framed" href={'/samples/' + Math.max(0,index) + '-' + samples[i] + '.pdf'} download aria-label={'Download ' + type}><Download size={16}/></a></div>)}<span aria-live="polite">{message}</span></div>}
        {modal === 'help' && <div className="modal-body"><p>This portfolio demo models document intake, financial analysis, and human review with fictional applicants.</p><p><Sparkles size={17}/> PDF.js reads selectable text. Rules match supported labels and surface source filenames. Extraction has no calibrated confidence score.</p><p><ClipboardCheck size={17}/> Decisions and email drafts remain in this browser session. Refresh to reset the demo.</p><p><ListChecks size={17}/> All terms are illustrative. External banking data is simulated.</p></div>}
      </dialog>}
  </div>;
}
