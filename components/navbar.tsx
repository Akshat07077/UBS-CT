"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/lib/brand/config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutDashboard, Settings, Menu, X, Home, MessageSquare, CirclePlus, Car } from "lucide-react";
import { useState } from "react";

const linkClass = (active: boolean) =>
  `text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
    active ? "text-primary" : "text-zinc-400 hover:text-zinc-100"
  }`;

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
                    className="relative h-9 w-9 md:h-10 md:w-10 rounded-full border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800"
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5 text-zinc-200" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 border-zinc-800 bg-zinc-950">
                  <DropdownMenuLabel>
                    <p className="text-sm font-bold">{user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem asChild>
                    <Link href="/list-your-car" className="cursor-pointer flex items-center py-2 focus:bg-zinc-900">
                      <CirclePlus className="mr-2 h-4 w-4" /> List your car
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer flex items-center py-2 focus:bg-zinc-900">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> My account
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/cars" className="cursor-pointer flex items-center py-2 focus:bg-zinc-900">
                        <Settings className="mr-2 h-4 w-4" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive py-2 focus:bg-zinc-900"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
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
                  <Link href="/admin/cars" onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-colors">
                      <Settings className="w-4 h-4" /> Admin Dashboard
                    </div>
                  </Link>
                )}
                <div className="pt-2 border-t border-zinc-800 mt-2">
                  <p className="px-4 py-1 text-xs text-muted-foreground">{user.email}</p>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive w-full transition-colors"
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
