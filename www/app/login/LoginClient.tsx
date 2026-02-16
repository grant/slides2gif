'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import useSWR from 'swr';
import {fetcher} from '../../lib/apiFetcher';
import {API_BASE} from '../../lib/api/endpoints';
import {PATHS} from '../../lib/api/definition';
import {APIResUser} from '../../types/user';
import {Routes} from '../../lib/routes';
import {LoadingScreen} from '../../components/LoadingScreen';
import PageLogin from '../../components/login';

export default function LoginClient() {
  const router = useRouter();
  const {data: userData, isValidating: isLoading} = useSWR<APIResUser>(
    `${API_BASE}${PATHS.usersMe}`,
    fetcher
  );

  useEffect(() => {
    if (userData?.isLoggedIn) {
      router.push(Routes.DASHBOARD);
    }
  }, [userData, router]);

  if (isLoading) {
    return <LoadingScreen fullScreen message="Loading..." />;
  }

  if (userData?.isLoggedIn) {
    return <LoadingScreen fullScreen message="Redirecting..." />;
  }

  return <PageLogin />;
}
