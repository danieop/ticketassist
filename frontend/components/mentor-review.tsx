import type { WorkflowState } from "@/types/workflow";

export function MentorReview({ workflow }: { workflow: WorkflowState }) {
  return (
    <section className="panel review-panel" aria-labelledby="review-title">
      <div className="panel-heading row-heading">
        <div>
          <p className="eyebrow">Human review</p>
          <h2 id="review-title">Mentor decision</h2>
        </div>
        <button className="primary-action" type="button">Approve draft</button>
      </div>

      <div className="draft-box">
        <h3>{workflow.fixProposal?.title}</h3>
        <p>{workflow.mentorDraft?.response}</p>
      </div>

      <div className="review-grid">
        <div>
          <h3>Proposed steps</h3>
          <ul className="clean-list">
            {workflow.fixProposal?.steps.map((step) => <li key={step}>{step}</li>)}
          </ul>
        </div>
        <div>
          <h3>Review checklist</h3>
          <ul className="clean-list">
            {workflow.mentorDraft?.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
