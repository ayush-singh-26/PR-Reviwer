import React from "react";

export default function App() {
  const connect = () => {
    window.location.href = '/auth/github';
  };
  return (
    <div className="p-6">
      <h2 className="text-xl mb-4">Auto PR Reviewer</h2>
      <button onClick={connect} className="px-4 py-2 rounded bg-blue-600 text-white">
        Connect GitHub
      </button>
    </div>
  );
}
