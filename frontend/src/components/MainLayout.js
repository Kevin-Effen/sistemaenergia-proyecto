import React from "react";
import Navbar from "./Navbar";

export default function MainLayout({ children }) {
  return (
    <div style={{display: 'flex', minHeight: '100vh', background: '#f3f6fb'}}>
      <Navbar />
      <main style={{flex: 1, padding: '32px 0 0 0', marginLeft: '260px', minHeight: '100vh'}}>
        {children}
      </main>
    </div>
  );
}
