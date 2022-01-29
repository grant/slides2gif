import {useEffect} from 'react';
import Router from 'next/router';
import useSWR from 'swr';
import {GoogleOAuthData} from 'lib/oauth';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function useUser({redirectIfFound = false} = {}) {
  const redirectTo = '/login';

  const user = useSWR('/api/user', fetcher);
  return {user};

  // const { data: user, mutate: mutateUser } = useSWR<GoogleOAuthData>('/api/user');

  // console.log('useUser!');
  // console.log(user);

  // useEffect(() => {
  //   console.log('use eff');
  //   console.log(user);
  //   // if no redirect needed, just return (example: already on /dashboard)
  //   // if user data not yet there (fetch in progress, logged in or not) then don't do anything yet
  //   if (!redirectTo || !user) return;

  //   if (
  //     // If redirectTo is set, redirect if the user was not found.
  //     (redirectTo && !redirectIfFound && !user?.code) ||
  //     // If redirectIfFound is also set, redirect if the user was found
  //     (redirectIfFound && user?.code)
  //   ) {
  //     Router.push(redirectTo);
  //   }
  // }, [user, redirectIfFound, redirectTo]);

  // return { user, mutateUser };
}
