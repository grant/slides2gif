import {useEffect} from 'react';
import {useRouter} from 'next/router';
import useSWR from 'swr';
import {APIResUser} from '../types/user';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return res.json();
};

/**
 * Hook to check authentication and redirect to login if not logged in
 * @returns {Object} { userData, error, isLoading } - User data, error, and loading state
 */
export function useAuth() {
  const router = useRouter();
  const {
    data: userData,
    error,
    isValidating: isLoading,
  } = useSWR<APIResUser>('/api/user', fetcher);

  useEffect(() => {
    // Only redirect if we have data and user is not logged in
    if (userData && !userData.isLoggedIn) {
      router.push('/login');
    }
  }, [userData, router]);

  return {
    userData,
    error,
    isLoading,
    isAuthenticated: userData?.isLoggedIn === true,
  };
}
