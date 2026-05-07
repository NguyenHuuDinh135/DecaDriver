export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-secondary px-4 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-3xl tracking-tight text-foreground">
          DecaDriver
        </h1>
      </div>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
