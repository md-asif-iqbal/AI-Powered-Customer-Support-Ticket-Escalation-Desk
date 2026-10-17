"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MonitorCheck,
  ArrowRight,
  UserCheck,
  Shield,
  Lock,
  Mail,
} from "lucide-react";
import { signInWithGoogle, loginWithEmailFirebase } from "@/lib/firebase";
import { setToken, apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email + Password Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Try Firebase Email/Password
      let firebaseUser = null;
      try {
        firebaseUser = await loginWithEmailFirebase(email, password);
      } catch (fbErr: unknown) {
        console.warn("Firebase email login fallback to direct API:", fbErr);
      }

      if (firebaseUser) {
        // Sync with backend
        const syncRes = await apiFetch<{ token: string }>(
          "/auth/firebase-sync",
          {
            method: "POST",
            body: JSON.stringify({
              email: firebaseUser.email,
              name: firebaseUser.displayName || email.split("@")[0],
              firebaseUid: firebaseUser.uid,
              authProvider: "FIREBASE",
            }),
          },
        );
        if (syncRes.token) setToken(syncRes.token);
      } else {
        // Direct backend auth
        const res = await apiFetch<{ token: string }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (res.token) setToken(res.token);
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Check credentials.",
      );
      setLoading(false);
    }
  };

  // Google Sign-In via Firebase
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser || !googleUser.email) {
        throw new Error(
          "Google Sign-In was cancelled or failed to retrieve email.",
        );
      }

      // Sync with MongoDB backend
      const syncRes = await apiFetch<{ token: string }>("/auth/firebase-sync", {
        method: "POST",
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.displayName || "Google User",
          firebaseUid: googleUser.uid,
          authProvider: "GOOGLE",
          avatarUrl: googleUser.photoURL || "",
        }),
      });

      if (syncRes.token) {
        setToken(syncRes.token);
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      console.error("Google sign in error:", err);
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Login
  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: demoEmail, password: "password123" }),
      });

      if (res.token) {
        setToken(res.token);
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to execute quick login. Make sure backend is running.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAF9]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md mb-4 bg-brand-dark">
          <MonitorCheck className="w-6 h-6 text-brand-mint" />
        </div>
        <h2 className="text-2xl font-black text-brand-dark tracking-tight">
          Help Desk<span className="text-brand-primary"> AI</span>
        </h2>
        <p className="mt-1 text-xs text-gray-500 font-medium">
          Sign in to access AI-Powered Customer Support & Escalation Hub
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-brand-light rounded-2xl sm:px-10 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Google Sign-In with Firebase Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-xs transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-brand-light"></div>
            <span className="shrink-0 px-3 text-[11px] text-gray-400 font-semibold uppercase">
              Or with Email
            </span>
            <div className="flex-grow border-t border-brand-light"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold text-white shadow-xs transition bg-brand-dark hover:bg-brand-primary"
            >
              {loading ? "Authenticating..." : "Sign In to Desk"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials for Reviewers */}
          <div className="pt-3 border-t border-brand-light space-y-2.5">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("customer@demo.com")}
                className="p-2 text-left bg-brand-light hover:bg-gray-200 rounded-lg transition border border-gray-200"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark">
                  <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
                  Customer
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  John Doe
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("agent@demo.com")}
                className="p-2 text-left bg-brand-light hover:bg-gray-200 rounded-lg transition border border-gray-200"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                  <Shield className="w-3.5 h-3.5" />
                  Agent
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  Sarah Connor
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("admin@demo.com")}
                className="p-2 text-left bg-brand-light hover:bg-gray-200 rounded-lg transition border border-gray-200"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark">
                  <Shield className="w-3.5 h-3.5 text-brand-mint" />
                  Admin
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  Alex Mercer
                </div>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-brand-primary hover:underline"
            >
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
