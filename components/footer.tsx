import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand/config";
import { formatPhoneDisplay } from "@/lib/utils/phone";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex flex-col gap-3 mb-4 group">
              <div className="relative h-12 w-[200px] sm:h-14 sm:w-[240px]">
                <Image
                  src={brand.logo.src}
                  alt={brand.name}
                  width={brand.logo.width}
                  height={brand.logo.height}
                  className="h-full w-auto object-contain object-left opacity-95 group-hover:opacity-100 transition-opacity"
                  sizes="240px"
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary">{brand.slogan}</p>
            </Link>
            <p className="text-muted-foreground max-w-sm mb-4 text-sm leading-relaxed">
              {brand.tagline} Serving cities across India as vendors list verified vehicles.
            </p>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">{brand.contact.address.full}</p>
          </div>
          <div>
            <h4 className="font-bold mb-4 font-display text-xs uppercase tracking-[0.25em] text-zinc-300">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/cars" className="hover:text-primary transition-colors">
                  Browse Fleet
                </Link>
              </li>
              <li>
                <Link href="/cars" className="hover:text-primary transition-colors">
                  Cities & Cars
                </Link>
              </li>
              <li>
                <Link href="/list-your-car" className="hover:text-primary transition-colors">
                  List your vehicle
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Member Login
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 font-display text-xs uppercase tracking-[0.25em] text-zinc-300">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href={`mailto:${brand.contact.email}`} className="hover:text-primary transition-colors">
                  {brand.contact.email}
                </a>
              </li>
              {brand.contact.phones.map((phone) => (
                <li key={phone}>
                  <a
                    href={`tel:+${phone.replace(/\D/g, "")}`}
                    className="hover:text-primary transition-colors"
                  >
                    {formatPhoneDisplay(phone)}
                  </a>
                </li>
              ))}
              <li>{brand.contact.supportNote}</li>
              <li className="pt-2 text-zinc-500">{brand.legalName}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-zinc-600">
          <span>&copy; {new Date().getFullYear()} {brand.legalName}. All rights reserved.</span>
          <span>Made in India</span>
        </div>
      </div>
    </footer>
  );
}
