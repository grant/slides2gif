import {redirect} from 'next/navigation';
import {Routes} from '../../../lib/routes';

export default function CreateMarkdownPage() {
  redirect(Routes.DASHBOARD);
}
