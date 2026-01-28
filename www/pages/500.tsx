import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import Logo from '../components/Logo';
import React from 'react';

export default function Custom500() {
  return (
    <Layout>
      <Head>
        <title>500 - Server Error - {siteTitle}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)]">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6">
          <Logo />
        </header>

        {/* Main Content */}
        <main className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-8 py-16 text-center">
          <h1 className="text-9xl font-black text-white md:text-[12rem] lg:text-[16rem]">
            500
          </h1>
          <p className="mt-8 text-2xl font-semibold text-white">Server error</p>
          <a
            href="/"
            className="mt-8 text-lg text-white underline hover:text-white/80"
          >
            Go back home →
          </a>
        </main>
      </div>
    </Layout>
  );
}
