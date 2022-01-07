import '../styles/reset.scss';
import '../components/global.scss';
import {AppProps} from 'next/app';

/**
 * The base component for the whole app.
 */
export default function App({Component, pageProps}: AppProps) {
  return <Component {...pageProps} />;
}
