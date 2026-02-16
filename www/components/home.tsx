import React from 'react';
import Logo from './Logo';
import YellowPageLayout from './YellowPageLayout';

export default function PageHome() {
  return (
    <YellowPageLayout>
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Logo />
          <a href="/create">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-lg font-bold text-slate-900 shadow-lg shadow-amber-900/20 transition-all duration-200 hover:bg-slate-50 hover:shadow-xl hover:shadow-amber-900/25 active:scale-[0.98]"
            >
              <span className="material-icons align-bottom text-xl">add</span>{' '}
              Create GIF
            </button>
          </a>
        </header>

        {/* Main Content */}
        <main className="flex min-h-[calc(100vh-120px)] flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
          <h1 className="mb-12 text-5xl font-bold leading-tight text-slate-900 drop-shadow-sm md:text-7xl lg:text-8xl [text-shadow:0_1px_2px_rgba(0,0,0,0.08)]">
            Create animated GIFs
            <br />
            from Google Slides
          </h1>

          <div className="mx-auto mt-16 w-full max-w-6xl rounded-2xl border border-amber-800/30 bg-white p-8 shadow-2xl shadow-amber-950/30 sm:p-10">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold text-slate-900">
                  Why Slides2Gif?
                </h2>
                <p className="text-lg leading-relaxed text-slate-700">
                  Transform your Google Slides presentations into shareable
                  animated GIFs. Perfect for social media, documentation, or
                  quick demonstrations.
                </p>
                <p className="text-lg leading-relaxed">
                  <a
                    href="/create"
                    className="font-semibold text-amber-900 underline decoration-amber-700/50 hover:text-amber-950 hover:decoration-amber-800"
                  >
                    Get started →
                  </a>
                </p>
              </div>

              <div className="space-y-4 text-left">
                <h2 className="text-2xl font-bold text-slate-900">
                  How it works
                </h2>
                <p className="text-lg leading-relaxed text-slate-700">
                  Simply connect your Google account, select your presentation,
                  and customize your GIF settings. We handle the rest and provide
                  you with a private download link.
                </p>
                <p className="text-lg leading-relaxed">
                  <a
                    href="/howitworks"
                    className="font-semibold text-amber-900 underline decoration-amber-700/50 hover:text-amber-950 hover:decoration-amber-800"
                  >
                    Learn more →
                  </a>
                </p>
              </div>
            </div>
          </div>

          <footer className="mt-16 pb-6 text-center text-xs text-white/80">
            <a href="/privacy" className="hover:text-white">
              Privacy
            </a>
            {' · '}
            <a href="/terms" className="hover:text-white">
              Terms
            </a>
            {' · '}
            <a
              href="mailto:slides2gif@googlegroups.com"
              className="hover:text-white"
            >
              Contact
            </a>
          </footer>
        </main>
    </YellowPageLayout>
  );
}
