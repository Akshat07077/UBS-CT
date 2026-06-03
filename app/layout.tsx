import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "UBs Car Rental | Drive the Difference",
  description:
    "Premium car rental in Indore. Browse our fleet, book online or WhatsApp. Scheme 134, Nipania. rindorecar@gmail.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
