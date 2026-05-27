"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import { brand } from "@/lib/brand/config";
import { getWhatsAppNumber } from "@/lib/whatsapp";
import { SERVICE_CITY } from "@/lib/constants/locations";
import { formatPhoneDisplay } from "@/lib/utils/phone";

const { contact } = brand;
const phoneDisplayPrimary = formatPhoneDisplay(contact.phones[0]);
const phoneDisplaySecondary = formatPhoneDisplay(contact.phones[1]);
const helplineDisplay = `${phoneDisplayPrimary} · ${phoneDisplaySecondary}`;

const WA_HELP_URL = `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(
  `Hi ${brand.name}, I need help with a booking`
)}`;

const OFFICES = [
  {
    city: SERVICE_CITY,
    emoji: "🌾",
    address: contact.address.full,
    phones: contact.phones.map(formatPhoneDisplay),
    hours: contact.hours,
  },
];

const FAQS = [
  { q: "What documents do I need to rent a car?", a: "A valid driving licence, Aadhaar card or passport, and a selfie for verification. That's it." },
  { q: "Is there a security deposit?", a: "No security deposit for verified members. First-time renters may need a refundable ₹2,000 hold." },
  { q: "Can I cancel my booking?", a: "Yes — free cancellation up to 24 hours before pickup. After that, a 10% fee applies." },
  { q: "Do you offer doorstep delivery?", a: `Yes — we deliver across ${SERVICE_CITY} to your home, hotel, office, airport, or railway station.` },
  { q: "Is fuel included in the price?", a: "No, fuel is not included. The car is delivered with a full tank and should be returned full." },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

      {/* Header */}
      <div className="text-center mb-14">
        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-semibold mb-4 border border-primary/20">
          <MessageSquare className="w-4 h-4 mr-2" /> We&apos;re here to help
        </span>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-4">Contact Us</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Questions about a booking, need help choosing a car, or just want to say hi — reach out anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">

        {/* Contact form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-2">Message Sent!</h3>
              <p className="text-muted-foreground">We&apos;ll get back to you within 2 hours during business hours.</p>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={() => setSubmitted(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-2xl font-display font-bold mb-6">Send us a message</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input required placeholder="Rahul Sharma" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input required placeholder={phoneDisplayPrimary} className="rounded-xl h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input required type="email" placeholder={contact.email} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <select className="flex h-11 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>Booking enquiry</option>
                  <option>Cancellation / refund</option>
                  <option>Vehicle availability</option>
                  <option>Chauffeur service</option>
                  <option>Corporate rental</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea required placeholder="Tell us how we can help..." rows={5} className="rounded-xl resize-none" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold shadow-lg shadow-primary/20">
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-4">
          {[
            { icon: Phone, label: "24/7 Helpline", value: helplineDisplay, sub: contact.supportNote },
            { icon: Mail, label: "Email Us", value: contact.email, sub: "Reply within 2 hours" },
            { icon: MapPin, label: "Office", value: contact.address.full, sub: `${SERVICE_CITY}, Madhya Pradesh` },
            { icon: Clock, label: "Business Hours", value: contact.hours, sub: "Emergency line 24/7" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <p className="font-bold mt-0.5 text-sm leading-snug">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </div>
          ))}

          {/* WhatsApp CTA */}
          <a
            href={WA_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl p-5 transition-colors"
          >
            <svg className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <div>
              <p className="font-bold text-sm">Chat on WhatsApp</p>
              <p className="text-xs text-green-100">Fastest response · Usually &lt;5 min</p>
            </div>
          </a>
        </div>
      </div>

      {/* City offices */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-bold tracking-tight mb-6">Our Office</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OFFICES.map((office) => (
            <div key={office.city} className="bg-card border border-border rounded-2xl p-6 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{office.emoji}</span>
                <h3 className="font-display font-bold text-lg">{office.city}</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>{office.address}</span>
                </div>
                {office.phones.map((phone) => (
                  <div key={phone} className="flex gap-2">
                    <Phone className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                      {phone}
                    </a>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Mail className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                    {contact.email}
                  </a>
                </div>
                <div className="flex gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>{office.hours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="bg-card border border-border rounded-2xl p-6">
              <p className="font-semibold mb-2">{q}</p>
              <p className="text-muted-foreground text-sm">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
