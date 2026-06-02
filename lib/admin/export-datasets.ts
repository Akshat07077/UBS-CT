export type ExportDataset =
  | "bookings"
  | "cars"
  | "users"
  | "leads"
  | "contact"
  | "payments";

export const EXPORT_DATASETS: {
  id: ExportDataset;
  label: string;
  description: string;
  filename: string;
}[] = [
  {
    id: "bookings",
    label: "Bookings",
    description: "All reservations with guest details, dates, amounts, and collateral.",
    filename: "ubs-bookings",
  },
  {
    id: "cars",
    label: "Fleet / vehicles",
    description: "Every car in the system with pricing, location, and availability.",
    filename: "ubs-fleet",
  },
  {
    id: "users",
    label: "Registered users",
    description: "Customer and admin accounts (no passwords).",
    filename: "ubs-users",
  },
  {
    id: "leads",
    label: "All form leads",
    description: "Contact, list-your-car, and booking enquiries.",
    filename: "ubs-leads",
  },
  {
    id: "contact",
    label: "Contact messages",
    description: "Messages from the contact form only.",
    filename: "ubs-contact",
  },
  {
    id: "payments",
    label: "Payments",
    description: "Stripe payment records linked to bookings.",
    filename: "ubs-payments",
  },
];
