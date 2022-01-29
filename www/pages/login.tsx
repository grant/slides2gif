import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageLogin from '../components/login';
import useUser from '../lib/useUser';

export async function getServerSideProps({req, res}) {
  return {
    props: {},
  };
}

export default function Login(props) {
  console.log('LOGIN');

  const {user} = useUser();

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageLogin />
    </Layout>
  );
}
