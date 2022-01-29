/**
 * The page for Google sign-in.
 */
import commonStyles from '../styles/common.module.scss';
import styles from '../styles/create.module.scss';
import classNames from 'classnames/bind';

const AUTH_URL = 'http://localhost:8080/oauth2';

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
    <div className={styles.pageContent}>
      <h2>Slides2Gif</h2>
      <p className={styles.description}>
        Access to view Google Slides and metadata to create GIFs.
      </p>
      <button
        className={classNames(styles.cta_button, commonStyles.button)}
        onClick={signInClick}
      >
        Sign in
      </button>
      <div className={styles.permissionSection}>
        Permissions:
        <ul className={styles.listOfPermissions}>
          {PERMISSIONS.map(p => {
            return (
              <li key={p.id} className={styles.permissionItem}>
                <span
                  className={classNames('material-icons', styles.materialIcons)}
                >
                  {p.icon}
                </span>
                <code className={styles.permissionID}>{p.id}</code>:{' '}
                {p.description}
              </li>
            );
          })}
        </ul>
      </div>
      <img src="https://placekitten.com/g/400/300" alt="" />
    </div>
  );
}
