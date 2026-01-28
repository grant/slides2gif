import React, {useState} from 'react';
import {useRouter} from 'next/router';
import Logo from './Logo';
import {Routes} from '../lib/routes';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'create';
  initialCollapsed?: boolean;
}

export default function DashboardLayout({
  children,
  activeTab = 'dashboard',
  initialCollapsed = false,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {method: 'POST'});
      if (response.ok) {
        // Use window.location.href for a full page reload to clear all cached state
        window.location.href = Routes.LOGIN;
      } else {
        // Still redirect even if API call fails
        window.location.href = Routes.LOGIN;
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      window.location.href = Routes.LOGIN;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo and Collapse Toggle */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col items-center gap-2">
            {isCollapsed ? (
              <button
                onClick={() => router.push(Routes.DASHBOARD)}
                className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm"
                aria-label="Go to Dashboard"
              >
                <span className="text-xl font-black text-[rgb(20,30,50)]">
                  s2g
                </span>
              </button>
            ) : (
              <div className="flex w-full items-center justify-between">
                <Logo onClick={() => router.push(Routes.DASHBOARD)} />
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="rounded p-1 text-gray-600 hover:bg-gray-100"
                  aria-label="Collapse sidebar"
                >
                  <span className="material-icons">chevron_left</span>
                </button>
              </div>
            )}
            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="rounded p-1 text-gray-600 hover:bg-gray-100"
                aria-label="Expand sidebar"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-2 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <button
            onClick={() => router.push(Routes.DASHBOARD)}
            className={`flex w-full items-center transition-colors ${
              isCollapsed
                ? 'h-12 justify-center rounded p-2'
                : 'gap-2 rounded-lg px-6 py-4 text-left text-lg font-bold'
            } ${
              activeTab === 'dashboard'
                ? 'bg-[rgba(255,186,68,1)] text-[rgb(20,30,50)]'
                : 'bg-transparent text-gray-700 hover:bg-gray-100'
            }`}
            title="Dashboard"
          >
            <span className="material-icons text-2xl">dashboard</span>
            {!isCollapsed && <span>Dashboard</span>}
          </button>
          <button
            onClick={() => router.push(Routes.CREATE)}
            className={`flex w-full items-center transition-colors ${
              isCollapsed
                ? 'h-12 justify-center rounded p-2'
                : 'gap-2 rounded-lg px-6 py-4 text-left text-lg font-bold'
            } ${
              activeTab === 'create'
                ? 'bg-[rgba(255,186,68,1)] text-[rgb(20,30,50)]'
                : 'bg-transparent text-gray-700 hover:bg-gray-100'
            }`}
            title="Create GIF"
          >
            <span className="material-icons text-2xl">add</span>
            {!isCollapsed && <span>Create GIF</span>}
          </button>
        </nav>

        {/* Logout */}
        <div
          className={`border-t border-gray-200 ${isCollapsed ? 'p-2' : 'p-4'}`}
        >
          <button
            onClick={handleLogout}
            className={`flex w-full items-center transition-colors hover:bg-gray-100 ${
              isCollapsed
                ? 'h-12 justify-center rounded p-2'
                : 'gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium'
            } text-gray-700`}
            title="Logout"
          >
            <span className="material-icons align-middle text-base">
              logout
            </span>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
