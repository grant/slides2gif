import Head from 'next/head';
import styles from './layout.module.scss';

export const siteTitle = 'slides2gif';

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className={styles.container}>
      {/* https://google.github.io/material-design-icons/ */}
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <Head>
        <link rel="icon" href="/favicon.ico" />
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
