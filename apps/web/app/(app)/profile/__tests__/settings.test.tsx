import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { useAuthStore } from "@/lib/stores/auth"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe("Settings Page", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        is_active: true,
      },
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("renders edit name form with current user name", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    await waitFor(() => {
      const input = screen.getByLabelText("Full Name") as HTMLInputElement
      expect(input.value).toBe("Test User")
    })
  })

  it("validates that name is required", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    })

    const input = screen.getByLabelText("Full Name")
    fireEvent.change(input, { target: { value: "" } })

    const saveButton = screen.getByRole("button", { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
  })

  it("renders change password form", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    await waitFor(() => {
      expect(screen.getByLabelText("Current Password")).toBeInTheDocument()
    })

    expect(screen.getByLabelText("New Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
  })

  it("validates password confirmation matches", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    await waitFor(() => {
      expect(screen.getByLabelText("Current Password")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "oldpass123" } })
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "newpass123" } })
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "different" } })

    const changeButton = screen.getByRole("button", { name: /change password/i })
    fireEvent.click(changeButton)

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument()
    })
  })

  it("renders delete account button", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument()
  })

  it("opens delete account dialog with confirmation steps", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    const deleteButton = screen.getByRole("button", { name: /delete account/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })

    const continueButton = screen.getByRole("button", { name: /continue/i })
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type DELETE")).toBeInTheDocument()
    })

    const deleteForeverButton = screen.getByRole("button", { name: /delete forever/i })
    expect(deleteForeverButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText("Type DELETE"), { target: { value: "DELETE" } })

    await waitFor(() => {
      expect(deleteForeverButton).not.toBeDisabled()
    })
  })

  it("renders logout button", async () => {
    const SettingsPage = (await import("../settings/page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(SettingsPage)))

    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument()
  })
})
