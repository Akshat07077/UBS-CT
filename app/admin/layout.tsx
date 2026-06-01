"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand/config";
import { cn } from "@/lib/utils";
import {
  Car,
  ListOrdered,
  ArrowLeft,
  LogOut,
  LayoutDashboard,
  Users,
  MessageSquare,
  Inbox,
  Menu,
  X,
  IndianRupee,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/cars", label: "Manage Fleet", icon: Car },
  { href: "/admin/bookings", label: "Bookings", icon: ListOrdered },
  { href: "/admin/contact", label: "Contact inbox", icon: MessageSquare },
  { href: "/admin/leads", label: "All forms", icon: Inbox },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Payments", icon: IndianRupee },
];

function currentPageLabel(pathname: string) {
  const item = NAV.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)));
  return item?.label ?? "Admin";
}

function SidebarPanel({
  pathname,
  user,
  onNavigate,
  onLogout,
  onBack,
  showClose,
  onClose,
}: {
  pathname: string;
  user: { name: string | null; email: string };
  onNavigate?: () => void;
  onLogout: () => void;
  onBack: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="min-h-[4.5rem] flex items-center justify-between gap-2 px-4 border-b border-zinc-800 py-3 shrink-0">
        <Link href="/" className="flex flex-col gap-1 min-w-0" onClick={onNavigate}>
          <div className="relative h-8 w-full max-w-[160px]">
            <Image
              src={brand.logo.src}
              alt={brand.name}
              width={brand.logo.width}
              height={brand.logo.height}
              className="h-full w-auto object-contain object-left"
              sizes="160px"
            />
          </div>
          <span className="text-primary text-[10px] uppercase font-bold tracking-[0.2em]">Operations CRM</span>
        </Link>
        {showClose && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-zinc-400 hover:text-zinc-100"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer text-sm",
                  active
                    ? "bg-zinc-900 text-primary font-semibold border border-zinc-800"
                    : "hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-transparent"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800 space-y-2 shrink-0">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2 text-sm h-10" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 shrink-0" /> Back to Site
        </Button>
        <Button variant="destructive" className="w-full justify-start gap-2 text-sm h-10" onClick={onLogout}>
          <LogOut className="w-4 h-4 shrink-0" /> Log out
        </Button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/");
  };

  const closeMenu = () => setMenuOpen(false);
  const pageTitle = currentPageLabel(pathname);

  return (
    <div className="min-h-screen w-full max-w-[100vw] bg-black text-foreground">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 h-14 safe-area-inset-top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 text-zinc-300"
          onClick={() => setMenuOpen(true)}
          aria-label="Open admin menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary font-bold truncate">Admin</p>
          <p className="text-sm font-semibold truncate">{pageTitle}</p>
        </div>
        <Link href="/" className="shrink-0 text-xs text-muted-foreground hover:text-primary font-medium">
          Site
        </Link>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] border-r border-zinc-800 bg-zinc-950 flex flex-col shadow-2xl transition-transform duration-200 ease-out",
          menuOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        aria-hidden={!menuOpen}
      >
        <SidebarPanel
          pathname={pathname}
          user={user}
          onNavigate={closeMenu}
          onLogout={handleLogout}
          onBack={() => {
            closeMenu();
            router.push("/");
          }}
          showClose
          onClose={closeMenu}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-800 bg-zinc-950 fixed inset-y-0 left-0 z-10 flex-col">
        <SidebarPanel
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
          onBack={() => router.push("/")}
        />
      </aside>

      <main className="w-full min-w-0 lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 max-w-full box-border overflow-x-auto overflow-y-visible">
          {children}
        </div>
      </main>
    </div>
  );
}
