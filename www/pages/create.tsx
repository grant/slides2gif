import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageCreate from '../components/create';

export default function Create() {
  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageCreate />
    </Layout>
  );
}
