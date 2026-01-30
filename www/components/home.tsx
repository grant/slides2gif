import React from 'react';
import Logo from './Logo';

export default function PageHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Logo />
        <a href="/create">
          <button className="cursor-pointer rounded bg-blue px-5 py-3.5 text-lg font-bold text-white shadow-[0_5px_10px_rgba(55,55,55,0.12)] opacity-95 transition-colors duration-200 hover:bg-blue/90">
            <span className="material-icons align-bottom">add</span> Create GIF
          </button>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-8 py-16 text-center text-[rgb(20,30,50)]">
        {/* Title */}
        <h1 className="mb-12 text-6xl font-bold leading-tight md:text-7xl lg:text-8xl">
          Create animated GIFs
          <br />
          from Google Slides
        </h1>

        {/* Two Column Layout */}
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold">Why Slides2Gif?</h2>
            <p className="text-lg leading-relaxed">
              Transform your Google Slides presentations into shareable animated
              GIFs. Perfect for social media, documentation, or quick
              demonstrations.
            </p>
            <p className="text-lg leading-relaxed">
              <a
                href="/create"
                className="font-semibold text-blue-600 underline hover:text-blue-700"
              >
                Get started →
              </a>
            </p>
          </div>

          {/* Right Column */}
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold">How it works</h2>
            <p className="text-lg leading-relaxed">
              Simply connect your Google account, select your presentation, and
              customize your GIF settings. We handle the rest and provide you
              with a private download link.
            </p>
            <p className="text-lg leading-relaxed">
              <a
                href="/howitworks"
                className="font-semibold text-blue-600 underline hover:text-blue-700"
              >
                Learn more →
              </a>
            </p>
          </div>
        </div>

        {/* Footer with privacy policy link (required for Google OAuth verification) */}
        <footer className="mt-16 pb-6 text-center text-xs text-[rgb(20,30,50)]/40">
          <a href="/privacy" className="hover:text-[rgb(20,30,50)]/60">
            Privacy
          </a>
          {' · '}
          <a href="/terms" className="hover:text-[rgb(20,30,50)]/60">
            Terms
          </a>
        </footer>
      </main>
    </div>
  );
}
