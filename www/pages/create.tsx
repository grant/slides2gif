import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageCreate from '../components/create';
// import useUser from '../lib/useUser';
import useSWR from 'swr';
import React from 'react';

// const fetcher = (...args) => fetch(...args).then(res => res.json());

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
  const { data, error } = useSWR('/api/user', fetcher)
  if (error) return <div>todo: failed to load</div>
  if (!data) return <div>todo: loading...</div>

  // Redirect to login page
  if (!data.isLoggedIn) {
    window.location.href = '/login';
    return <div>Redirecting...</div>
  }

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageCreate
        currentPageType="CREATE"
        userData={data}
        />
    </Layout>
  );
}
