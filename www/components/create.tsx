import styles from './create.module.scss';
import classNames from 'classnames/bind';

/**
 * The SPA page for sign-in, create, and import
 */
export default function PageCreate() {
  // The current page.
  enum PAGE {
    SIGNIN = 'SIGNIN',
    CREATE = 'CREATE',
    IMPORT = 'IMPORT',
  }

  return (
    <div>
      <section className="create">
        <h1>Slides2Gif</h1>
        <div className="left">
          <div className="customize pane">
            <p>
              To use slides2gif, the app needs access to Google Slides and
              metadata:
              <ul>
                <li>
                  <code>userinfo.profile</code>: Read public profile, needed to
                  store your user session
                </li>
                <li>
                  <code>presentations.readonly</code>: Read your Google Slides
                </li>
                <li>
                  <code>drive.activity.readonly</code>: Recommend recent
                  presentations based on Drive activity
                </li>
              </ul>
            </p>
            <button>Sign In</button>
          </div>
          <div className="choosePresentation pane">
            <h3>Choose a Presentation</h3>
            <input type="text" placeholder="" />
          </div>
          <div className="chooseSlides pane"></div>
        </div>
        <div className="right">
          <span src="" alt="Demo GIF (sign in, customize, create)" />
        </div>
      </section>
    </div>
  );
}
