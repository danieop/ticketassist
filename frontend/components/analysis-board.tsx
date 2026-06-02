import type { WorkflowState } from "@/types/workflow";

export function AnalysisBoard({ workflow }: { workflow: WorkflowState }) {
  return (
    <section className="analysis-grid" aria-label="Workflow analysis">
      <article className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Analysis</p>
          <h2>Signal extracted</h2>
        </div>
        <p className="muted-text">{workflow.analysis?.summary}</p>
        <ul className="clean-list">
          {workflow.analysis?.symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}
        </ul>
      </article>

      <article className="panel priority-panel">
        <div className="panel-heading">
          <p className="eyebrow">Priority</p>
          <h2>{workflow.priority?.level}</h2>
        </div>
        <p>{workflow.priority?.reason}</p>
        <strong>{workflow.priority?.impact}</strong>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Repo search</p>
          <h2>Focused context</h2>
        </div>
        <p className="query-line">{workflow.repoSearch?.query}</p>
        <ul className="file-list">
          {workflow.repoSearch?.files.map((file) => <li key={file}>{file}</li>)}
        </ul>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Code context</p>
          <h2>Likely touchpoints</h2>
        </div>
        <div className="context-list">
          {workflow.codeContext?.map((item) => (
            <div key={item.file}>
              <strong>{item.file}</strong>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
