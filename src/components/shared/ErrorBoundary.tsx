import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; info: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info: info.componentStack ?? '' })
    console.error('[ErrorBoundary caught]', error.message, error.stack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#1a0a0a', color: '#ef4444', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 13 }}>
          <strong>Runtime Error</strong>{'\n\n'}
          {this.state.error.message}{'\n\n'}
          {this.state.error.stack}{'\n\n'}
          <strong>Component Stack</strong>{'\n'}
          {this.state.info}
        </div>
      )
    }
    return this.props.children
  }
}
