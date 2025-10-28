// @ts-nocheck
import React from "react";

export default function AppHeader() {
  return (
    <header
      className="sticky top-0 z-50 h-[64px] flex items-center px-4
                 backdrop-blur-md bg-white/70 border-b border-black/5"
      role="banner"
      aria-label="App Header"
    >
      <img
        src="/favicon.png"
        alt="lil-T"
        className="h-14 w-14 rounded-xl shadow-md"
        draggable={false}
      />
    </header>
  );
}
