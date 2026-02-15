import {redirect} from 'next/navigation';
import {Routes} from '../../lib/routes';

export default function CreatePage() {
  redirect(Routes.DASHBOARD);
}
