import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import SectionHome from '../components/home';
// import SectionAbout from './home/section/about';
// import SectionProjects from './home/section/projects';
// import SectionExperience from './home/section/experience';
// import SectionFooter from './home/section/footer';

export default function Home() {
  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <SectionHome />
      nice main
    </Layout>
  );
}
