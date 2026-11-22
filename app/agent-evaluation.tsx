'use client';

import { useEffect, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  createEvaluation, evaluationsForApplicant, improvementAreas, readEvaluations, saveEvaluation,
  type AssessmentSnapshot, type EvaluationRecord, type ImprovementArea,
} from '../lib/evaluation';

export function AgentEvaluation({ applicantId, assessment, evaluating }: {
  applicantId: string;
  assessment: AssessmentSnapshot;
  evaluating: boolean;
}) {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [negative, setNegative] = useState(false);
  const [comments, setComments] = useState('');
  const [area, setArea] = useState<ImprovementArea>('General assessment');
  const [notice, setNotice] = useState('');
  const history = evaluationsForApplicant(records, applicantId);

  useEffect(() => {
    function refresh() {
      try {
        setRecords(readEvaluations(window.localStorage));
      } catch {
        setNotice('Local feedback history is unavailable in this browser.');
      }
    }
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  function submit(rating: EvaluationRecord['rating']) {
    if (rating === 'negative' && !comments.trim()) {
      setNotice('Enter a comment before submitting feedback.');
      return;
    }
    try {
      const record = createEvaluation({
        id: crypto.randomUUID(), applicantId, rating, timestamp: new Date().toISOString(),
        comments, improvementArea: area, assessment,
      });
      setRecords(saveEvaluation(window.localStorage, record));
      setNotice('Evaluation saved in this browser.');
      setComments('');
      setNegative(false);
      setArea('General assessment');
    } catch {
      setNotice('Feedback could not be saved in this browser.');
    }
  }

  return <section className="panel evaluation" aria-labelledby="evaluation-heading">
    <div className="panel-head"><div><h2 id="evaluation-heading">Agent Evaluation</h2>
      <p>Local demo · Feedback stays in this browser profile. Use fictional data only.</p>
    </div></div>
    <div className="evaluation-body">
      <h3>Was the agent&apos;s assessment accurate and useful?</h3>
      <div className="evaluation-actions">
        <button className="secondary" disabled={evaluating} onClick={() => submit('positive')}><ThumbsUp size={16}/> Accept assessment</button>
        <button className="secondary" disabled={evaluating} aria-expanded={negative} onClick={() => {setNegative(!negative); setNotice('');}}><ThumbsDown size={16}/> Needs improvement</button>
      </div>
      {evaluating && <p>Wait for PDF processing to finish before evaluating this assessment.</p>}
      {negative && <form className="feedback-form" onSubmit={event => {event.preventDefault(); submit('negative');}}>
        <label>What should the agent improve?
          <textarea rows={4} required maxLength={4000} value={comments} onChange={event => setComments(event.target.value)}/>
        </label>
        <label>Potential improvement area
          <select value={area} onChange={event => setArea(event.target.value as ImprovementArea)}>
            {improvementAreas.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button className="primary" disabled={evaluating}>Submit Feedback</button>
      </form>}
      {notice && <p className="evaluation-notice" role="status">{notice}</p>}
      <details>
        <summary>Feedback history ({history.length})</summary>
        {history.length === 0 ? <p>No evaluations for this applicant in this browser.</p> :
          <ul className="feedback-history">{history.map(record => <li key={record.id}>
            <div><strong>{record.rating === 'positive' ? 'Accepted assessment' : record.improvementArea}</strong> <span className="pill neutral">{record.status}</span></div>
            <small>{new Date(record.timestamp).toLocaleString()} · {record.assessmentVersion}</small>
            {record.comments && <p>{record.comments}</p>}
          </li>)}</ul>}
      </details>
      <details>
        <summary>Human Feedback → Evaluation → Improvement</summary>
        <p>Reviewer feedback is saved with a snapshot of the assessment. Improvement suggestions remain pending review. Reviewed findings could inform future prompt changes, business-rule updates, or model fine-tuning.</p>
        <p>Edit financial values in Document Processing or assumptions in Affordability, then rerun the assessment with the corrected inputs. Feedback does not train a model, change credit policy, or record an underwriting decision.</p>
      </details>
    </div>
  </section>;
}
