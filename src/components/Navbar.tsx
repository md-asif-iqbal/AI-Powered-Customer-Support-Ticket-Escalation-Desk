"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MonitorCheck,
  PlusCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { removeToken } from "@/lib/api";
import { logoutFromFirebase } from "@/lib/firebase";

interface NavbarProps {
  currentUser?: {
    userId: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "AGENT" | "ADMIN";
  } | null;
  onRefresh?: () => void;
}

export function Navbar({ currentUser, onRefresh: _onRefresh }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      removeToken();
      await logoutFromFirebase();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const roleClasses: Record<string, string> = {
    CUSTOMER: "bg-brand-light text-brand-dark",
    AGENT: "bg-brand-primary text-white",
    ADMIN: "bg-brand-dark text-white",
  };

  const currentRoleClass = currentUser?.role ? roleClasses[currentUser.role] : roleClasses.CUSTOMER;

  return (
    <header className="sticky top-0 z-50 shadow-xs border-b border-brand-light bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 bg-brand-dark">
              <MonitorCheck className="w-5 h-5 text-brand-mint" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-brand-dark tracking-tight block leading-tight">
                OmniDesk<span className="text-brand-primary"> AI</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium block">
                SLA & Escalation Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-gray-700 hover:text-brand-dark px-3 py-2 rounded-lg transition"
            >
              Tickets Dashboard
            </Link>

            <Link
              href="/tickets/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow-xs transition hover:opacity-95 bg-brand-primary"
            >
              <PlusCircle className="w-4 h-4" />
              New Ticket
            </Link>
          </div>

          {/* User Section (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <div className="text-xs font-bold text-gray-900">{currentUser.name}</div>
                    <div className="text-[11px] text-gray-500">{currentUser.email}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${currentRoleClass}`}>
                    {currentUser.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-gray-500 hover:text-red-600 rounded-lg transition hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-dark hover:bg-brand-light transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs transition bg-brand-dark hover:bg-brand-primary"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-brand-light"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-light bg-white px-4 pt-3 pb-4 space-y-3 shadow-lg">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-gray-800 py-2 border-b border-brand-light"
          >
            Dashboard
          </Link>
          <Link
            href="/tickets/new"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-gray-800 py-2 border-b border-brand-light"
          >
            + Create New Ticket
          </Link>

          {currentUser ? (
            <div className="pt-2 border-t border-brand-light space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 block">{currentUser.name}</span>
                  <span className="text-gray-500 block">{currentUser.email}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentRoleClass}`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left text-xs font-semibold text-red-600 py-2 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-brand-light flex gap-2">
              <Link
                href="/login"
                className="flex-1 text-center py-2 text-xs font-semibold text-brand-dark bg-brand-light rounded-lg"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 text-center py-2 text-xs font-semibold text-white bg-brand-dark rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
