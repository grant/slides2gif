// import {useEffect} from 'react';
// import Router from 'next/router';
import useSWR from 'swr';
// import {GoogleOAuthData} from 'lib/oauth';

import {API_BASE} from './api/endpoints';
import {PATHS} from './api/definition';
import {APIResUser} from 'types/user';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function useUser() {
  const user = useSWR<APIResUser>(`${API_BASE}${PATHS.usersMe}`, fetcher);
  return {user};
}
