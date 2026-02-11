import Layout from '../../components/layout';
import {siteTitle} from '../../components/layout';
import Logo from '../../components/Logo';

export const metadata = {
  title: `Privacy Policy - ${siteTitle}`,
  description: 'Privacy Policy for Slides2Gif',
};

export default function Privacy() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="mb-6 text-4xl font-bold text-[rgb(20,30,50)]">
          Privacy Policy
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          Last updated: January 28, 2026
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              1. Introduction
            </h2>
            <p className="mb-4 text-gray-700">
              Slides2Gif (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and safeguard your information when you use
              our service to create animated GIFs from Google Slides
              presentations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              2. Information We Collect
            </h2>
            <p className="mb-4 text-gray-700">
              We collect the following information through Google OAuth:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>
                <strong>Profile Information:</strong> Your Google account
                profile information (name, email address) to identify your
                account
              </li>
              <li>
                <strong>Google Slides Data:</strong> Read-only access to your
                Google Slides presentations to generate thumbnails and create
                GIFs
              </li>
              <li>
                <strong>Drive Metadata:</strong> Metadata about your Google
                Slides files (titles, modification dates) to display your
                presentations
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              3. How We Use Your Information
            </h2>
            <p className="mb-4 text-gray-700">
              We use the information we collect solely to:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Authenticate your Google account</li>
              <li>Display your Google Slides presentations</li>
              <li>Generate animated GIFs from your selected slides</li>
              <li>Store generated GIFs in your Google Cloud Storage bucket</li>
            </ul>
            <p className="mb-4 text-gray-700">
              We do not sell, rent, or share your personal information with
              third parties. We do not use your data for advertising or
              marketing purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              4. Data Storage and Security
            </h2>
            <p className="mb-4 text-gray-700">Your data is stored securely:</p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>
                <strong>Session Data:</strong> Encrypted session cookies stored
                locally in your browser
              </li>
              <li>
                <strong>Generated GIFs:</strong> Stored in Google Cloud Storage
                buckets that you control
              </li>
              <li>
                <strong>Slide Thumbnails:</strong> Cached in Google Cloud
                Storage for performance, accessible only to authenticated users
              </li>
            </ul>
            <p className="mb-4 text-gray-700">
              We use industry-standard security measures to protect your
              information, including encrypted connections (HTTPS) and secure
              session management.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              5. Google API Usage
            </h2>
            <p className="mb-4 text-gray-700">
              Slides2Gif uses the following Google APIs:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>
                <strong>Google Slides API:</strong> Read-only access to fetch
                slide thumbnails
              </li>
              <li>
                <strong>Google Drive API:</strong> Read-only access to
                presentation metadata
              </li>
              <li>
                <strong>Google User Info API:</strong> To identify your account
              </li>
            </ul>
            <p className="mb-4 text-gray-700">
              Our use of information received from Google APIs adheres to the
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {' '}
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              6. Your Rights
            </h2>
            <p className="mb-4 text-gray-700">You have the right to:</p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Access your personal information</li>
              <li>Revoke access to your Google account at any time</li>
              <li>Delete your account and associated data</li>
              <li>Request a copy of your data</li>
            </ul>
            <p className="mb-4 text-gray-700">
              To revoke access, visit your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Account permissions page
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              7. Contact Us
            </h2>
            <p className="mb-4 text-gray-700">
              If you have questions about this Privacy Policy, please contact us
              at:{' '}
              <a
                href="mailto:support@slides2gif.com"
                className="text-blue-600 hover:underline"
              >
                support@slides2gif.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              8. Changes to This Policy
            </h2>
            <p className="mb-4 text-gray-700">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
