/**
 * Create/import-related UI. Import flow uses useGooglePicker (sidebar/dashboard).
 */
import React, {JSX} from 'react';

/**
 * Page for importing Slides
 */
function PageImportSlides() {
  interface Presentation {
    title: string;
    id: string;
    link: string;
  }

  const presentationData: Presentation[] = [
    {
      title: 'Presentation 1 Name',
      id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir4',
      link: 'http://google.com',
    },
    {
      title: 'Presentation 2 Name',
      id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir1',
      link: 'http://google.com',
    },
    {
      title: 'Presentation 3 Name',
      id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir2',
      link: 'http://google.com',
    },
  ];

  return PageWrapper({
    pageTitle: 'Import Slides',
    pageContents: (
      <form action="">
        <div className="flex">
          <div className="flex-1">
            <h4 className="text-3xl">Select presentation:</h4>
            <ul>
              {presentationData.map(p => {
                return (
                  <li key={p.id}>
                    <label className="block" htmlFor={p.id}>
                      <input
                        id={p.id}
                        type="checkbox"
                        name="presentation1"
                        value="presentation1"
                      />
                      {p.title} <span>{p.id}</span> <a href={p.link}>LINK</a>
                    </label>
                  </li>
                );
              })}
            </ul>
            <span>
              ID: <input type="text" />
            </span>
          </div>
          <div className="flex-shrink-0 px-2.5" style={{flexBasis: '300px'}}>
            <h3>Config</h3>
            <button className="cursor-pointer rounded border border-black bg-yellow px-5 py-3.5 text-xl font-bold text-black shadow-[0_5px_10px_rgba(55,55,55,0.12)] opacity-95 transition-colors duration-200 hover:bg-yellow/90">
              Import slides
            </button>
          </div>
        </div>
      </form>
    ),
  });
}

// Wraps a page
interface PageOptions {
  pageTitle: string;
  pageContents: JSX.Element;
}
function PageWrapper(options: PageOptions) {
  return <div className="p-5">{options.pageContents}</div>;
}
