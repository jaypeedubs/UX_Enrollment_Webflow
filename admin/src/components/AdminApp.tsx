import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';
import { Header } from './Header';
import { ApplicationsPage } from './ApplicationsPage';
import { DashboardPage } from './DashboardPage';
import { ProgramsPage } from './ProgramsPage';

type Route = 'dashboard' | 'applications' | 'programs';

function getRoute(): Route {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname;
  if (path.includes('/applications')) return 'applications';
  if (path.includes('/programs')) return 'programs';
  return 'dashboard';
}

export function AdminApp() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    function handlePopState() {
      setRoute(getRoute());
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(e: React.MouseEvent<HTMLAnchorElement>, to: Route) {
    e.preventDefault();
    const path = to === 'applications' ? '/admin/applications'
               : to === 'programs'      ? '/admin/programs'
               : '/admin';
    history.pushState(null, '', path);
    setRoute(to);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <nav className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-6">
          <a
            href="/admin"
            onClick={(e) => navigate(e, 'dashboard')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              route === 'dashboard'
                ? 'border-[#123161] text-[#123161]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </a>
          <a
            href="/admin/applications"
            onClick={(e) => navigate(e, 'applications')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              route === 'applications'
                ? 'border-[#123161] text-[#123161]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Applications
          </a>
          <a
            href="/admin/programs"
            onClick={(e) => navigate(e, 'programs')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              route === 'programs'
                ? 'border-[#123161] text-[#123161]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Programs
          </a>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-hidden">
        {route === 'dashboard'    && <DashboardPage />}
        {route === 'applications' && <ApplicationsPage />}
        {route === 'programs'     && <ProgramsPage />}
      </main>
    </div>
  );
}
