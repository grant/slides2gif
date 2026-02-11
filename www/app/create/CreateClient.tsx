'use client';

import DashboardLayout from '../../components/DashboardLayout';
import {PageCreate} from '../../components/create';
import {useAuth} from '../../lib/useAuth';
import {LoadingScreen} from '../../components/LoadingScreen';

export default function CreateClient() {
  const {userData: data, error, isLoading} = useAuth();

  if (error) {
    console.error('Error loading user:', error);
    return (
      <div className="p-5">Failed to load user data. Please try again.</div>
    );
  }

  if (isLoading || !data) {
    return <LoadingScreen fullScreen message="Loading..." />;
  }

  if (!data.isLoggedIn) {
    return (
      <div className="p-5">Redirecting to login...</div>
    );
  }

  return (
    <DashboardLayout activeTab="create">
      <div className="p-8">
        <PageCreate currentPageType="CREATE" user={data} />
      </div>
    </DashboardLayout>
  );
}
