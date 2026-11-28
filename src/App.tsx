import { Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { LanguageProvider } from './app/providers/LanguageProvider'
import { ThemeProvider } from './app/providers/ThemeProvider'
import { RouteErrorPage } from './components/common/RouteErrorPage'
import { RouteLoadingScreen } from './components/common/RouteLoadingScreen'
import { GuestRoute } from './app/router/GuestRoute'
import { OnboardingGuard } from './app/router/OnboardingGuard'
import { WorkspaceGuard } from './app/router/WorkspaceGuard'
import { VerificationGuard } from './app/router/VerificationGuard'

const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: RouteLoadingScreen,
    lazy: async () => {
      const { PublicLayout } = await import('./app/layouts/PublicLayout')
      return { Component: PublicLayout }
    },
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { LandingPage } = await import('./features/landing/LandingPage')
          return { Component: LandingPage }
        },
      },
      {
        path: 'features',
        lazy: async () => {
          const { InfoPage } = await import('./features/landing/InfoPage')
          return { Component: InfoPage }
        },
      },
      {
        path: 'how-it-works',
        lazy: async () => {
          const { InfoPage } = await import('./features/landing/InfoPage')
          return { Component: InfoPage }
        },
      },
      {
        path: 'privacy',
        lazy: async () => {
          const { InfoPage } = await import('./features/landing/InfoPage')
          return { Component: InfoPage }
        },
      },
      {
        path: 'about',
        lazy: async () => {
          const { InfoPage } = await import('./features/landing/InfoPage')
          return { Component: InfoPage }
        },
      },
      {
        path: 'login',
        lazy: async () => {
          const { LoginPreviewPage } = await import('./features/auth/LoginPreviewPage')
          return {
            Component: () => <GuestRoute><LoginPreviewPage /></GuestRoute>,
          }
        },
      },
      {
        path: 'register',
        lazy: async () => {
          const { RegisterPage } = await import('./features/auth/RegisterPage')
          return { Component: () => <GuestRoute><RegisterPage /></GuestRoute> }
        },
      },
      {
        path: 'forgot-password',
        lazy: async () => {
          const { ForgotPasswordPage } = await import('./features/auth/ForgotPasswordPage')
          return { Component: () => <GuestRoute><ForgotPasswordPage /></GuestRoute> }
        },
      },
      {
        path: 'onboarding',
        lazy: async () => {
          const { OnboardingPreviewPage } = await import('./features/onboarding/OnboardingPreviewPage')
          return { Component: () => <OnboardingGuard><OnboardingPreviewPage /></OnboardingGuard> }
        },
      },
      {
        path: 'verify-email',
        lazy: async () => {
          const { VerifyEmailPage } = await import('./features/auth/VerifyEmailPage')
          return { Component: () => <VerificationGuard><VerifyEmailPage /></VerificationGuard> }
        },
      },
      {
        path: 'demo',
        element: <Navigate replace to="/demo/dashboard" />,
      },
    ],
  },
  {
    path: '/app',
    HydrateFallback: RouteLoadingScreen,
    lazy: async () => {
      const { RealWorkspaceLayout } = await import('./app/layouts/RealWorkspaceLayout')
      return { Component: () => <WorkspaceGuard><RealWorkspaceLayout /></WorkspaceGuard> }
    },
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate replace to="/app/dashboard" /> },
      {
        path: 'dashboard',
        lazy: async () => {
          const { RealDashboardPage } = await import('./features/dashboard/RealDashboardPage')
          return { Component: RealDashboardPage }
        },
      },
      {
        path: 'transactions',
        lazy: async () => {
          const { RealTransactionsPage } = await import('./features/transactions/RealTransactionsPage')
          return { Component: RealTransactionsPage }
        },
      },
      {
        path: 'transactions/new',
        lazy: async () => {
          const { RealNewTransactionPage } = await import('./features/transactions/RealNewTransactionPage')
          return { Component: RealNewTransactionPage }
        },
      },
      {
        path: 'capture',
        lazy: async () => {
          const { SmartCapturePage } = await import('./features/transactions/SmartCapturePage')
          return { Component: SmartCapturePage }
        },
      },
      {
        path: 'transactions/receipt',
        lazy: async () => {
          const { SmartCapturePage } = await import('./features/transactions/SmartCapturePage')
          return { Component: SmartCapturePage }
        },
      },
      {
        path: 'assistant',
        lazy: async () => {
          const { AssistantPage } = await import('./features/assistant/AssistantPage')
          return { Component: AssistantPage }
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { AccountSettingsPage } = await import('./features/settings/AccountSettingsPage')
          return { Component: AccountSettingsPage }
        },
      },
      {
        path: 'privacy',
        lazy: async () => {
          const { PrivacyCenterPage } = await import('./features/privacy/PrivacyCenterPage')
          return { Component: PrivacyCenterPage }
        },
      },
      ...[
        'analytics',
        'passport',
        'loans',
        'budgets',
        'goals',
        'debts',
        'notifications',
        'help',
      ].map((path) => ({
        path,
        lazy: async () => {
          const { UpcomingPage } = await import('./features/workspace/UpcomingPage')
          return { Component: UpcomingPage }
        },
      })),
    ],
  },
  {
    path: '/demo',
    HydrateFallback: RouteLoadingScreen,
    lazy: async () => {
      const { DemoWorkspaceLayout } = await import('./app/layouts/DemoWorkspaceLayout')
      return { Component: DemoWorkspaceLayout }
    },
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate replace to="/demo/dashboard" /> },
      {
        path: 'dashboard',
        lazy: async () => {
          const { DashboardPage } = await import('./features/dashboard/DashboardPage')
          return { Component: DashboardPage }
        },
      },
      {
        path: 'transactions',
        lazy: async () => {
          const { TransactionsPage } = await import('./features/transactions/TransactionsPage')
          return { Component: TransactionsPage }
        },
      },
      {
        path: 'transactions/new',
        lazy: async () => {
          const { NewTransactionPage } = await import('./features/transactions/NewTransactionPage')
          return { Component: NewTransactionPage }
        },
      },
      {
        path: 'assistant',
        lazy: async () => {
          const { AssistantPage } = await import('./features/assistant/AssistantPage')
          return { Component: AssistantPage }
        },
      },
      ...[
        'analytics',
        'passport',
        'loans',
        'budgets',
        'goals',
        'debts',
        'notifications',
        'privacy',
        'settings',
        'help',
      ].map((path) => ({
        path,
        lazy: async () => {
          const { UpcomingPage } = await import('./features/workspace/UpcomingPage')
          return { Component: UpcomingPage }
        },
      })),
    ],
  },
  ...(import.meta.env.DEV
    ? [{
        path: '/dev/hybrid-ai',
      HydrateFallback: RouteLoadingScreen,
        lazy: async () => {
          const { HybridAIPlayground } = await import('./features/ai-playground/HybridAIPlayground')
          return { Component: HybridAIPlayground }
        },
        errorElement: <RouteErrorPage />,
      }]
    : []),
  {
    path: '*',
    HydrateFallback: RouteLoadingScreen,
    lazy: async () => {
      const { NotFoundPage } = await import('./features/landing/NotFoundPage')
      return { Component: NotFoundPage }
    },
  },
])

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Suspense fallback={<RouteLoadingScreen />}>
          <RouterProvider router={router} />
        </Suspense>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
