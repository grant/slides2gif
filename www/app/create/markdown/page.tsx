import CreateMarkdownClient from './CreateMarkdownClient';
import DashboardLayout from '../../../components/DashboardLayout';

export default function CreateMarkdownPage() {
  return (
    <DashboardLayout activeTab="create" initialCollapsed={true}>
      <CreateMarkdownClient />
    </DashboardLayout>
  );
}
