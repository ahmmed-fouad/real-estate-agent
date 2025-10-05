import { Link } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const BulkUploadPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/properties">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Upload</h1>
          <p className="text-gray-600 mt-1">Upload multiple properties at once</p>
        </div>
      </div>

      {/* Upload Area Placeholder */}
      <Card variant="bordered" className="p-8">
        <div className="text-center py-12">
          <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600">
            Bulk upload functionality will be implemented in the next subtask
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BulkUploadPage;
