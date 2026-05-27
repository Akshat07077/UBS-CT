"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand/config";
import { Car, ListOrdered, ArrowLeft, LogOut, LayoutDashboard, Users } from "lucide-react";
import React, { useEffect } from "react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/cars", label: "Manage Fleet", icon: Car },
  { href: "/admin/bookings", label: "Bookings", icon: ListOrdered },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex w-full bg-black text-foreground">
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 fixed h-full z-10 flex flex-col">
        <div className="min-h-[5rem] flex items-center px-4 border-b border-zinc-800 py-3">
          <Link href="/" className="flex flex-col gap-1 group w-full">
            <div className="relative h-9 w-full max-w-[180px]">
              <Image
                src={brand.logo.src}
                alt={brand.name}
                width={brand.logo.width}
                height={brand.logo.height}
                className="h-full w-auto object-contain object-left"
                sizes="180px"
              />
            </div>
            <span className="text-primary text-[10px] uppercase font-bold tracking-[0.2em]">Operations CRM</span>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-sm ${
                    active
                      ? "bg-zinc-900 text-primary font-semibold border border-zinc-800"
                      : "hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <div className="px-4 py-2 mb-1">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4" /> Back to Site
          </Button>
          <Button variant="destructive" className="w-full justify-start gap-2 text-sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 bg-black min-h-screen">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
