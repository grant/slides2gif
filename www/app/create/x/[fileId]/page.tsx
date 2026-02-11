import Layout from '../../../../components/layout';
import {siteTitle} from '../../../../components/layout';
import CreatePresentationClient from './CreatePresentationClient';

export const metadata = {
  title: `Create - ${siteTitle}`,
};

export default function CreatePresentationPage() {
  return (
    <Layout>
      <CreatePresentationClient />
    </Layout>
  );
}
