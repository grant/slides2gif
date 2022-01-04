import styles from './home.module.scss';
// Foo
import classNames from 'classnames/bind';

export default function SectionHome() {
  const names = classNames(styles.about, styles.home);
  return (
    <section id="home" className={names}>
      Hi Mom!
    </section>
  );
}
