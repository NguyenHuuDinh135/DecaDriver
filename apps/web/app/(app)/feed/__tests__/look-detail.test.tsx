import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { createElement } from "react"
import { LookDetailView } from "@workspace/ui/components/blocks/feed/look-detail"

describe("LookDetailView", () => {
  const defaultProps = {
    resultUrl: "https://cdn.example.com/results/look1.jpg",
    garmentTitle: "Classic Oxford Shirt",
    garmentBrand: "Maison Noir",
    createdAt: "2026-04-15T10:30:00Z",
    onDownload: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    isDeleting: false,
  }

  it("renders the result image", () => {
    render(createElement(LookDetailView, defaultProps))

    const img = document.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("src")).toBe(defaultProps.resultUrl)
  })

  it("renders garment title", () => {
    render(createElement(LookDetailView, defaultProps))

    expect(screen.getByText("Classic Oxford Shirt")).toBeDefined()
  })

  it("renders garment brand", () => {
    render(createElement(LookDetailView, defaultProps))

    expect(screen.getByText("Maison Noir")).toBeDefined()
  })

  it("renders action buttons", () => {
    render(createElement(LookDetailView, defaultProps))

    expect(screen.getByText("Download Image")).toBeDefined()
    expect(screen.getByText("Share")).toBeDefined()
    expect(screen.getByText("Delete Look")).toBeDefined()
  })

  it("renders formatted date", () => {
    render(createElement(LookDetailView, defaultProps))

    expect(screen.getByText("April 15, 2026")).toBeDefined()
  })

  it("shows placeholder when no result image", () => {
    render(createElement(LookDetailView, { ...defaultProps, resultUrl: null }))

    expect(screen.getByText("No result image available")).toBeDefined()
  })

  it("disables download button when no result", () => {
    render(createElement(LookDetailView, { ...defaultProps, resultUrl: null }))

    const downloadBtn = screen.getByText("Download Image").closest("button")
    expect(downloadBtn?.disabled).toBe(true)
  })

  it("shows deleting state", () => {
    render(createElement(LookDetailView, { ...defaultProps, isDeleting: true }))

    expect(screen.getByText("Deleting...")).toBeDefined()
  })
})
