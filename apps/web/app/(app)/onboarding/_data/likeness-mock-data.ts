import type { LucideIcon } from "lucide-react"
import {
  Glasses,
  Lightbulb,
  LockKeyhole,
  PackageX,
  ScanFace,
  ShieldCheck,
  Shirt,
  UserRound,
} from "lucide-react"

export type MockImage = {
  id: string
  alt: string
  label: string
  tone: string
}

export type CapturePrompt = {
  id: string
  label: string
  instruction: string
  helper: string
}

export type Guideline = {
  icon: LucideIcon
  title: string
  description: string
}

export const SELFIE_ANGLES: CapturePrompt[] = [
  {
    id: "straight-ahead",
    label: "Straight ahead",
    instruction: "Look straight ahead",
    helper: "Keep your face centered and relaxed.",
  },
  {
    id: "left-profile",
    label: "Left profile",
    instruction: "Turn to your left profile",
    helper: "Rotate until the left side of your face is visible.",
  },
  {
    id: "right-profile",
    label: "Right profile",
    instruction: "Turn to your right profile",
    helper: "Rotate until the right side of your face is visible.",
  },
  {
    id: "slight-left",
    label: "Slight left",
    instruction: "Angle slightly left",
    helper: "Keep your eyes near the camera while turning a little.",
  },
  {
    id: "slight-right",
    label: "Slight right",
    instruction: "Angle slightly right",
    helper: "Mirror the previous angle for a balanced reference.",
  },
  {
    id: "neutral-front",
    label: "Neutral front",
    instruction: "Finish with a neutral front",
    helper: "Relax your face and keep the lighting even.",
  },
]

export const MOCK_SELFIES: MockImage[] = [
  {
    id: "selfie-straight-ahead",
    label: "Straight ahead",
    alt: "Mock straight ahead selfie",
    tone: "from-stone-200 via-stone-100 to-zinc-300",
  },
  {
    id: "selfie-left-profile",
    label: "Left profile",
    alt: "Mock left profile selfie",
    tone: "from-neutral-300 via-stone-100 to-amber-100",
  },
  {
    id: "selfie-right-profile",
    label: "Right profile",
    alt: "Mock right profile selfie",
    tone: "from-zinc-300 via-neutral-100 to-stone-200",
  },
  {
    id: "selfie-slight-left",
    label: "Slight left",
    alt: "Mock slight left selfie",
    tone: "from-stone-100 via-zinc-200 to-neutral-300",
  },
  {
    id: "selfie-slight-right",
    label: "Slight right",
    alt: "Mock slight right selfie",
    tone: "from-amber-50 via-stone-200 to-zinc-300",
  },
  {
    id: "selfie-neutral-front",
    label: "Neutral front",
    alt: "Mock neutral front selfie",
    tone: "from-neutral-200 via-stone-100 to-stone-300",
  },
]

export const MOCK_BODY_PHOTOS: MockImage[] = [
  {
    id: "body-front",
    label: "Full body 1",
    alt: "Mock full body front photo",
    tone: "from-zinc-200 via-stone-100 to-neutral-300",
  },
  {
    id: "body-side",
    label: "Full body 2",
    alt: "Mock full body side photo",
    tone: "from-stone-300 via-neutral-100 to-amber-100",
  },
]

export const SELFIE_GUIDELINES: Guideline[] = [
  {
    icon: Lightbulb,
    title: "Balanced bright lighting",
    description: "Face a soft window or evenly lit room.",
  },
  {
    icon: ScanFace,
    title: "Hold camera at eye level",
    description: "Keep your face centered in the guide.",
  },
  {
    icon: Glasses,
    title: "No glasses, hats, or AirPods",
    description: "Remove anything that hides your facial reference.",
  },
]

export const BODY_PHOTO_GUIDELINES: Guideline[] = [
  {
    icon: UserRound,
    title: "Just you, no friends",
    description: "Make sure only you are visible.",
  },
  {
    icon: ScanFace,
    title: "Full-length, but close-up",
    description: "Show your full body without standing too far away.",
  },
  {
    icon: PackageX,
    title: "No bags, pets, or phones",
    description: "Keep your silhouette and hands easy to read.",
  },
  {
    icon: Shirt,
    title: "No glasses, hats, or AirPods",
    description: "Avoid accessories that change your proportions.",
  },
]

export const PRIVACY_POINTS: Guideline[] = [
  {
    icon: ShieldCheck,
    title: "Local demo only",
    description: "Images stay in local UI state during this mock flow.",
  },
  {
    icon: LockKeyhole,
    title: "Not uploaded or shared",
    description: "No backend request is made from this onboarding route.",
  },
  {
    icon: UserRound,
    title: "You stay in control",
    description: "Remove any selected image before creating the mock profile.",
  },
]

export const INTRO_CARDS = [
  {
    id: "tailored",
    title: "Evening tailoring",
    subtitle: "Fit preview",
    tone: "from-stone-950 via-zinc-700 to-stone-300",
  },
  {
    id: "street",
    title: "Soft streetwear",
    subtitle: "Proportions",
    tone: "from-neutral-200 via-stone-400 to-zinc-800",
  },
  {
    id: "minimal",
    title: "Minimal layers",
    subtitle: "Drape check",
    tone: "from-stone-100 via-zinc-200 to-neutral-500",
  },
] as const
