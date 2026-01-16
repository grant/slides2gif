import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import { PageCreate } from "../components/create";
import { useAuth } from "../lib/useAuth";

export default function Create(props) {
  // Check authentication - will redirect to login if not authenticated
  const { userData: data, error, isLoading } = useAuth();

  if (error) {
    console.error("Error loading user:", error);
    return (
      <Layout>
        <Head>
          <title>{siteTitle}</title>
        </Head>
        <div className="p-5">Failed to load user data. Please try again.</div>
      </Layout>
    );
  }

  if (isLoading || !data) {
    return (
      <Layout>
        <Head>
          <title>{siteTitle}</title>
        </Head>
        <div className="p-5">Loading...</div>
      </Layout>
    );
  }

  // Show redirecting message if not authenticated (useAuth will handle redirect)
  if (!data.isLoggedIn) {
    return (
      <Layout>
        <Head>
          <title>{siteTitle}</title>
        </Head>
        <div className="p-5">Redirecting to login...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageCreate currentPageType="CREATE" user={data} />
    </Layout>
  );
}
