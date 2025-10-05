import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { propertyService } from '@/services/property.service';
import { Property } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency, getStatusColor } from '@/lib/utils';

const PropertyDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Failed to load property:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/properties">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.projectName}</h1>
            <p className="text-gray-600 mt-1">{property.city}, {property.district}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link to={`/properties/${id}/edit`}>
            <Button variant="outline" leftIcon={<Edit className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
            Delete
          </Button>
        </div>
      </div>

      {/* Property Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
            <div className="grid grid-cols-2 gap-4">
              {property.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Property ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          </Card>

          {/* Description */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{property.description}</p>
          </Card>

          {/* Amenities */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity, index) => (
                <Badge key={index} variant="gray">{amenity}</Badge>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Price & Status */}
          <Card variant="bordered" className="p-6">
            <Badge className={getStatusColor(property.status)} size="lg">
              {property.status}
            </Badge>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">
                {property.basePrice ? formatCurrency(property.basePrice, property.currency) : 'N/A'}
              </p>
            </div>
          </Card>

          {/* Specifications */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium">{property.propertyType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Area</span>
                <span className="font-medium">{property.area} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bedrooms</span>
                <span className="font-medium">{property.bedrooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bathrooms</span>
                <span className="font-medium">{property.bathrooms}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailsPage;
