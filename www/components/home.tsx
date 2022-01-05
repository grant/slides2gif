import styles from './home.module.scss';
import classNames from 'classnames/bind';

export default function PageHome() {
  return (
    <div>
      <section className={classNames(styles.about, styles.home)}>
        <h1>Slides2Gif</h1>
        <p>Create animated GIFs from Google Slide presentations</p>
        <button>Create GIF</button>
        <img src="" alt="Example GIF" className="hero-image" />

        <hr />
        <span>See how it works... <span>V</span></span>
      </section>
      <section>
        <h2>How it works</h2>
        <ol>
          <li>
            <img src="" alt="Logging in" />
            <h3>Login</h3>
          </li>
          <li>
            <img src="" alt="Chooose slides" />
            <h3>Choose Slides</h3>
          </li>
          <li>
            <img src="" alt="Create GIF" />
            <h3>Create GIF!</h3>
          </li>
        </ol>
      </section>
      <section>
        <h2>Features</h2>
        <ol>
          <li>
            <h3>Google OAuth</h3>
            <p>Sign in with Google to access:</p>
            <ul>
              <li>Slides</li>
              <li>Drive metadata</li>
              <li>User profile</li>
            </ul>
          </li>
          <li>
            <h3>Customize GIF Animation</h3>
            <p>Options when creating your GIF:</p>
            <ul>
              <li>Choose slides</li>
              <li>Delay between slides</li>
              <li>Image quality</li>
              <li>Auto-repeat</li>
            </ul>
          </li>
          <li>
            <h3>Private Download Link</h3>
            <p>Download your GIF with a private link.</p>
          </li>
        </ol>
      </section>
      <section>
        <h3>Architecture</h3>
        <p>How this website works, for all you geeks 🤓</p>
        <img src="" alt="Google Cloud diagram" />
      </section>
    </div>
  );
}
