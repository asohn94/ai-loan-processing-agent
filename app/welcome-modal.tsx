'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';

const sessionKey = 'loanflow.welcome-shown';

export function WelcomeModal() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open) return;

    try {
      if (window.sessionStorage.getItem(sessionKey) === '1') return;
    } catch {
      // Visitors can still explore when browser storage is unavailable.
    }

    element.showModal();
    try {
      window.sessionStorage.setItem(sessionKey, '1');
    } catch {
      // The dialog remains dismissible without storage.
    }
  }, []);

  return (
    <dialog ref={dialog} className="modal welcome-modal" aria-labelledby="welcome-title">
      <div className="welcome-heading">
        <h2 id="welcome-title">Welcome to the Agentic Loan Origination Demo!</h2>
        <button type="button" className="icon-button framed" aria-label="Close welcome message" onClick={() => dialog.current?.close()}><X size={18}/></button>
      </div>
      <div className="welcome-body">
        <p>This interactive prototype demonstrates how AI agents can streamline the loan origination process by automating document review, financial assessment, and loan proposal generation.</p>
        <p>Inspired by a real-world financial services use case, I built this prototype using OpenAI Codex to demonstrate how manual workflows can be transformed through intelligent automation, with human-in-the-loop evaluation and feedback-driven improvement.</p>
        <p>Explore two fictional client scenarios to see how the workflow handles missing documentation, prepares credit proposals, and incorporates human oversight.</p>
        <p className="welcome-disclaimer"><strong>Disclaimer</strong> This demo uses fictional client data and illustrative credit assessments. Document processing, evaluation, and feedback capabilities are demonstrated at prototype level, not as a production lending system.</p>
        <form method="dialog">
          <button className="primary" autoFocus>Start Exploring <ArrowRight size={17} aria-hidden="true"/></button>
        </form>
      </div>
    </dialog>
  );
}
