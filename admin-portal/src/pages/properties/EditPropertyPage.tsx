import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import PropertyForm from '@/components/PropertyForm';
import Spinner from '@/components/ui/Spinner';
import { propertyService } from '@/services/property.service';
import { Property, PropertyFormData } from '@/types';

const EditPropertyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    try {
      const data = await propertyService.getProperty(propertyId);
      setProperty(data);
    } catch (error) {
      toast.error('Failed to load property');
      navigate('/properties');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: PropertyFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      await propertyService.updateProperty(id, data);
      toast.success('Property updated successfully!');
      navigate(`/properties/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update property');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Property not found</h2>
        <Link to="/properties">
          <Button className="mt-4">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  // Convert Property to PropertyFormData
  const initialData: PropertyFormData = {
    projectName: property.projectName,
    developerName: property.developerName,
    propertyType: property.propertyType,
    city: property.city,
    district: property.district,
    address: property.address,
    latitude: property.latitude,
    longitude: property.longitude,
    area: property.area,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    floors: property.floors,
    basePrice: property.basePrice,
    pricePerMeter: property.pricePerMeter,
    currency: property.currency,
    amenities: property.amenities,
    description: property.description,
    deliveryDate: property.deliveryDate,
    status: property.status,
    paymentPlans: property.paymentPlans.map((plan) => ({
      planName: plan.planName,
      downPaymentPercentage: plan.downPaymentPercentage,
      installmentYears: plan.installmentYears,
      monthlyPayment: plan.monthlyPayment,
      description: plan.description,
    })),
    images: property.images,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to={`/properties/${id}`}>
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-gray-600 mt-1">Update property details</p>
        </div>
      </div>

      {/* Property Form */}
      <PropertyForm initialData={initialData} onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  );
};

export default EditPropertyPage;
