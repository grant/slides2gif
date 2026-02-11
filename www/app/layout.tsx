import '../styles/globals.css';
import type {Metadata} from 'next';
import {siteTitle} from '../components/layout';

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s - ${siteTitle}`,
  },
  description: 'Create a GIF from slides',
  alternates: {
    icons: ['/logo.svg'],
  },
  openGraph: {
    title: siteTitle,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
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
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
      </head>
      <body className="h-full w-full overflow-x-hidden">{children}</body>
    </html>
  );
}
