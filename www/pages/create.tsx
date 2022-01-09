import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageCreate from '../components/create';
import { useSession, getSession } from 'next-auth/react'

// import { getSession } from "next-auth/client"

import nextSession from "next-session";
import { IronSessionOptions } from 'iron-session';

// export async function getServerSideProps(context) {
//   console.log('context.req:');
//   console.log(context.req.session);
//   return {
//     props: {
//       foo: 'bar'
//     }, // will be passed to the page component as props
//   }
// }

export async function getServerSideProps(context) {
  return {
    props: {
      session: await getSession(context)
    }
  }
}

export default function Create(props) {
  const { data: session, status } = useSession();
	const loading = status === 'loading';

  console.log('status');
  console.log(status);

  // console.log('Passed props:');
  // console.log(props);
  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageCreate currentPageType="CREATE" />
    </Layout>
  );
}
