import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PhotoReview } from "@workspace/ui/components/blocks/avatar/photo-review"

function createMockFile(name: string): File {
  const buffer = new ArrayBuffer(1024)
  return new File([buffer], name, { type: "image/jpeg" })
}

global.URL.createObjectURL = vi.fn(() => "blob:mock-url")

describe("PhotoReview", () => {
  it("renders photo thumbnails", () => {
    const photos = [
      createMockFile("photo1.jpg"),
      createMockFile("photo2.jpg"),
      createMockFile("photo3.jpg"),
    ]

    render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={vi.fn()} />
    )

    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute("alt", "Photo 1")
    expect(images[2]).toHaveAttribute("alt", "Photo 3")
  })

  it("displays photo count", () => {
    const photos = Array.from({ length: 7 }, (_, i) =>
      createMockFile(`photo${i}.jpg`)
    )

    render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={vi.fn()} />
    )

    expect(screen.getByText("7/10 photos")).toBeInTheDocument()
  })

  it("shows warning when below minimum", () => {
    const photos = [
      createMockFile("photo1.jpg"),
      createMockFile("photo2.jpg"),
    ]

    render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={vi.fn()} />
    )

    expect(screen.getByText(/min 5 required/)).toBeInTheDocument()
    expect(screen.getByText(/Add at least 3 more photos/)).toBeInTheDocument()
  })

  it("disables continue button when below minimum", () => {
    const photos = [
      createMockFile("photo1.jpg"),
      createMockFile("photo2.jpg"),
    ]

    render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={vi.fn()} />
    )

    const button = screen.getByRole("button", { name: "Continue" })
    expect(button).toBeDisabled()
  })

  it("enables continue button when at minimum", () => {
    const photos = Array.from({ length: 5 }, (_, i) =>
      createMockFile(`photo${i}.jpg`)
    )

    render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={vi.fn()} />
    )

    const button = screen.getByRole("button", { name: "Continue" })
    expect(button).not.toBeDisabled()
  })

  it("calls onRemove when delete button is clicked", () => {
    const onRemove = vi.fn()
    const photos = Array.from({ length: 5 }, (_, i) =>
      createMockFile(`photo${i}.jpg`)
    )

    render(
      <PhotoReview photos={photos} onRemove={onRemove} onContinue={vi.fn()} />
    )

    const removeButtons = screen.getAllByLabelText(/Remove photo/)
    fireEvent.click(removeButtons[2]!)

    expect(onRemove).toHaveBeenCalledWith(2)
  })

  it("calls onContinue when continue button is clicked", () => {
    const onContinue = vi.fn()
    const photos = Array.from({ length: 5 }, (_, i) =>
      createMockFile(`photo${i}.jpg`)
    )

    render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={onContinue} />
    )

    const button = screen.getByRole("button", { name: "Continue" })
    fireEvent.click(button)

    expect(onContinue).toHaveBeenCalledOnce()
  })

  it("shows red borders when below minimum", () => {
    const photos = [createMockFile("photo1.jpg")]

    const { container } = render(
      <PhotoReview photos={photos} onRemove={vi.fn()} onContinue={vi.fn()} />
    )

    const thumbnailContainer = container.querySelector(".grid > div") as HTMLElement
    expect(thumbnailContainer).toHaveClass("border-red-200")
  })
})
