import { WorkflowDetailConsole } from "@/components/developer-workflow-console";
import { RoleDashboard } from "@/components/role-dashboard";

export default async function DeveloperWorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RoleDashboard role="developer">
      <WorkflowDetailConsole workflowId={id} />
    </RoleDashboard>
  );
}
