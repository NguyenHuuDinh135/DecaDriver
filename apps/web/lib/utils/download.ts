export async function downloadImage(url: string, filename?: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename ?? `decadriver-look-${Date.now()}.jpg`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}
