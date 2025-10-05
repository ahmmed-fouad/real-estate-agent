import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const AddPropertyPage = () => {
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
          <h1 className="text-3xl font-bold text-gray-900">Add Property</h1>
          <p className="text-gray-600 mt-1">Create a new property listing</p>
        </div>
      </div>

      {/* Form Placeholder */}
      <Card variant="bordered" className="p-8">
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">
            Property form will be implemented in the next subtask
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AddPropertyPage;
