import { DeveloperWorkflowConsole } from "@/components/developer-workflow-console";
import { RoleDashboard } from "@/components/role-dashboard";

export default function DeveloperPage() {
  return (
    <RoleDashboard role="developer">
      <DeveloperWorkflowConsole />
    </RoleDashboard>
  );
}
