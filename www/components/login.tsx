/**
 * Login page – Google Slides yellow, clean card, bold typography.
 */

import Logo from './Logo';
import YellowPageLayout from './YellowPageLayout';

export default function PageSignin() {
  const signInClick = () => {
    window.location.href = `${window.location.origin}/api/oauth2`;
  };

  return (
    <YellowPageLayout>
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-amber-800/30 bg-white p-8 shadow-2xl shadow-amber-950/30 sm:p-10">
            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Sign in to get started
            </h1>
            <p className="mt-3 text-center text-sm text-slate-600 sm:text-base">
              Connect Google to create animated GIFs from your Slides
            </p>

            <button
              type="button"
              onClick={signInClick}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-medium text-slate-900 shadow-lg shadow-amber-900/20 transition-all duration-200 hover:bg-slate-50 hover:shadow-xl hover:shadow-amber-900/25 active:scale-[0.98]"
              style={{fontFamily: "'Roboto', sans-serif", fontWeight: 500}}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  d="M17.64 9.2045c0-.6371-.0573-1.2496-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.9636 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71L.9573 4.9588C.3477 6.1731 0 7.5477 0 9s.348 2.8269.957 4.0412l3.0066-2.3312z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9588L3.9636 7.29C4.6714 5.1627 6.6556 3.5795 9 3.5795z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <p className="mt-6 text-center text-xs text-slate-500">
              We only access your profile and the presentations you choose.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-white drop-shadow-sm">
            Your data stays private and is not shared.
          </p>
        </div>
      </main>
    </YellowPageLayout>
  );
}
