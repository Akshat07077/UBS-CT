import { AdminInboxPanel } from "@/components/admin/inbox-panel";

export default function AdminContactPage() {
  return (
    <AdminInboxPanel
      defaultTab="contact"
      title="Contact inbox"
      subtitle="Every message sent from the Contact Us page on your website."
    />
  );
}
