"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { api } from "@/lib/api/client"
import { useAuthStore } from "@/lib/stores/auth"

const registerSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    try {
      await api.post("/users/signup", {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      })
      await login(data.email, data.password)
      router.push("/onboarding")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred")
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-2">
          Virtual Try-On
        </p>
        <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Join DecaDriver and start your virtual try-on experience
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide text-stone-600 uppercase">
            Full Name
          </label>
          <input
            type="text"
            {...register("full_name")}
            placeholder="Jane Smith"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
          />
          {errors.full_name && (
            <p className="text-xs text-red-500">{errors.full_name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide text-stone-600 uppercase">
            Email
          </label>
          <input
            type="email"
            {...register("email")}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide text-stone-600 uppercase">
            Password
          </label>
          <input
            type="password"
            {...register("password")}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-medium tracking-wide hover:bg-stone-800 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-xs text-stone-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-stone-700 underline underline-offset-2 cursor-pointer hover:text-stone-900 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
