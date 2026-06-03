import { AdminUserManagement } from "@/components/admin-user-management";
import { RoleDashboard } from "@/components/role-dashboard";

export default function AdminPage() {
  return (
    <RoleDashboard role="admin">
      <AdminUserManagement />
    </RoleDashboard>
  );
}
