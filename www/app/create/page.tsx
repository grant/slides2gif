import Layout from '../../components/layout';
import {siteTitle} from '../../components/layout';
import CreateClient from './CreateClient';

export const metadata = {
  title: `Create - ${siteTitle}`,
};

export default function Create() {
  return (
    <Layout>
      <CreateClient />
    </Layout>
  );
}
