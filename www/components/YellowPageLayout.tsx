import React from 'react';

/** Yellow/amber brand gradient + subtle grid. Use for login, home, howitworks. */
const BRAND_GRADIENT =
  'linear-gradient(180deg, #F9AB00 0%, #F59E0B 25%, #D97706 60%, #B45309 100%)';

interface YellowPageLayoutProps {
  children: React.ReactNode;
}

export default function YellowPageLayout({children}: YellowPageLayoutProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{background: BRAND_GRADIENT}}
    >
      <div
        className="absolute inset-0 bg-brand-grid bg-[length:4rem_4rem]"
        aria-hidden
      />
      <div className="relative flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
