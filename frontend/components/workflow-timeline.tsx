import { workflowSteps } from "@/lib/dummy-data";

export function WorkflowTimeline() {
  return (
    <section className="panel timeline-panel" aria-labelledby="workflow-title">
      <div className="panel-heading">
        <p className="eyebrow">Sequential workflow</p>
        <h2 id="workflow-title">Agent pipeline</h2>
      </div>
      <ol className="workflow-timeline">
        {workflowSteps.map((step, index) => (
          <li key={step} className={index === workflowSteps.length - 1 ? "current-step" : "done-step"}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
