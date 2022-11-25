/**
 * The page for creating GIFs. Holds functionality for multiple page types:
 * - Sign-in: Logging into the app
 * - Create: Creating a GIF from slide images
 * - Import: Importing slide images
 */
import commonStyles from '../styles/common.module.scss';
import styles from '../styles/create.module.scss';
import classNames from 'classnames/bind';
import React from 'react';
// import useUser from '../lib/useUser';

// const DEFAULT_REDIRECT_URL = 'http://localhost:3000/';

// The current page.
enum PAGE_TYPE {
  CREATE = 'CREATE',
  IMPORT = 'IMPORT',
}

/**
 * The SPA page for sign-in, create, and import
 */
export default function PageCreate(props) {
  console.log('props');
  console.log(props);

  const type = PAGE_TYPE.CREATE;
  // const type = PAGE_TYPE.IMPORT;
  // export default function PageCreate({
  //   currentPageType: type,
  //   redirectURL,
  // } = {
  //   currentPageType: PAGE_TYPE.CREATE,
  //   redirectURL: DEFAULT_REDIRECT_URL,
  // }) {

  // const data = await fetcher('/api/user');
  // console.log(data);

  // Redirect to login if no user
  // const {user} = useUser();

  // Return the correct page
  const pageFunction = {
    [PAGE_TYPE.CREATE]: PageCreateGIF,
    [PAGE_TYPE.IMPORT]: PageImportSlides,
  };
  return <section className={type}>{pageFunction[type]()}</section>;
}

/**
 * Page for creating a GIF from slides
 */
function PageCreateGIF() {
  const pages = [{
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }, {
    src: 'https://placekitten.com/g/400/300',
  }];

  return PageWrapper({
    pageTitle: 'Create GIF',
    pageContents: (
      <div className={styles.section_content}>
        <div className={styles.section_left}>
          <div className={styles.list_of_slides}>
            <ul className={styles.list_of_slides_list}>
              <li>
                <button className={classNames(commonStyles.button, commonStyles.yellow)}>Import Slides</button>
              </li>
              {pages.map((p) => {
                return (
                  <li className={styles.slide_frame}>
                    <img
                      className={styles.slide_frame_image}
                      src={p.src}
                      alt=""
                    />
                  </li>
                );
              })}
            </ul>
          </div>
          <div className={styles.selected_slides}>
            <ol className={styles.selected_slides_list}>
              <li>
                <img
                  className={styles.slide_frame_image}
                  src="https://placekitten.com/g/400/300"
                  alt=""
                />
              </li>
              <li>
                <img
                  className={styles.slide_frame_image}
                  src="https://placekitten.com/g/400/300"
                  alt=""
                />
              </li>
            </ol>
          </div>
          <div className={styles.selected_slides_numbers}>
            <p>Slides: 1, 2, 5, 6, 3</p>
          </div>
        </div>
        <div className={styles.section_right}>
          <h3>Config</h3>
          <form action="">
            <label htmlFor="delay">Delay (ms):</label>
            <input
              type="number"
              id="delay"
              name="delay"
              placeholder="300"
              min="10"
              max="60000"
            />
            <button className={classNames(commonStyles.button, commonStyles.yellow)}>Create GIF</button>
          </form>
        </div>
      </div>
    )
  })
}
/**
 * Page for importing Slides
 */
function PageImportSlides() {
  interface Presentation {
    title: string;
    id: string;
    link: string;
  }

  const presentationData: Presentation[] = [{
    title: 'Presentation 1 Name',
    id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir4',
    link: 'http://google.com'
  }, {
    title: 'Presentation 2 Name',
    id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir1',
    link: 'http://google.com'
  }, {
    title: 'Presentation 3 Name',
    id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir2',
    link: 'http://google.com'
  }];

  return PageWrapper({
    pageTitle: 'Import Slides',
    pageContents: (
      <form action="">
        <div className={styles.section_content}>
          <div className={styles.section_left}>
            <h4 className={styles.select_presentation}>Select presentation:</h4>
            <ul className={styles.presentation_list}>
              {presentationData.map((p) => {
                return <li className={styles.presentation_item}>
                  <label className={styles.label} htmlFor={p.id}>
                    <input id={p.id} type="checkbox" name="presentation1" value="presentation1" />
                    {p.title}
                    {' '}
                    <span className={styles.presentation_id}>{p.id}</span>
                    {' '}
                    <a href={p.link}>LINK</a>
                  </label>
                </li>
              })}
            </ul>
            <span>
              ID: <input type="text" />
            </span>
          </div>
          <div className={styles.section_right}>
            <h3>Config</h3>
            <button className={classNames(commonStyles.button, commonStyles.yellow)}>Import slides</button>
          </div>
        </div>
      </form>
    )
  });
}

// Wraps a page
interface PageOptions {
  pageTitle: string;
  pageContents: JSX.Element;
}
function PageWrapper(options: PageOptions) {
  return (
    <div className={styles.section_container}>
      <h2>
        SLIDES2GIF <span>– {options.pageTitle}</span>
      </h2>
      {options.pageContents}
    </div>
  )
}
