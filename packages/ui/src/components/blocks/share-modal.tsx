"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../dialog"
import { Button } from "../button"
import { Input } from "../input"

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title?: string
}

export function ShareModal({ open, onOpenChange, url, title = "Share" }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const encodedUrl = encodeURIComponent(url)
  const shareText = encodeURIComponent("Check out this look on DecaDriver!")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Share this look with friends</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input value={url} readOnly className="flex-1 text-xs" />
          <Button variant="outline" size="icon-sm" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
