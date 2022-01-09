import commonStyles from '../styles/common.module.scss';
import styles from '../styles/home.module.scss';
import classNames from 'classnames/bind';

export default function PageHome() {
  return (
    <div className={styles.page_wrapper}>
      <section className={classNames(styles.splash, styles.section)}>
        <h1>Slides2Gif</h1>
        <div className={styles.splash_top}>
          <div className={styles.description_left}>
            <img
              src="/images/Google_Slides_2020_Logo.svg"
              alt="Google Slides logo"
              className={styles.slides_logo}
            />
            <p className={styles.splash_tagline}>
              Create animated GIFs from Google Slide presentations
            </p>
            <a href="/create">
              <button
                className={classNames(styles.cta_button, commonStyles.button)}
              >
                <span className={classNames("material-icons", commonStyles.material_icons)}>add</span> Create GIF
              </button>
            </a>
          </div>
          <div className={styles.image_right}>
            <img
              src="https://placekitten.com/g/400/300"
              alt="Example GIF"
              className={styles.heroImage}
            />
          </div>
        </div>
        <div className={styles.splash_bottom}>
          <hr className={commonStyles.hr} />
          <div className={styles.see_more}>See how it works ⬇</div>
        </div>
      </section>
      <section className={classNames(styles.howitworks, styles.section)}>
        <h2 className={styles.subtitle}>How it works</h2>
        <ol className={classNames(styles.howitworks_steps)}>
          <li className={styles.howitworks_step}>
            <img
              className={styles.howitworks_images}
              src="https://placekitten.com/g/400/300"
              alt="Logging in"
            />
            <h4>Login</h4>
          </li>
          <li className={styles.howitworks_step}>
            <img
              className={styles.howitworks_images}
              src="https://placekitten.com/g/400/300"
              alt="Chooose slides"
            />
            <h4>Choose Slides</h4>
          </li>
          <li className={styles.howitworks_step}>
            <img
              className={styles.howitworks_images}
              src="https://placekitten.com/g/400/300"
              alt="Create GIF"
            />
            <h4>Create GIF!</h4>
          </li>
        </ol>
      </section>
      <section className={classNames(styles.features, styles.section)}>
        <h2>Features</h2>
        <ol className={classNames(styles.features_list)}>
          <li>
            <div className={styles.feature_list_icon}>
              <span className="material-icons">account_circle</span>
            </div>
            <h3>Google OAuth</h3>
            <p>Sign in with Google to access:</p>
            <ul className={classNames(styles.features_list_subbullets)}>
              <li>
                Slides{' '}
                <span className={styles.feature_list_reason}>
                  (for accessing Slide images)
                </span>
              </li>
              <li>
                Drive metadata{' '}
                <span className={styles.feature_list_reason}>
                  (for accessing presentation metadata)
                </span>
              </li>
              <li>
                Basic User profile{' '}
                <span className={styles.feature_list_reason}>
                  (for storing user session)
                </span>
              </li>
            </ul>
          </li>
          <li>
            <div className={styles.feature_list_icon}>
              <span className="material-icons">settings_suggest</span>
            </div>
            <h3>Customize GIF Animation</h3>
            <p>Options when creating your GIF:</p>
            <ul className={classNames(styles.features_list_subbullets)}>
              <li>Slide frames</li>
              <li>Delay between slides</li>
              <li>Image quality</li>
              <li>Auto-repeat</li>
            </ul>
          </li>
          <li>
            <div className={styles.feature_list_icon}>
              <span className="material-icons">link</span>
            </div>
            <h3>Private Download Link</h3>
            <p>Download your GIF with a private link.</p>
            <ul className={classNames(styles.features_list_subbullets)}>
              <li>Temporary URL for your GIF</li>
              <li>GIFs are automatically deleted after 10 minutes</li>
            </ul>
          </li>
        </ol>
      </section>
      <section className={classNames(styles.architecture, styles.section)}>
        <h3>Architecture</h3>
        <p className={styles.subtitle}>
          How this website works, for all you geeks 🤓
        </p>
        <img
          className={styles.architecture_image}
          src="https://placekitten.com/g/600/400"
          alt="Google Cloud diagram"
        />
      </section>
      <section className={classNames(styles.tryit, styles.section)}>
        <h3>Try it!</h3>
        <p className={styles.subtitle}>
          Really, just click the button :)
        </p>
        <a href="/create">
          <button
            className={classNames(styles.cta_button, commonStyles.button)}
          >
            <span className={classNames("material-icons", commonStyles.material_icons)}>add</span> Create GIF
          </button>
        </a>
      </section>
    </div>
  );
}
