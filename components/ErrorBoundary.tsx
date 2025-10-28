"use client";
import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string; stack?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(err: any): State {
    return { hasError: true, message: String(err?.message ?? err), stack: String(err?.stack ?? "") };
  }
  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error("[lil-T] Client error:", error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Client-Fehler in lil-T</h2>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.9 }}>
          {this.state.message}
          {this.state.stack ? "\n\n" + this.state.stack : ""}
        </div>
      </div>
    );
  }
}
