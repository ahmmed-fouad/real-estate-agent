import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';

const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">View detailed analytics and insights</p>
      </div>

      {/* Placeholder */}
      <Card variant="bordered" className="p-12">
        <div className="text-center">
          <p className="text-lg text-gray-600">
            Analytics dashboard will be implemented in the next subtask
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
