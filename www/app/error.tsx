'use client';

import Link from 'next/link';
import Layout from '../components/layout';
import Logo from '../components/Logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  if (typeof window !== 'undefined') {
    console.error('Application error:', error);
  }
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)]">
        <header className="flex items-center justify-between px-8 py-6">
          <Logo />
        </header>

        <main className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-8 py-16 text-center">
          <h1 className="text-9xl font-black text-white md:text-[12rem] lg:text-[16rem]">
            500
          </h1>
          <p className="mt-8 text-2xl font-semibold text-white">Server error</p>
          <button
            onClick={reset}
            className="mt-8 rounded bg-white/20 px-4 py-2 text-white hover:bg-white/30"
          >
            Try again
          </button>
          <Link
            href="/"
            className="mt-4 text-lg text-white underline hover:text-white/80"
          >
            Go back home →
          </Link>
        </main>
      </div>
    </Layout>
  );
}
