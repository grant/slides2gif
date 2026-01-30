import Head from 'next/head';

export const siteTitle = 'slides2gif';

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="h-full w-full overflow-x-hidden">
      {/* https://google.github.io/material-design-icons/ */}
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <Head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="description" content="Create a GIF from slides" />
        <meta name="og:title" content={siteTitle} />
        <meta name="twitter:card" content="summary_large_image" />
        <GoogleAnalytics />
      </Head>
      {children}
    </div>
  );
}

function GoogleAnalytics() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
      // TODO GA
    `,
      }}
    ></script>
  );
}
