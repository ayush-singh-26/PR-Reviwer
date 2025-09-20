import React from "react";

export default function App() {
  const connect = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    window.location.href = `${backendUrl}/auth/github`;
  };

  return (
    <div className="p-6">
      <h2 className="text-xl mb-4">Auto PR Reviewer</h2>
      <button
        onClick={connect}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        Connect GitHub
      </button>
    </div>
  );
}
