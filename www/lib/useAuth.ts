import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import useSWR from 'swr';
import {APIResUser} from '../types/user';
import {Routes} from './routes';
import {API_BASE} from './api/endpoints';
import {PATHS} from './api/definition';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return res.json();
};

export function useAuth() {
  const router = useRouter();
  const {
    data: userData,
    error,
    isValidating: isLoading,
  } = useSWR<APIResUser>(`${API_BASE}${PATHS.usersMe}`, fetcher);

  useEffect(() => {
    // Only redirect if we have data and user is not logged in
    if (userData && !userData.isLoggedIn) {
      router.push(Routes.LOGIN);
    }
  }, [userData, router]);

  return {
    userData,
    error,
    isLoading,
    isAuthenticated: userData?.isLoggedIn === true,
  };
}
