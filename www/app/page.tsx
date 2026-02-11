import Layout from '../components/layout';
import {siteTitle} from '../components/layout';
import HomeClient from './HomeClient';

export const metadata = {
  title: siteTitle,
};

export default function Home() {
  return (
    <Layout>
      <HomeClient />
    </Layout>
  );
}
