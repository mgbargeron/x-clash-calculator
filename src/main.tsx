import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

type FatalErrorDetails = {
  message: string;
  stack?: string;
};

type FatalErrorBoundaryState = {
  error: FatalErrorDetails | null;
};

function getErrorDetails(error: unknown): FatalErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Unknown renderer error",
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown renderer error",
  };
}

function renderFatalDocument(details: FatalErrorDetails) {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  rootElement.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#10131d;color:#f5f7ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <section style="width:min(760px,100%);padding:24px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);">
        <h1 style="margin:0 0 12px;font-size:1.1rem;">Renderer startup failed</h1>
        <p style="margin:0 0 12px;color:#c8d4ff;">${details.message}</p>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#9db1ff;">${details.stack ?? ""}</pre>
      </section>
    </main>
  `;
}

class FatalErrorBoundary extends Component<{ children: ReactNode }, FatalErrorBoundaryState> {
  state: FatalErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): FatalErrorBoundaryState {
    return { error: getErrorDetails(error) };
  }

  componentDidCatch(error: unknown) {
    console.error("Fatal renderer error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#10131d",
            color: "#f5f7ff",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <section
            style={{
              width: "min(760px, 100%)",
              padding: 24,
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h1 style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>Renderer startup failed</h1>
            <p style={{ margin: "0 0 12px", color: "#c8d4ff" }}>{this.state.error.message}</p>
            {this.state.error.stack ? (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#9db1ff",
                }}
              >
                {this.state.error.stack}
              </pre>
            ) : null}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  if (!event.error) return;
  renderFatalDocument(getErrorDetails(event.error));
});

window.addEventListener("unhandledrejection", (event) => {
  renderFatalDocument(getErrorDetails(event.reason));
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root mount element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <FatalErrorBoundary>
      <App />
    </FatalErrorBoundary>
  </React.StrictMode>
);
