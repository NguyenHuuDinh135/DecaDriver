export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-md px-6">{children}</div>
    </div>
  );
}