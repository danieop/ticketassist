import { RoleDashboard } from "@/components/role-dashboard";
import { TicketManagement } from "@/components/ticket-management";

export default function DeveloperPage() {
  return (
    <RoleDashboard role="developer">
      <TicketManagement />
    </RoleDashboard>
  );
}
