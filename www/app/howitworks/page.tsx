import Layout from '../../components/layout';
import {siteTitle} from '../../components/layout';
import HowItWorksClient from './HowItWorksClient';

export const metadata = {
  title: `How It Works - ${siteTitle}`,
};

export default function HowItWorks() {
  return (
    <Layout>
      <HowItWorksClient />
    </Layout>
  );
}
