import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  PhotoUpload,
  MAX_FILE_SIZE,
} from "@workspace/ui/components/blocks/avatar/photo-upload"

function createMockFile(
  name: string,
  type = "image/jpeg",
  size = 1024
): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe("PhotoUpload", () => {
  it("renders the upload zone", () => {
    render(<PhotoUpload onFilesSelected={vi.fn()} currentCount={0} />)

    expect(
      screen.getByRole("button", { name: "Upload photos" })
    ).toBeInTheDocument()
    expect(screen.getByText("Drag & drop photos")).toBeInTheDocument()
    expect(screen.getByText("or click to select files")).toBeInTheDocument()
  })

  it("renders photo guidelines", () => {
    render(<PhotoUpload onFilesSelected={vi.fn()} currentCount={0} />)

    expect(screen.getByText("Face front")).toBeInTheDocument()
    expect(screen.getByText("Side angles")).toBeInTheDocument()
    expect(screen.getByText("Full body")).toBeInTheDocument()
    expect(screen.getByText("Varied poses")).toBeInTheDocument()
  })

  it("accepts valid image files via input", () => {
    const onFilesSelected = vi.fn()
    render(<PhotoUpload onFilesSelected={onFilesSelected} currentCount={0} />)

    const input = screen.getByTestId("file-input") as HTMLInputElement
    const files = [
      createMockFile("photo1.jpg", "image/jpeg"),
      createMockFile("photo2.png", "image/png"),
    ]

    fireEvent.change(input, { target: { files } })

    expect(onFilesSelected).toHaveBeenCalledWith(files)
  })

  it("rejects files with invalid type", () => {
    const onFilesSelected = vi.fn()
    render(<PhotoUpload onFilesSelected={onFilesSelected} currentCount={0} />)

    const input = screen.getByTestId("file-input") as HTMLInputElement
    const files = [createMockFile("doc.pdf", "application/pdf")]

    fireEvent.change(input, { target: { files } })

    expect(onFilesSelected).not.toHaveBeenCalled()
    expect(screen.getByText(/Must be JPEG, PNG, or WebP/)).toBeInTheDocument()
  })

  it("rejects files exceeding max size", () => {
    const onFilesSelected = vi.fn()
    render(<PhotoUpload onFilesSelected={onFilesSelected} currentCount={0} />)

    const input = screen.getByTestId("file-input") as HTMLInputElement
    const largeFile = createMockFile(
      "huge.jpg",
      "image/jpeg",
      MAX_FILE_SIZE + 1
    )

    fireEvent.change(input, { target: { files: [largeFile] } })

    expect(onFilesSelected).not.toHaveBeenCalled()
    expect(screen.getByText(/Must be under 10MB/)).toBeInTheDocument()
  })

  it("limits files to remaining count", () => {
    const onFilesSelected = vi.fn()
    render(<PhotoUpload onFilesSelected={onFilesSelected} currentCount={9} />)

    const input = screen.getByTestId("file-input") as HTMLInputElement
    const files = [
      createMockFile("photo1.jpg"),
      createMockFile("photo2.jpg"),
      createMockFile("photo3.jpg"),
    ]

    fireEvent.change(input, { target: { files } })

    expect(onFilesSelected).toHaveBeenCalledWith([files[0]])
    expect(screen.getByText(/Can only add 1 more photo/)).toBeInTheDocument()
  })

  it("disables when at max count", () => {
    render(<PhotoUpload onFilesSelected={vi.fn()} currentCount={10} />)

    const zone = screen.getByRole("button", { name: "Upload photos" })
    expect(zone).toHaveClass("opacity-50")
    expect(zone).toHaveClass("cursor-not-allowed")
  })

  it("handles file drop", () => {
    const onFilesSelected = vi.fn()
    render(<PhotoUpload onFilesSelected={onFilesSelected} currentCount={0} />)

    const zone = screen.getByRole("button", { name: "Upload photos" })
    const file = createMockFile("dropped.jpg", "image/jpeg")

    const dataTransfer = {
      files: [file],
    }

    fireEvent.drop(zone, { dataTransfer })

    expect(onFilesSelected).toHaveBeenCalledWith([file])
  })
})
