import { LoaderCircle } from 'lucide-react'

export function RouteLoadingScreen() {
  return (
    <main aria-live="polite" className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="text-center">
        <LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-primary" size={28} />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Loading CreditBridge AI…</p>
      </div>
    </main>
  )
}
