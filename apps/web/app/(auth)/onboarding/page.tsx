"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_IMAGES = 10;
const MIN_IMAGES = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [imageCount, setImageCount] = useState(0);

  const handleAddImages = () => {
    // Mock: add 1 image each click, cap at MAX
    setImageCount((prev) => Math.min(prev + 1, MAX_IMAGES));
  };

  const handleRemoveImage = (index: number) => {
    setImageCount((prev) => Math.max(prev - 1, 0));
  };

  const canContinue = imageCount >= MIN_IMAGES;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-2">
          Step 1 of 3
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Upload your photos
        </h1>
        <p className="mt-1.5 text-sm text-stone-500">
          Add 5–10 photos of yourself so we can build your virtual avatar.
        </p>
      </div>

      {/* Upload area */}
      <div
        onClick={handleAddImages}
        className="relative border-2 border-dashed border-stone-200 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-stone-400 hover:bg-stone-100 transition-all duration-200 active:scale-[0.99]"
      >
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-stone-700">
            Tap to add a photo
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            PNG, JPG up to 10MB each
          </p>
        </div>
      </div>

      {/* Image count + grid preview */}
      {imageCount > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-stone-600 uppercase tracking-wide">
              Uploaded
            </p>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                canContinue
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {imageCount} / {MAX_IMAGES}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: imageCount }).map((_, i) => (
              <div
                key={i}
                onClick={() => handleRemoveImage(i)}
                className="aspect-square rounded-xl bg-stone-200 flex items-center justify-center cursor-pointer hover:bg-stone-300 relative group transition-colors"
              >
                <span className="text-xs text-stone-400 group-hover:hidden">
                  {i + 1}
                </span>
                <svg
                  className="w-4 h-4 text-stone-500 hidden group-hover:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-900 rounded-full transition-all duration-300"
            style={{ width: `${(imageCount / MAX_IMAGES) * 100}%` }}
          />
        </div>
        {!canContinue && imageCount > 0 && (
          <p className="text-xs text-stone-400 text-right">
            {MIN_IMAGES - imageCount} more needed
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/onboarding/avatar")}
        disabled={!canContinue}
        className="w-full py-3.5 rounded-xl bg-stone-900 text-white text-sm font-medium tracking-wide transition-all duration-150 hover:bg-stone-800 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-stone-900"
      >
        Continue
      </button>
    </div>
  );
}