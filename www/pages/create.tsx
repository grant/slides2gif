import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageCreate from '../components/create';
// import useUser from '../lib/useUser';
import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// export async function getServerSideProps() {
//   const fetcher = (url: string) => fetch(url).then(r => r.json());

//   // const { data, error } = useSWR('/api/data', fetcher);

//   const data = await fetcher('http://localhost:3000/api/user');

//   console.log('data');
//   console.log(data);
//   // const data = await fetcher('/api/user');
//   return {
//     props: {
//       data,
//     }
//   }
// }

export default function Create(props) {
  console.log('props');
  console.log(props);

  const {data, error} = useSWR('http://localhost:3000/api/user', fetcher);
  console.log('data, error');
  console.log(data, error);

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageCreate currentPageType="CREATE" />
    </Layout>
  );
}
