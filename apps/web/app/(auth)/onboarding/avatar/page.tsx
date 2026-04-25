"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AvatarPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/onboarding/brands");
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Spinner */}
      <div className="relative w-20 h-20">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-stone-100" />
        {/* Spinning arc */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-stone-900 animate-spin" />
        {/* Inner dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-stone-900 animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center flex flex-col gap-2">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">
          Step 2 of 3
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Generating your avatar…
        </h1>
        <p className="text-sm text-stone-500 max-w-xs mx-auto">
          We&apos;re building your digital twin. This only takes a moment.
        </p>
      </div>

      {/* Animated steps */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          { label: "Analyzing photos", delay: "0ms" },
          { label: "Mapping body shape", delay: "600ms" },
          { label: "Rendering avatar", delay: "1200ms" },
        ].map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 opacity-0 animate-[fadeIn_0.4s_ease_forwards]"
            style={{ animationDelay: step.delay }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
            <span className="text-xs text-stone-400">{step.label}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}