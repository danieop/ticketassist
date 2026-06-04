import { MentorReviewQueue } from "@/components/mentor-review-queue";
import { RoleDashboard } from "@/components/role-dashboard";

export default function MentorPage() {
  return (
    <RoleDashboard role="mentor">
      <MentorReviewQueue />
    </RoleDashboard>
  );
}
