import Layout from '../../components/layout';
import {siteTitle} from '../../components/layout';
import Logo from '../../components/Logo';

export const metadata = {
  title: `Terms of Service - ${siteTitle}`,
  description: 'Terms of Service for Slides2Gif',
};

export default function Terms() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="mb-6 text-4xl font-bold text-[rgb(20,30,50)]">
          Terms of Service
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          Last updated: January 28, 2026
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              1. Acceptance of Terms
            </h2>
            <p className="mb-4 text-gray-700">
              By accessing and using Slides2Gif (&quot;the Service&quot;), you accept and
              agree to be bound by the terms and provision of this agreement. If
              you do not agree to these Terms of Service, please do not use the
              Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              2. Description of Service
            </h2>
            <p className="mb-4 text-gray-700">
              Slides2Gif is a web application that allows users to create
              animated GIFs from Google Slides presentations. The Service:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Reads your Google Slides presentations (read-only access)</li>
              <li>Generates thumbnails of your slides</li>
              <li>Creates animated GIFs from selected slides</li>
              <li>Stores generated GIFs in Google Cloud Storage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              3. User Accounts and Authentication
            </h2>
            <p className="mb-4 text-gray-700">To use the Service, you must:</p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Have a valid Google account</li>
              <li>Grant the Service permission to access your Google Slides</li>
              <li>Provide accurate account information</li>
              <li>Maintain the security of your account</li>
            </ul>
            <p className="mb-4 text-gray-700">
              You are responsible for all activities that occur under your
              account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              4. Permissions and Data Access
            </h2>
            <p className="mb-4 text-gray-700">
              By using the Service, you grant Slides2Gif the following
              permissions:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>
                <strong>Read-only access</strong> to your Google Slides
                presentations
              </li>
              <li>
                <strong>Read-only access</strong> to Google Drive metadata
              </li>
              <li>
                <strong>Read-only access</strong> to your Google profile
                information
              </li>
            </ul>
            <p className="mb-4 text-gray-700">
              The Service does not modify, delete, or share your Google Slides
              presentations. We only read the data necessary to generate GIFs.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              5. Acceptable Use
            </h2>
            <p className="mb-4 text-gray-700">You agree not to:</p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>
                Attempt to gain unauthorized access to the Service or its
                systems
              </li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to violate any laws or regulations</li>
              <li>
                Create GIFs containing illegal, harmful, or offensive content
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              6. Service Availability
            </h2>
            <p className="mb-4 text-gray-700">
              We strive to provide reliable service but do not guarantee that
              the Service will be available at all times. The Service may be
              subject to:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Scheduled maintenance</li>
              <li>Unplanned outages</li>
              <li>Google API rate limits</li>
              <li>Third-party service dependencies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              7. Intellectual Property
            </h2>
            <p className="mb-4 text-gray-700">
              You retain all rights to your Google Slides content. Generated
              GIFs are your property. Slides2Gif does not claim ownership of
              your content or generated GIFs.
            </p>
            <p className="mb-4 text-gray-700">
              The Slides2Gif service, including its design, code, and
              functionality, is protected by copyright and other intellectual
              property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              8. Limitation of Liability
            </h2>
            <p className="mb-4 text-gray-700">
              Slides2Gif is provided &quot;as is&quot; without warranties of any kind. We
              are not liable for:
            </p>
            <ul className="mb-4 list-disc pl-6 text-gray-700">
              <li>Loss or corruption of data</li>
              <li>Service interruptions or downtime</li>
              <li>Errors in generated GIFs</li>
              <li>Any indirect or consequential damages</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              9. Termination
            </h2>
            <p className="mb-4 text-gray-700">
              You may stop using the Service at any time by revoking access in
              your Google Account settings. We reserve the right to suspend or
              terminate access to the Service for violations of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              10. Changes to Terms
            </h2>
            <p className="mb-4 text-gray-700">
              We may modify these Terms of Service at any time. Continued use of
              the Service after changes constitutes acceptance of the modified
              terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-[rgb(20,30,50)]">
              11. Contact Information
            </h2>
            <p className="mb-4 text-gray-700">
              For questions about these Terms of Service, please contact us at:{' '}
              <a
                href="mailto:support@slides2gif.com"
                className="text-blue-600 hover:underline"
              >
                support@slides2gif.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
