import { AdminInboxPanel } from "@/components/admin/inbox-panel";

/** All form submissions — contact, list-your-car, bookings. */
export default function AdminLeadsPage() {
  return (
    <AdminInboxPanel
      defaultTab="all"
      title="Contact & Forms"
      subtitle="Contact page messages, list-your-car requests, and booking enquiries in one place."
    />
  );
}
