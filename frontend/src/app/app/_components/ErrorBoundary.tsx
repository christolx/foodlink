"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f7f4e9] p-8 text-center">
          <div>
            <h1 className="font-serif text-2xl font-black text-[#111a14]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm font-bold text-[#5d675f]">
              Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-[#2f7a46] px-6 py-2.5 text-sm font-black text-white"
              type="button"
            >
              Refresh page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
