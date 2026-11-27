import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Brand } from '../brand/Brand'
import { Button } from '../ui/Button'
import { buttonClasses } from '../ui/buttonStyles'

export function RouteErrorPage() {
  const error = useRouteError()
  const heading = isRouteErrorResponse(error)
    ? `Page unavailable (${error.status})`
    : 'This page could not be opened'

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
      <Brand />
      <p className="mt-10 text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
        Something went wrong
      </p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
        {heading}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
        We couldn&apos;t load this view. Your financial information has not been
        sent as part of this error.
      </p>
      <Link className={`${buttonClasses('primary')} mt-7`} to="/">
        Return to CreditBridge AI
      </Link>
      <Button className="mt-3" onClick={() => window.location.reload()} variant="ghost">
        Try again
      </Button>
    </main>
  )
}
