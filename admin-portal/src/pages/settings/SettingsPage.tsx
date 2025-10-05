import Card from '@/components/ui/Card';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Placeholder */}
      <Card variant="bordered" className="p-12">
        <div className="text-center">
          <p className="text-lg text-gray-600">
            Settings page will be implemented in the next subtask
          </p>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
