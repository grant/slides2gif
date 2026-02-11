import Layout from '../../components/layout';
import {siteTitle} from '../../components/layout';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: `Dashboard - ${siteTitle}`,
};

export default function Dashboard() {
  return (
    <Layout>
      <DashboardClient />
    </Layout>
  );
}
