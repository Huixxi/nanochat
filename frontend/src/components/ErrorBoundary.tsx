import { Component, ReactNode } from 'react'

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
          <p className="text-red-400 text-sm mb-2">页面出错了</p>
          <p className="text-zinc-600 text-xs max-w-[300px] break-all">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/discover' }}
            className="mt-6 px-4 py-2 bg-zinc-800 text-white text-sm rounded-lg"
          >
            返回首页
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
