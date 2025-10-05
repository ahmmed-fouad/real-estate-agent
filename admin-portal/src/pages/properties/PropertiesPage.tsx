import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Building2 } from 'lucide-react';
import { propertyService } from '@/services/property.service';
import { Property } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency, getStatusColor } from '@/lib/utils';

const PropertiesPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const response = await propertyService.getProperties({ page: 1, limit: 20 });
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to load properties:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">Manage your property listings</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/properties/bulk-upload">
            <Button variant="outline">Bulk Upload</Button>
          </Link>
          <Link to="/properties/add">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Property</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search properties..."
              leftIcon={<Search className="h-5 w-5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filters
          </Button>
        </div>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.length === 0 ? (
          <Card variant="bordered" className="col-span-full p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first property</p>
            <Link to="/properties/add">
              <Button>Add Property</Button>
            </Link>
          </Card>
        ) : (
          properties.map((property) => (
            <Link key={property.id} to={`/properties/${property.id}`}>
              <Card variant="bordered" className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                {property.images[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.projectName}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{property.projectName}</h3>
                    <Badge className={getStatusColor(property.status)} size="sm">
                      {property.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{property.city}, {property.district}</p>
                  <p className="text-lg font-bold text-primary-600">
                    {property.basePrice ? formatCurrency(property.basePrice, property.currency) : 'N/A'}
                  </p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                    {property.bedrooms && <span>{property.bedrooms} beds</span>}
                    {property.bathrooms && <span>{property.bathrooms} baths</span>}
                    {property.area && <span>{property.area} m²</span>}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default PropertiesPage;
