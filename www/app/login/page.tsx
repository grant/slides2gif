import Layout from '../../components/layout';
import {siteTitle} from '../../components/layout';
import LoginClient from './LoginClient';

export const metadata = {
  title: `Login - ${siteTitle}`,
};

export default function Login() {
  return (
    <Layout>
      <LoginClient />
    </Layout>
  );
}
