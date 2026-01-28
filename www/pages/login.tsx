import Head from 'next/head';
import {GetServerSidePropsContext} from 'next';
import Layout, {siteTitle} from '../components/layout';
import PageLogin from '../components/login';
import useUser from '../lib/useUser';

export async function getServerSideProps(_context: GetServerSidePropsContext) {
  return {
    props: {},
  };
}

export default function Login(_props: Record<string, never>) {
  console.log('LOGIN');
  console.log(_props);

  const {user} = useUser();
  console.log(user);

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageLogin />
    </Layout>
  );
}
