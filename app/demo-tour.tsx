'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type TourStep = 0 | 1 | 2 | 3 | 4;

const tips = {
  1: { title: 'Agent Summary', text: 'This is your starting point. The agent summarizes what it found and highlights what needs your attention next.' },
  2: { title: 'Applicant Selection', text: 'Try two scenarios: John Smith has missing documents, while Jane Doe is ready for human review.' },
  3: { title: 'John Smith — Missing Documents', text: 'The agent identified missing information. Click here to open a prefilled client email requesting the outstanding documents.' },
  4: { title: 'Jane Doe — Human Review', text: 'Jane’s documents are complete. Open Human Review to verify the agent’s findings and approve the proposed loan.' },
};

export const tourSessionKey = 'loanflow.demo-tour';

export function DemoTour({ step, targetId, reviewing, readyForReview, onNavigate, onExit }: {
  step: TourStep;
  targetId: string;
  reviewing: boolean;
  readyForReview: boolean;
  onNavigate: (step: TourStep) => void;
  onExit: (outcome: 'completed' | 'skipped') => void;
}) {
  const popover = useRef<HTMLElement>(null);
  const exit = useRef(onExit);
  useEffect(() => { exit.current = onExit; }, [onExit]);

  useEffect(() => {
    const panel = popover.current;
    const target = document.getElementById(targetId);
    if (!panel || !target) return;

    const margin = 12;
    function position() {
      if (!panel || !target) return;
      const anchor = target.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const {offsetWidth: panelWidth, offsetHeight: panelHeight} = panel;
      const canFitBeside = anchor.right + margin + panelWidth <= width - margin;
      const canFitBelow = anchor.bottom + margin + panelHeight <= height - margin;
      let left = anchor.left;
      let top = anchor.bottom + margin;
      if (canFitBeside) {
        left = anchor.right + margin;
        top = anchor.top;
      } else if (!canFitBelow && anchor.top - margin - panelHeight >= margin) {
        top = anchor.top - margin - panelHeight;
      } else if (!canFitBelow) {
        // Keep the target clickable when it shares a short viewport with the tip.
        top = anchor.top > height - anchor.bottom ? margin : height - panelHeight - margin;
      }
      panel.style.left = Math.max(margin, Math.min(left, width - panelWidth - margin)) + 'px';
      panel.style.top = Math.max(margin, Math.min(top, height - panelHeight - margin)) + 'px';
    }

    target.scrollIntoView({block:'nearest'});
    position();
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    observer.observe(target);
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') exit.current('skipped');
    }
    window.addEventListener('keydown', dismiss);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.removeEventListener('keydown', dismiss);
    };
  }, [step, targetId]);

  const tip = step === 0 ? null : tips[step];
  let description = tip?.text ?? 'See how the agent guides you through two sample applications in four short steps.';
  if (step === 3 && targetId !== 'guided-action') {
    description = 'The agent updates its recommendation as you work. When documents are missing, Request Missing Documents opens a prefilled email.';
  } else if (step === 4 && reviewing) {
    description = targetId === 'approve-loan'
      ? 'Review the proposed limit and use Approve Loan to record an illustrative decision. You can also give the agent separate feedback under Agent Evaluation. Approval is optional.'
      : 'Check the current decision and any outstanding requirements. You can give the agent separate feedback under Agent Evaluation.';
  } else if (step === 4 && !readyForReview) {
    description = 'Open Human Review to see the agent’s findings and what needs to happen before approval is available.';
  }
  return createPortal(
    <aside ref={popover} className="demo-tour" aria-labelledby="demo-tour-title">
      <div className="demo-tour-heading">
        <strong id="demo-tour-title">{tip?.title ?? 'Take a quick tour?'}</strong>
        {step > 0 && <span>Step {step} of 4</span>}
      </div>
      <p aria-live="polite">{description}</p>
      <div className="demo-tour-controls">
        {step > 1 && <button className="text-button" onClick={() => onNavigate((step - 1) as TourStep)}>Back</button>}
        <button className="text-button" onClick={() => onExit('skipped')}>Skip Tour</button>
        {step === 4
          ? <button className="primary" onClick={() => onExit('completed')}>Finish</button>
          : <button className="primary" onClick={() => onNavigate((step + 1) as TourStep)}>{step === 0 ? 'Start Tour' : 'Next'}</button>}
      </div>
    </aside>,
    document.body,
  );
}
