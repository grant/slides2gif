/**
 * The page for Google sign-in.
 */

import Logo from './Logo';

export default function PageSignin() {
  // An OAuth permission
  type Permission = {
    icon: string;
    id: string;
    description: string;
  };

  const PERMISSIONS: Permission[] = [
    {
      id: 'userinfo.profile',
      icon: 'account_circle',
      description: 'Read public profile, for storing user ID',
    },
    {
      id: 'drive.file',
      icon: 'folder_open',
      description:
        'Access only the presentations you select (via Google Picker)',
    },
  ];

  // Handler for when the user clicks. Use current origin so it works on prod (e.g. https://slides2gif.com) and localhost.
  const signInClick = () => {
    const authUrl = `${window.location.origin}/api/oauth2`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Logo />
      </header>

      {/* Main Content - Centered */}
      <main className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-8 py-8">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold text-[rgb(20,30,50)] md:text-4xl">
              Sign in to get started
            </h1>
            <p className="text-base text-[rgb(20,30,50)]/80 md:text-lg">
              Connect your Google account to create animated GIFs from your
              Slides presentations
            </p>
          </div>

          {/* Sign In Card */}
          <div className="mx-auto w-full rounded-2xl bg-white/95 p-8 shadow-xl backdrop-blur-sm">
            {/* Google Sign In Button - Following Google Branding Guidelines */}
            <button
              className="mb-6 w-full cursor-pointer rounded-lg border border-[#747775] bg-white px-3 py-3 text-sm font-medium text-[#1F1F1F] shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md"
              onClick={signInClick}
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: '14px',
                lineHeight: '20px',
                fontWeight: 500,
              }}
            >
              <span className="flex items-center justify-center gap-3">
                {/* Google G Logo */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0"
                >
                  <g fill="none" fillRule="evenodd">
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
                  </g>
                </svg>
                <span>Sign in with Google</span>
              </span>
            </button>

            {/* Permissions Info - Subtle */}
            <div className="border-t border-gray-200 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Permissions requested:
              </p>
              <ul className="space-y-1.5">
                {PERMISSIONS.map(p => {
                  return (
                    <li
                      key={p.id}
                      className="flex items-start gap-2 text-xs text-gray-600"
                    >
                      <span className="material-icons mt-0.5 text-sm text-gray-400">
                        {p.icon}
                      </span>
                      <div className="flex-1">
                        <code className="font-mono text-[10px] font-semibold text-gray-700">
                          {p.id}
                        </code>
                        <span className="ml-1 text-[10px]">
                          {p.description}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Footer Note */}
          <p className="mt-6 whitespace-nowrap text-center text-xs text-[rgb(20,30,50)]/60">
            Your data is secure and private. We only access what's needed.
          </p>
        </div>
      </main>
    </div>
  );
}
