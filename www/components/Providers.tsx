'use client';

import {ToastProvider} from './ToastContext';

export function Providers({children}: {children: React.ReactNode}) {
  return <ToastProvider>{children}</ToastProvider>;
}
