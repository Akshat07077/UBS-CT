"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/lib/brand/config";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  Home,
  MessageSquare,
  CirclePlus,
  Car,
  Shield,
} from "lucide-react";
import { useState } from "react";

const linkClass = (active: boolean) =>
  `text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
    active ? "text-primary" : "text-zinc-400 hover:text-zinc-100"
  }`;

function userInitials(name: string | null | undefined, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function UserAvatar({
  name,
  email,
  size = "md",
  className,
}: {
  name?: string | null;
  email: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = userInitials(name, email);
  const sizeClass =
    size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold shrink-0",
        "bg-gradient-to-br from-primary/90 via-amber-500 to-amber-700 text-zinc-950 shadow-inner",
        sizeClass,
        className
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function MenuIcon({
  icon: Icon,
  tone = "default",
}: {
  icon: React.ElementType;
  tone?: "default" | "primary" | "admin" | "danger";
}) {
  const tones = {
    default: "bg-zinc-800/80 text-zinc-300 group-hover:text-zinc-100",
    primary: "bg-primary/15 text-primary group-hover:bg-primary/25",
    admin: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25",
    danger: "bg-red-500/10 text-red-400 group-hover:bg-red-500/20",
  };
  return (
    <span
      className={cn(
        "mr-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        tones[tone]
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-gradient-metal-bar backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3 h-16 md:h-20">
          <BrandLogo size="navbar" className="shrink-0" />

          <Link
            href="/"
            className="md:hidden flex flex-1 flex-col items-center justify-center min-w-0 max-w-[52vw] sm:max-w-none text-center px-0.5"
            aria-label={brand.name}
          >
            <span className="font-display font-bold text-xs sm:text-sm text-foreground leading-tight line-clamp-2 w-full">
              <span className="sm:hidden">UB&apos;s Car Rental</span>
              <span className="hidden sm:inline">{brand.name}</span>
            </span>
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.22em] text-primary font-bold truncate w-full mt-0.5">
              {brand.slogan}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <Link href="/" className={linkClass(pathname === "/")}>
              Home
            </Link>
            <Link href="/cars" className={linkClass(pathname === "/cars" || pathname.startsWith("/cars/"))}>
              Browse Cars
            </Link>
            <Link href="/list-your-car" className={linkClass(pathname === "/list-your-car")}>
              List your car
            </Link>
            <Link href="/contact" className={linkClass(pathname === "/contact")}>
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 ring-2 ring-primary/40 ring-offset-2 ring-offset-zinc-950 hover:ring-primary/70 hover:bg-transparent transition-all"
                    aria-label="Account menu"
                  >
                    <UserAvatar name={user.name} email={user.email} size="md" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="w-72 p-0 overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/50"
                >
                  <div className="px-4 py-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-b border-zinc-800/80">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} email={user.email} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-50 truncate">{user.name || "User"}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</p>
                        {user.role === "admin" && (
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <DropdownMenuItem asChild className="rounded-xl px-2 py-2.5 cursor-pointer focus:bg-zinc-900/80">
                      <Link href="/list-your-car" className="group flex items-center w-full">
                        <MenuIcon icon={CirclePlus} tone="primary" />
                        <span className="font-medium text-zinc-200">List your car</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-2 py-2.5 cursor-pointer focus:bg-zinc-900/80">
                      <Link href="/dashboard" className="group flex items-center w-full">
                        <MenuIcon icon={LayoutDashboard} />
                        <span className="font-medium text-zinc-200">My account</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild className="rounded-xl px-2 py-2.5 cursor-pointer focus:bg-zinc-900/80">
                        <Link href="/admin" className="group flex items-center w-full">
                          <MenuIcon icon={Settings} tone="admin" />
                          <span className="font-medium text-zinc-200">Admin dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-zinc-800/80 mx-0" />
                  <div className="p-2">
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="group rounded-xl px-2 py-2.5 cursor-pointer focus:bg-red-950/40 focus:text-red-300"
                    >
                      <MenuIcon icon={LogOut} tone="danger" />
                      <span className="font-medium text-red-400 group-focus:text-red-300">Log out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" className="font-semibold uppercase tracking-wider text-xs text-zinc-300">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="rounded-xl uppercase tracking-wider text-xs px-5">Sign up</Button>
                </Link>
              </div>
            )}

            <button
              className="md:hidden p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-black/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === "/" ? "bg-zinc-900 text-primary font-semibold border border-zinc-800" : "hover:bg-zinc-900"
                }`}
              >
                <Home className="w-4 h-4" /> Home
              </div>
            </Link>
            <Link href="/cars" onClick={() => setMobileOpen(false)}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === "/cars" || pathname.startsWith("/cars/")
                    ? "bg-zinc-900 text-primary font-semibold border border-zinc-800"
                    : "hover:bg-zinc-900"
                }`}
              >
                <Car className="w-4 h-4" /> Browse Cars
              </div>
            </Link>
            <Link href="/list-your-car" onClick={() => setMobileOpen(false)}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === "/list-your-car"
                    ? "bg-zinc-900 text-primary font-semibold border border-zinc-800"
                    : "hover:bg-zinc-900"
                }`}
              >
                <CirclePlus className="w-4 h-4" /> List your car
              </div>
            </Link>
            <Link href="/contact" onClick={() => setMobileOpen(false)}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === "/contact"
                    ? "bg-zinc-900 text-primary font-semibold border border-zinc-800"
                    : "hover:bg-zinc-900"
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Contact
              </div>
            </Link>
            {user ? (
              <>
                <div className="px-4 py-3 mb-1 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                  <UserAvatar name={user.name} email={user.email} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      pathname === "/dashboard"
                        ? "bg-zinc-900 text-primary font-semibold border border-zinc-800"
                        : "hover:bg-zinc-900"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> My account
                  </div>
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-colors text-amber-400/90">
                      <Settings className="w-4 h-4" /> Admin dashboard
                    </div>
                  </Link>
                )}
                <div className="pt-2 border-t border-zinc-800 mt-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-950/30 text-red-400 w-full transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-zinc-800 mt-2 flex flex-col gap-2">
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> My account
                  </div>
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-xl font-semibold">
                    Log in
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-xl font-semibold">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
