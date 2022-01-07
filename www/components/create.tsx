/**
 * The page for creating GIFs. Holds functionality for multiple page types:
 * - Sign-in: Logging into the app
 * - Create: Creating a GIF from slide images
 * - Import: Importing slide images
 */
import commonStyles from './common.module.scss';
import styles from './create.module.scss';
import classNames from 'classnames/bind';

// TODO temp
let SIGNED_IN = false;

// The current page.
enum PAGE_TYPE {
  SIGNIN = 'SIGNIN',
  CREATE = 'CREATE',
  IMPORT = 'IMPORT',
}

/**
 * The SPA page for sign-in, create, and import
 */
export default function PageCreate({
  currentPageType: type
} = { currentPageType: PAGE_TYPE.CREATE }) {
  // Redirect to sign-in if not signed in.
  if (!SIGNED_IN) {
    type = PAGE_TYPE.SIGNIN;
  }

  // Return the correct page
  const pageFunction = {
    [PAGE_TYPE.CREATE]: PageCreateGIF,
    [PAGE_TYPE.IMPORT]: PageImportSlides,
    [PAGE_TYPE.SIGNIN]: PageSignin,
  }
  return (
    <section className={type}>
      {pageFunction[type]()}
    </section>
  );
}

/**
 * Page for Google Sign-in
 */
function PageSignin() {
  return (
    <div>
      <h2>SLIDES2GIF <span>– Sign-in</span></h2>
      <div className="section_left">
        <p className={styles.description}>To use slide2gif, the app needs access to view Google Slides and metadata.</p>
        <button className={classNames(styles.cta_button, commonStyles.button, commonStyles.yellow, commonStyles.large)}>
          Sign in
        </button>
        <div>
          Permission details:
          <ul>
            <li><span className="material-icons">account_circle</span><code>userinfo.profile</code>: Read public profile, for storing user ID</li>
            <li><span className="material-icons">slideshow</span><code>presentations.readonly</code>: Access your Slides images</li>
            <li><span className="material-icons">description</span><code>drive.metadata.readonly</code>: Access metadata about the Slide you picked</li>
            <li><span className="material-icons">preview</span><code>drive.activity.readonly</code>: Recommend recent presentations</li>
          </ul>
        </div>
      </div>
      <div className="section_right">
        <img src="https://placekitten.com/g/400/300" alt="" />
      </div>
    </div>
  );
}
/**
 * Page for creating a GIF from slides
 */
function PageCreateGIF() {
  return (
    <div>
      <h2>SLIDES2GIF <span>– Create GIF</span></h2>
      <div className="section_left">
        <div className="list_of_slides">
          <ul className="list_of_slides_list">
            <li><button>Import Presentation</button></li>
            <li><img className="slide_frame" src="https://placekitten.com/g/400/300" alt="" /></li>
            <li><img className="slide_frame" src="https://placekitten.com/g/400/300" alt="" /></li>
            <li><img className="slide_frame" src="https://placekitten.com/g/400/300" alt="" /></li>
            <li><img className="slide_frame" src="https://placekitten.com/g/400/300" alt="" /></li>
          </ul>
        </div>
        <div className="selected_slides">
          <ol className="selected_slides_list">
            <li><img className="slide_frame" src="https://placekitten.com/g/400/300" alt="" /></li>
            <li><img className="slide_frame" src="https://placekitten.com/g/400/300" alt="" /></li>
          </ol>
        </div>
        <div className="selected_slides_numbers">
          <p>Slides: 1, 2, 5, 6, 3</p>
        </div>
      </div>
      <div className="section_right">
        <h3>Config</h3>
        <form action="">
          <label htmlFor="delay">Delay (ms):</label>
          <input type='number' id="delay" name="delay" placeholder='300' min="10" max="60000" />
          <button>
            Create GIF
          </button>
        </form>
      </div>
    </div>
  );
}
/**
 * Page for importing Slides
 */
function PageImportSlides() {
  return (
    <div>
      <h2>SLIDES2GIF <span>– Import Slides</span></h2>
      <form action="">
        <h4 className="select_presentation">Select presentation:</h4>
        <ul className="presentation_list">
          <li className="presentation_item">
            <input type="checkbox" name="presentation1" value="presentation1" />
            Presentation 1 Name <span className="presentation_id">15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir4</span> <a href="http://google.com">LINK</a>
          </li>
          <li className="presentation_item">
            <input type="checkbox" name="presentation1" value="presentation1" />
            Presentation 2 Name <span className="presentation_id">15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir4</span> <a href="http://google.com">LINK</a>
          </li>
          <li className="presentation_item">
            <input type="checkbox" name="presentation1" value="presentation1" />
            Presentation 3 Name <span className="presentation_id">15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir4</span> <a href="http://google.com">LINK</a>
          </li>
        </ul>
      </form>
      <span>ID: <input type="text" /></span>
      <button>
        IMPORT SLIDES
      </button>
      <button>
        CANCEL
      </button>
    </div>
  );
}