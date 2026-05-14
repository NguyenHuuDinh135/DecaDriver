"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  LogOut,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { useAuth, useCurrentUser } from "@/lib/hooks/use-auth"
import {
  useUpdateUser,
  useChangePassword,
  useDeleteAccount,
} from "@/lib/hooks/use-profile"

const nameSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type NameFormData = z.infer<typeof nameSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const { data: user } = useCurrentUser()
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()

  const [deleteStep, setDeleteStep] = useState(0)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const nameForm = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
    values: { full_name: user?.full_name ?? "" },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  async function handleNameSubmit(data: NameFormData) {
    try {
      await updateUser.mutateAsync(data)
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
    }
  }

  async function handlePasswordSubmit(data: PasswordFormData) {
    try {
      await changePassword.mutateAsync({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      toast.success("Password changed successfully")
      passwordForm.reset()
    } catch {
      toast.error("Failed to change password")
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount.mutateAsync()
      logout()
      router.push("/login")
    } catch {
      toast.error("Failed to delete account")
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-8">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="font-serif text-lg font-semibold">Settings</h1>
      </header>

      <section className="mt-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Profile</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={nameForm.handleSubmit(handleNameSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  {...nameForm.register("full_name")}
                  aria-invalid={!!nameForm.formState.errors.full_name}
                />
                {nameForm.formState.errors.full_name && (
                  <p className="text-xs text-destructive">
                    {nameForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  {...passwordForm.register("current_password")}
                  aria-invalid={!!passwordForm.formState.errors.current_password}
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...passwordForm.register("new_password")}
                  aria-invalid={!!passwordForm.formState.errors.new_password}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...passwordForm.register("confirm_password")}
                  aria-invalid={!!passwordForm.formState.errors.confirm_password}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Separator className="mt-6" />

      <section className="mt-4 px-4 space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          asChild
        >
          <Link href="/onboarding/avatar">
            <RefreshCw className="size-4" />
            Re-train AI Avatar
          </Link>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="size-4" />
          Log Out
        </Button>

        <Button
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={() => setDeleteStep(1)}
        >
          <Trash2 className="size-4" />
          Delete Account
        </Button>
      </section>

      <Dialog open={deleteStep > 0} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <DialogContent>
          {deleteStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete your account? This action
                  cannot be undone. All your data including try-on history will be lost.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteStep(0)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => setDeleteStep(2)}>
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}
          {deleteStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Type DELETE below to confirm account deletion.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteStep(0)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmText !== "DELETE" || deleteAccount.isPending}
                  onClick={handleDeleteAccount}
                >
                  {deleteAccount.isPending ? "Deleting..." : "Delete Forever"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
