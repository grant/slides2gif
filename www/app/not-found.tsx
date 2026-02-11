import Layout from '../components/layout';
import Logo from '../components/Logo';
import {siteTitle} from '../components/layout';

export const metadata = {
  title: `404 - Page Not Found - ${siteTitle}`,
};

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)]">
        <header className="flex items-center justify-between px-8 py-6">
          <Logo />
        </header>

        <main className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-8 py-16 text-center">
          <h1 className="text-9xl font-black text-white md:text-[12rem] lg:text-[16rem]">
            404
          </h1>
          <p className="mt-8 text-2xl font-semibold text-white">
            Page not found
          </p>
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
