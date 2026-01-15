import React from 'react';

export default function PageHome() {
  return (
    <div>
      <section className="relative h-screen bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)] px-[200px] py-[200px] text-[rgb(20,30,50)] shadow-[inset_0_-20px_20px_-20px_rgba(0,0,0,0.1)]">
        <div className="mx-auto w-full">
          <div className="float-left w-[400px]">
            <h1>Slides2Gif</h1>
            {/* <img
              src="/images/Google_Slides_2020_Logo.svg"
              alt="Google Slides logo"
              className="w-[100px]"
            /> */}
            <p className="w-[400px] pb-10 text-xl">
              Create animated GIFs from Google Slide presentations
            </p>
            <a href="/create">
              <button className="cursor-pointer rounded bg-blue px-5 py-3.5 text-xl font-bold text-white shadow-[0_5px_10px_rgba(55,55,55,0.12)] opacity-95 transition-colors duration-200 hover:bg-blue/90">
                <span className="material-icons align-bottom">
                  add
                </span>{' '}
                Create GIF
              </button>
            </a>
          </div>
          <div className="ml-[400px] border border-black/10 bg-black/5 text-center">
            <img
              src="https://placekitten.com/g/400/300"
              alt="Example GIF"
            />
          </div>
        </div>
        <div className="absolute bottom-5 w-[calc(100%-400px)]">
          <hr className="my-1 block border-t border-black/5" />
          <div className="text-center font-bold">See how it works... ⬇</div>
        </div>
      </section>
      <section className="bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)] px-[100px] py-[50px] shadow-[inset_0_-20px_20px_-20px_rgba(0,0,0,0.1)]">
        <h2 className="pb-5 text-center">How it works</h2>
        <ol className="pt-2.5">
          <li className="inline-block w-1/3 px-5">
            <img
              className="w-full bg-red"
              src="https://placekitten.com/g/400/300"
              alt="Logging in"
            />
            <h4>Login</h4>
          </li>
          <li className="inline-block w-1/3 px-5">
            <img
              className="w-full bg-red"
              src="https://placekitten.com/g/400/300"
              alt="Chooose slides"
            />
            <h4>Choose Slides</h4>
          </li>
          <li className="inline-block w-1/3 px-5">
            <img
              className="w-full bg-red"
              src="https://placekitten.com/g/400/300"
              alt="Create GIF"
            />
            <h4>Create GIF!</h4>
          </li>
        </ol>
      </section>
      <section className="bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)] px-[100px] py-[50px] shadow-[inset_0_-20px_20px_-20px_rgba(0,0,0,0.1)]">
        <h2 className="text-center">Features</h2>
        <ol className="pt-2.5">
          <li className="inline-block w-1/3 align-top">
            <div className="text-center">
              <span className="text-[60px] material-icons">account_circle</span>
            </div>
            <h3 className="text-xl">Google OAuth</h3>
            <p>Sign in with Google to access:</p>
            <ul className="block list-disc pl-10">
              <li>
                Slides{' '}
                <span className="text-[10px] text-gray-800">
                  (for accessing Slide images)
                </span>
              </li>
              <li>
                Drive metadata{' '}
                <span className="text-[10px] text-gray-800">
                  (for accessing presentation metadata)
                </span>
              </li>
              <li>
                Basic User profile{' '}
                <span className="text-[10px] text-gray-800">
                  (for storing user session)
                </span>
              </li>
            </ul>
          </li>
          <li className="inline-block w-1/3 align-top">
            <div className="text-center">
              <span className="text-[60px] material-icons">settings_suggest</span>
            </div>
            <h3 className="text-xl">Customize GIF Animation</h3>
            <p>Options when creating your GIF:</p>
            <ul className="block list-disc pl-10">
              <li>Slide frames</li>
              <li>Delay between slides</li>
              <li>Image quality</li>
              <li>Auto-repeat</li>
            </ul>
          </li>
          <li className="inline-block w-1/3 align-top">
            <div className="text-center">
              <span className="text-[60px] material-icons">link</span>
            </div>
            <h3 className="text-xl">Private Download Link</h3>
            <p>Download your GIF with a private link.</p>
            <ul className="block list-disc pl-10">
              <li>Temporary URL for your GIF</li>
              <li>GIFs are automatically deleted after 10 minutes</li>
            </ul>
          </li>
        </ol>
      </section>
      <section className="bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)] px-[100px] py-[50px] shadow-[inset_0_-20px_20px_-20px_rgba(0,0,0,0.1)]">
        <h3 className="text-center">Architecture</h3>
        <p className="py-2.5 text-center">
          How this website works, for all you geeks 🤓
        </p>
        <img
          className="mx-auto block"
          src="https://placekitten.com/g/600/400"
          alt="Google Cloud diagram"
        />
      </section>
      <section className="bg-gradient-to-b from-[rgba(255,186,68,1)] to-[rgba(254,160,3,1)] px-[100px] py-[50px] text-center shadow-[inset_0_-20px_20px_-20px_rgba(0,0,0,0.1)]">
        <h3>Try it!</h3>
        <p className="py-2.5">Really, just click some buttons :)</p>
        <a href="/create">
          <button className="cursor-pointer rounded bg-blue px-5 py-3.5 text-xl font-bold text-white shadow-[0_5px_10px_rgba(55,55,55,0.12)] opacity-95 transition-colors duration-200 hover:bg-blue/90">
            <span className="material-icons align-bottom">
              add
            </span>{' '}
            Create GIF
          </button>
        </a>
      </section>
    </div>
  );
}
