"use client"

import { Component, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="space-y-2">
            <h2 className="font-serif text-2xl tracking-tight">
              Something went wrong
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="inline-flex h-10 items-center rounded-full border border-foreground bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
