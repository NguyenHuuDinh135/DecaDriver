"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    router.push("/onboarding");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Brand */}
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-2">
          Virtual Try-On
        </p>
        <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Sign in to your account to continue
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide text-stone-600 uppercase">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide text-stone-600 uppercase">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
          />
        </div>

        <button
          onClick={handleLogin}
          className="w-full mt-2 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-medium tracking-wide hover:bg-stone-800 active:scale-[0.98] transition-all duration-150"
        >
          Sign In
        </button>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-stone-400">
        Don&apos;t have an account?{" "}
        <span className="text-stone-700 underline underline-offset-2 cursor-pointer hover:text-stone-900 transition-colors">
          Get started
        </span>
      </p>
    </div>
  );
}