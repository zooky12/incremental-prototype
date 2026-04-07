import { GameShell } from '@/components/layout/GameShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <GameShell />
    </ErrorBoundary>
  )
}
