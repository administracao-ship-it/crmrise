"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: "500",
          boxShadow: "var(--premium-shadow)",
        },
        success: {
          iconTheme: {
            primary: "var(--accent-green)",
            secondary: "white",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--accent-red)",
            secondary: "white",
          },
        },
      }}
    />
  );
}
