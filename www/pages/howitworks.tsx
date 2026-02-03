import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import Logo from '../components/Logo';
import React, {useEffect} from 'react';

export default function HowItWorks() {
  useEffect(() => {
    // Load and initialize Mermaid
    const loadMermaid = async () => {
      // Check if already loaded
      if ((window as any).mermaid) {
        (window as any).mermaid.initialize({startOnLoad: true});
        return;
      }

      // Load script
      return new Promise<void>(resolve => {
        const script = document.createElement('script');
        script.src =
          'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.async = true;
        script.onload = () => {
          if ((window as any).mermaid) {
            (window as any).mermaid.initialize({
              startOnLoad: true,
              theme: 'default',
            });
          }
          resolve();
        };
        document.head.appendChild(script);
      });
    };

    loadMermaid();
  }, []);

  return (
    <Layout>
      <Head>
        <title>{`How It Works - ${siteTitle}`}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)]">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6">
          <Logo />
        </header>

        <div className="px-8 py-16">
          <div className="mx-auto max-w-6xl">
            <h1 className="mb-8 text-center text-5xl font-bold text-[rgb(20,30,50)]">
              How It Works
            </h1>
            <p className="mb-12 text-center text-xl text-[rgb(20,30,50)]">
              Technical architecture and flow for engineers
            </p>

            <div className="mb-12 rounded-lg bg-white/90 p-8 shadow-lg">
              <h2 className="mb-6 text-3xl font-bold text-[rgb(20,30,50)]">
                System Architecture
              </h2>
              <div className="mermaid">
                {`graph TB
    User["User Browser"] -->|"1. Select Slides and Generate"| Frontend["Next.js Frontend"]
    Frontend -->|"2. POST /api/generate-gif"| API["API Route<br/>/api/generate-gif"]
    
    API -->|"3. Authenticate"| OAuth["Google OAuth<br/>Access Token"]
    OAuth -->|"4. Fetch Thumbnails"| SlidesAPI["Google Slides API<br/>getThumbnail"]
    
    SlidesAPI -->|"5. Thumbnail URLs"| API
    API -->|"6. Cache Images"| GCS["Google Cloud Storage<br/>presentations/id/slides/"]
    
    API -->|"7. GET /createGif<br/>with Bearer Token"| PNG2GIF["png2gif Service<br/>Express + Cloud Run"]
    
    PNG2GIF -->|"8. Download Images"| GCS
    GCS -->|"9. PNG/JPG Files"| PNG2GIF
    
    PNG2GIF -->|"10. Convert to GIF<br/>gifencoder + canvas"| GIFLib["GIF Library<br/>gifencoder + png-file-stream"]
    GIFLib -->|"11. Generated GIF"| PNG2GIF
    
    PNG2GIF -->|"12. Upload GIF"| GCS
    GCS -->|"13. Public URL"| PNG2GIF
    PNG2GIF -->|"14. Return GCS Path"| API
    API -->|"15. Return GIF URL"| Frontend
    Frontend -->|"16. Display GIF"| User
    
    style User fill:#fff4e6,color:#141e32
    style Frontend fill:#ffba44,color:#141e32
    style API fill:#fea003,color:#fff
    style OAuth fill:#fff8f0,color:#141e32
    style SlidesAPI fill:#ffba44,color:#141e32
    style GCS fill:#fea003,color:#fff
    style PNG2GIF fill:#ff9500,color:#fff
    style GIFLib fill:#ffba44,color:#141e32`}
              </div>
            </div>

            <div className="mb-12 rounded-lg bg-white/90 p-8 shadow-lg">
              <h2 className="mb-6 text-3xl font-bold text-[rgb(20,30,50)]">
                Key Components
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-[rgb(20,30,50)]">
                    1. Frontend (Next.js)
                  </h3>
                  <p className="text-[rgb(20,30,50)]">
                    React-based UI where users select slides and configure GIF
                    options (delay, quality, repeat). Makes API calls to
                    generate GIFs.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-xl font-semibold text-[rgb(20,30,50)]">
                    2. API Route (/api/generate-gif)
                  </h3>
                  <p className="text-[rgb(20,30,50)]">
                    Next.js API route that handles authentication, fetches slide
                    thumbnails from Google Slides API, caches them in Google
                    Cloud Storage, and orchestrates the GIF generation by
                    calling the png2gif service.
                  </p>
                  <ul className="ml-6 mt-2 list-disc text-[rgb(20,30,50)]">
                    <li>Uses Google OAuth2 for authentication</li>
                    <li>
                      Calls Google Slides API: presentations.pages.getThumbnail
                    </li>
                    <li>
                      Caches thumbnails in GCS with size suffixes (_small,
                      _medium, _large)
                    </li>
                    <li>
                      Authenticates requests to png2gif service using Google
                      Auth ID tokens
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xl font-semibold text-[rgb(20,30,50)]">
                    3. png2gif Service (Express)
                  </h3>
                  <p className="text-[rgb(20,30,50)]">
                    Separate Express.js service deployed on Cloud Run that
                    handles the actual GIF generation. Downloads cached images
                    from GCS, converts them to a GIF, and uploads the result
                    back to GCS.
                  </p>
                  <ul className="ml-6 mt-2 list-disc text-[rgb(20,30,50)]">
                    <li>
                      <strong>Libraries:</strong> gifencoder, png-file-stream,
                      canvas
                    </li>
                    <li>
                      Downloads images from GCS matching the requested thumbnail
                      size
                    </li>
                    <li>
                      Creates GIF with configurable delay, quality (1-20), and
                      repeat settings
                    </li>
                    <li>
                      Uploads generated GIF to GCS and returns the public URL
                    </li>
                    <li>
                      Uses service-to-service authentication in production
                      (Cloud Run)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xl font-semibold text-[rgb(20,30,50)]">
                    4. Google Cloud Storage
                  </h3>
                  <p className="text-[rgb(20,30,50)]">
                    Stores cached slide thumbnails and generated GIFs.
                    Thumbnails are cached to reduce API calls and improve
                    performance.
                  </p>
                  <ul className="ml-6 mt-2 list-disc text-[rgb(20,30,50)]">
                    <li>
                      <strong>Thumbnail path:</strong> presentations/
                      {'{presentationId}'}/slides/{'{objectId}'}_{'{size}'}.jpg
                    </li>
                    <li>
                      <strong>GIF path:</strong> Temporary files with UUID names
                    </li>
                    <li>Public URLs are generated for cached content</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xl font-semibold text-[rgb(20,30,50)]">
                    5. Google Slides API
                  </h3>
                  <p className="text-[rgb(20,30,50)]">
                    Provides access to presentation metadata and slide
                    thumbnails. Supports three thumbnail sizes: SMALL (200×112),
                    MEDIUM (800×450), and LARGE (1600×900).
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-12 rounded-lg bg-white/90 p-8 shadow-lg">
              <h2 className="mb-6 text-3xl font-bold text-[rgb(20,30,50)]">
                Data Flow
              </h2>
              <ol className="ml-6 list-decimal space-y-4 text-[rgb(20,30,50)]">
                <li>
                  User selects slides and clicks "Generate GIF" in the frontend
                </li>
                <li>
                  Frontend sends POST request to /api/generate-gif with
                  presentationId, slideList (comma-separated objectIds), and GIF
                  options
                </li>
                <li>
                  API route authenticates using Google OAuth tokens from session
                </li>
                <li>
                  API fetches high-resolution thumbnails from Google Slides API
                  for selected slides
                </li>
                <li>
                  Thumbnails are cached in Google Cloud Storage (if not already
                  cached)
                </li>
                <li>
                  API calls png2gif service at /createGif endpoint with query
                  parameters (presentationId, slideList, thumbnailSize, delay,
                  quality, repeat)
                </li>
                <li>
                  png2gif service downloads cached images from GCS matching the
                  requested size
                </li>
                <li>
                  Images are converted to GIF using gifencoder and
                  png-file-stream libraries
                </li>
                <li>Generated GIF is uploaded back to GCS</li>
                <li>Public URL is returned to the API route</li>
                <li>API route returns GIF URL to frontend</li>
                <li>Frontend displays the GIF to the user</li>
              </ol>
            </div>

            <div className="rounded-lg bg-white/90 p-8 shadow-lg">
              <h2 className="mb-6 text-3xl font-bold text-[rgb(20,30,50)]">
                Technologies Used
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-[rgb(20,30,50)]">
                    Frontend & API
                  </h3>
                  <ul className="ml-6 list-disc text-[rgb(20,30,50)]">
                    <li>Next.js 12</li>
                    <li>React 17</li>
                    <li>TypeScript</li>
                    <li>Tailwind CSS</li>
                    <li>iron-session (session management)</li>
                    <li>googleapis (Google Slides API client)</li>
                    <li>google-auth-library (OAuth2)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-[rgb(20,30,50)]">
                    GIF Generation
                  </h3>
                  <ul className="ml-6 list-disc text-[rgb(20,30,50)]">
                    <li>Express.js</li>
                    <li>gifencoder</li>
                    <li>png-file-stream</li>
                    <li>canvas (image processing)</li>
                    <li>@google-cloud/storage</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-[rgb(20,30,50)]">
                    Infrastructure
                  </h3>
                  <ul className="ml-6 list-disc text-[rgb(20,30,50)]">
                    <li>Google Cloud Run</li>
                    <li>Google Cloud Storage</li>
                    <li>Google Slides API</li>
                    <li>Google OAuth2</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-[rgb(20,30,50)]">
                    Authentication
                  </h3>
                  <ul className="ml-6 list-disc text-[rgb(20,30,50)]">
                    <li>Google OAuth2 for user authentication</li>
                    <li>Service-to-service auth (ID tokens) for Cloud Run</li>
                    <li>Scopes: Slides API, Drive metadata, User profile</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
