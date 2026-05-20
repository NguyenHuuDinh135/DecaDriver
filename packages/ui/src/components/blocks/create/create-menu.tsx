"use client";

import { Link2, ImagePlus, X, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CreateMenu() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-white px-6 py-8">
      {/* Close Button */}
      <div className="flex justify-end">
        <button 
          onClick={() => router.back()} 
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-6">
        <h2 className="text-3xl font-bold text-center mb-8">What do you want to add?</h2>

        {/* Option 1: Post New Look/Video */}
        <Link 
          href="/create/post"
          className="group flex items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-primary transition-all"
        >
          <div className="w-14 h-14 bg-primary/20 text-primary rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
            <Video size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Post New Look</h3>
            <p className="text-sm text-white/60">Share your outfit video</p>
          </div>
        </Link>

        {/* Option 2: Add Product from Link */}
        <Link 
          href="/create/link"
          className="group flex items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-blue-500 transition-all"
        >
          <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
            <Link2 size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Add from Web</h3>
            <p className="text-sm text-white/60">Paste link from Shopee, Zara...</p>
          </div>
        </Link>

        {/* Option 3: Scan Closet (Coming Soon) */}
        <button className="group flex items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-green-500 transition-all opacity-50 cursor-not-allowed">
          <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mr-4">
            <ImagePlus size={28} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-lg">Scan Closet</h3>
            <p className="text-sm text-white/60">Coming soon</p>
          </div>
        </button>
      </div>
    </div>
  );
}