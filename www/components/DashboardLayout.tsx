import React from 'react';
import {useRouter} from 'next/router';
import Logo from './Logo';
import {Routes} from '../lib/routes';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'create';
}

export default function DashboardLayout({
  children,
  activeTab = 'dashboard',
}: DashboardLayoutProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {method: 'POST'});
      if (response.ok) {
        router.push(Routes.LOGIN);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      router.push(Routes.LOGIN);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="border-b border-gray-200 p-6">
          <Logo onClick={() => router.push(Routes.DASHBOARD)} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <button
            onClick={() => router.push(Routes.CREATE)}
            className={`flex w-full items-center gap-2 rounded-lg px-6 py-4 text-left text-lg font-bold transition-colors ${
              activeTab === 'create'
                ? 'bg-[rgba(255,186,68,1)] text-[rgb(20,30,50)]'
                : 'bg-[rgba(255,186,68,1)] text-[rgb(20,30,50)] hover:bg-[rgba(254,160,3,1)]'
            }`}
          >
            <span className="material-icons text-2xl">add</span>
            Create GIF
          </button>
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <span className="material-icons align-middle text-base">logout</span>{' '}
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
