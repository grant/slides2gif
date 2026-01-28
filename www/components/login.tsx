/**
 * The page for Google sign-in.
 */

import Logo from './Logo';

const AUTH_URL = 'http://localhost:3000/api/oauth2';

export default function PageSignin() {
  // An OAuth permission
  type Permission = {
    icon: string;
    id: string;
    description: string;
  };

  const PERMISSIONS: Permission[] = [
    {
      id: 'userinfo.profile',
      icon: 'account_circle',
      description: 'Read public profile, for storing user ID',
    },
    {
      id: 'presentations.readonly',
      icon: 'slideshow',
      description: 'Access your Slides images',
    },
    {
      id: 'drive.metadata.readonly',
      icon: 'description',
      description: 'Access metadata about the Slide you picked',
    },
    {
      id: 'drive.activity.readonly',
      icon: 'preview',
      description: 'Recommend recent presentations',
    },
  ];

  // Handler for when the user clicks.
  const signInClick = () => {
    console.log('Redirect');
    window.location.href = AUTH_URL;
  };

  return (
    <div className="mx-auto my-[100px] w-[600px] rounded border-2 border-gray-200 p-5 text-center">
      <div className="mb-5 flex justify-center">
        <Logo />
      </div>
      <p className="py-5 text-xl">
        Access to view Google Slides and metadata to create GIFs.
      </p>
      <button
        className="cursor-pointer rounded bg-blue px-5 py-3.5 text-xl font-bold text-white shadow-[0_5px_10px_rgba(55,55,55,0.12)] opacity-95 transition-colors duration-200 hover:bg-blue/90"
        onClick={signInClick}
      >
        Sign in
      </button>
      <div className="mt-5 text-left text-xs">
        Permissions:
        <ul className="py-5">
          {PERMISSIONS.map(p => {
            return (
              <li key={p.id} className="pb-0.5">
                <span className="material-icons align-text-bottom pr-1.5">
                  {p.icon}
                </span>
                <code className="font-mono">{p.id}</code>: {p.description}
              </li>
            );
          })}
        </ul>
      </div>
      <img src="https://placekitten.com/g/400/300" alt="" />
    </div>
  );
}
