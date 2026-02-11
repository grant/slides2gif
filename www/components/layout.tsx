export const siteTitle = 'slides2gif';

export default function Layout({children}: {children: React.ReactNode}) {
  return <div className="h-full w-full overflow-x-hidden">{children}</div>;
}
