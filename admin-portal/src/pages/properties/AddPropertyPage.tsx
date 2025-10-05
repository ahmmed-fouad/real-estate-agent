import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import PropertyForm from '@/components/PropertyForm';
import { propertyService } from '@/services/property.service';
import { PropertyFormData } from '@/types';

const AddPropertyPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: PropertyFormData) => {
    setIsSubmitting(true);
    try {
      const property = await propertyService.createProperty(data);
      toast.success('Property created successfully!');
      navigate(`/properties/${property.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create property');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Property Form */}
      <PropertyForm onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  );
};

export default AddPropertyPage;
