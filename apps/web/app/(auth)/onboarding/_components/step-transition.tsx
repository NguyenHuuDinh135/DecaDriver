"use client"

import type { ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

type NavigationDirection = "forward" | "back"

const LUXURY_EASE = [0.32, 0.72, 0, 1] as const

const SLIDE_OFFSET = 60

export function StepTransition({
  children,
  direction,
  stepKey,
}: {
  children: ReactNode
  direction: NavigationDirection
  stepKey: string
}) {
  const prefersReduced = useReducedMotion()

  const sign = direction === "forward" ? 1 : -1

  if (prefersReduced) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="flex flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ x: sign * SLIDE_OFFSET, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: sign * -SLIDE_OFFSET, opacity: 0 }}
        transition={{ duration: 0.35, ease: LUXURY_EASE }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function VisualTransition({
  children,
  direction,
  stepKey,
}: {
  children: ReactNode
  direction: NavigationDirection
  stepKey: string
}) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    )
  }

  const sign = direction === "forward" ? 1 : -1

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ y: sign * 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: sign * -16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: LUXURY_EASE }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
