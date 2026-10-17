"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonitorCheck, ArrowRight, User, Mail, Lock } from "lucide-react";
import { signInWithGoogle, registerWithEmailFirebase } from "@/lib/firebase";
import { setToken, apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "AGENT">("CUSTOMER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Register with Firebase Email/Password
      let firebaseUser = null;
      try {
        firebaseUser = await registerWithEmailFirebase(email, password, name);
      } catch (fbErr: unknown) {
        console.warn("Firebase register fallback to direct API:", fbErr);
      }

      if (firebaseUser) {
        // Sync with backend
        const syncRes = await apiFetch<{ token: string }>(
          "/auth/firebase-sync",
          {
            method: "POST",
            body: JSON.stringify({
              email: firebaseUser.email,
              name: name || firebaseUser.displayName || email.split("@")[0],
              firebaseUid: firebaseUser.uid,
              authProvider: "FIREBASE",
              role,
            }),
          },
        );
        if (syncRes.token) setToken(syncRes.token);
      } else {
        // Direct backend register
        const res = await apiFetch<{ token: string }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, role }),
        });
        if (res.token) setToken(res.token);
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);

    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser || !googleUser.email) {
        throw new Error("Google Sign-In was cancelled.");
      }

      const syncRes = await apiFetch<{ token: string }>("/auth/firebase-sync", {
        method: "POST",
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.displayName || "Google User",
          firebaseUid: googleUser.uid,
          authProvider: "GOOGLE",
          role,
          avatarUrl: googleUser.photoURL || "",
        }),
      });

      if (syncRes.token) setToken(syncRes.token);

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google Sign-Up failed.");
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
          Create an Account
        </h2>
        <p className="mt-1 text-xs text-gray-500 font-medium">
          Join the Help Desk AI Support & SLA Escalation Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-brand-light rounded-2xl sm:px-10 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
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
            Sign up with Google (Firebase)
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
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Iqbal"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>
            </div>

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
                  placeholder="At least 6 characters"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("CUSTOMER")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition ${
                    role === "CUSTOMER"
                      ? "text-white bg-brand-dark border-transparent"
                      : "text-gray-700 border-gray-300 bg-white"
                  }`}
                >
                  Customer (End-User)
                </button>

                <button
                  type="button"
                  onClick={() => setRole("AGENT")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition ${
                    role === "AGENT"
                      ? "text-white bg-brand-primary border-transparent"
                      : "text-gray-700 border-gray-300 bg-white"
                  }`}
                >
                  Support Agent
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold text-white shadow-xs transition bg-brand-primary hover:bg-brand-dark"
            >
              {loading ? "Creating Account..." : "Complete Registration"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-gray-500">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-bold text-brand-dark hover:underline"
            >
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
