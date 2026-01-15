import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import {PageCreate} from '../components/create';
// import useUser from '../lib/useUser';
import useSWR from 'swr';
import React from 'react';
import {APIResUser} from '../types/user';

const fetcher = async (url) => {
  const res = await fetch(url);

  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    // Attach extra info to the error object.
    // error.info = await res.json();
    // error.status = res.status;
    throw error;
  }

  return res.json();
};

export default function Create(props) {
  const { data, error } = useSWR<APIResUser>('/api/user', fetcher);
  console.log('User data:', { error, data, isLoggedIn: data?.isLoggedIn });
  
  if (error) {
    console.error('Error loading user:', error);
    return <div className="p-5">Failed to load user data. Please try again.</div>
  }
  if (!data) {
    return <div className="p-5">Loading...</div>
  }

  // Redirect to login page
  if (!data.isLoggedIn) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return <div className="p-5">Redirecting to login...</div>
  }

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageCreate
        currentPageType="CREATE"
        user={data}
        />
    </Layout>
  );
}
