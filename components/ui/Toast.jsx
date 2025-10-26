import React, { useEffect } from "react";

export default function Toast({ message, onClose, duration = 2000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        background: "#22c55e", // vert tailwind success
        color: "white",
        padding: "12px 24px",
        borderRadius: 8,
        boxShadow: "0 4px 32px rgba(0,0,0,0.13)",
        fontWeight: "bold",
        fontSize: "1rem",
        zIndex: 9999,
      }}
    >
      {message}
    </div>
  );
}
