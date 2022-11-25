import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageHome from '../components/home';
import React from 'react';

export default function Home() {
  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageHome />
    </Layout>
  );
}
