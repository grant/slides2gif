import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Logo from './Logo';
import {Routes} from '../lib/routes';
import {useGooglePicker} from '../lib/hooks/useGooglePicker';
import {LoadingSpinner} from './LoadingSpinner';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'create';
  initialCollapsed?: boolean;
}

function getStoredCollapsed(): boolean | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  if (stored === null) return null;
  return stored === 'true';
}

export default function DashboardLayout({
  children,
  activeTab = 'dashboard',
  initialCollapsed = false,
}: DashboardLayoutProps) {
  const router = useRouter();
  const {openPicker, pickerReady, openingPicker} = useGooglePicker();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [transitionEnabled, setTransitionEnabled] = useState(false);

  useEffect(() => {
    const stored = getStoredCollapsed();
    if (stored !== null) setIsCollapsed(stored);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionEnabled(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const setCollapsed = (value: boolean) => {
    setIsCollapsed(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    }
  };

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
        className={`flex flex-col border-r border-gray-200 bg-white ${
          transitionEnabled ? 'transition-all duration-300' : ''
        } ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Logo and Collapse Toggle */}
        <div
          className={`border-b border-gray-200 ${
            isCollapsed ? 'h-16 p-0' : 'p-4'
          } flex items-center justify-center`}
        >
          <div className="flex flex-col items-center gap-2">
            {isCollapsed ? (
              <button
                onClick={() => setCollapsed(false)}
                className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-white px-3 py-3 shadow-sm transition-all"
                aria-label="Expand sidebar"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xl font-black text-[rgb(20,30,50)] opacity-100 transition-opacity group-hover:opacity-0">
                    s2g
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-icons text-lg text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">
                    chevron_right
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex w-full items-center justify-between">
                <Logo onClick={() => setCollapsed(true)} />
                <button
                  onClick={() => setCollapsed(true)}
                  className="flex items-center rounded p-1 text-gray-600 hover:bg-gray-100"
                  aria-label="Collapse sidebar"
                >
                  <span className="material-icons text-lg">chevron_left</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-2 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <button
            onClick={() => router.push(Routes.DASHBOARD)}
            className={`flex w-full items-center transition-colors ${
              isCollapsed
                ? 'h-14 justify-center rounded p-2'
                : 'gap-2 rounded-lg px-6 py-4 text-left text-lg font-bold'
            } ${
              activeTab === 'dashboard'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-transparent text-gray-700 hover:bg-gray-100'
            }`}
            title="Dashboard"
          >
            <span className="material-icons text-2xl">dashboard</span>
            {!isCollapsed && <span>Dashboard</span>}
          </button>
          <button
            onClick={openPicker}
            disabled={!pickerReady || openingPicker}
            className={`flex w-full items-center transition-colors ${
              isCollapsed
                ? 'h-14 justify-center rounded p-2'
                : 'gap-2 rounded-lg px-6 py-4 text-left text-lg font-bold'
            } bg-[rgba(255,186,68,1)] text-[rgb(20,30,50)] disabled:opacity-60 disabled:cursor-not-allowed`}
            title="Create GIF"
          >
            {openingPicker ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span className="material-icons text-2xl">add</span>
            )}
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
                ? 'h-14 justify-center rounded p-2'
                : 'gap-2 rounded-lg px-4 py-4 text-left text-sm font-medium'
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
