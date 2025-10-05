import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Building2, Grid, List } from 'lucide-react';
import { propertyService } from '@/services/property.service';
import { Property } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency, getStatusColor } from '@/lib/utils';

type ViewMode = 'cards' | 'table';

const PropertiesPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

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

      {/* Filters & View Toggle */}
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
          
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 ${
                viewMode === 'cards'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } rounded-l-lg transition-colors`}
              title="Cards View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } rounded-r-lg transition-colors`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filters
          </Button>
        </div>
      </Card>

      {/* Empty State */}
      {properties.length === 0 ? (
        <Card variant="bordered" className="p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties yet</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first property</p>
          <Link to="/properties/add">
            <Button>Add Property</Button>
          </Link>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
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
          ))}
        </div>
      ) : (
        /* Table View */
        <Card variant="bordered" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specifications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {property.images[0] ? (
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={property.images[0]}
                              alt={property.projectName}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {property.projectName}
                          </div>
                          {property.developerName && (
                            <div className="text-sm text-gray-500">{property.developerName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{property.propertyType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{property.city}</div>
                      <div className="text-sm text-gray-500">{property.district}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.area && <span>{property.area} m²</span>}
                        {property.bedrooms && <span className="ml-2">• {property.bedrooms} beds</span>}
                        {property.bathrooms && <span className="ml-2">• {property.bathrooms} baths</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary-600">
                        {property.basePrice
                          ? formatCurrency(property.basePrice, property.currency)
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(property.status)} size="sm">
                        {property.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/properties/${property.id}`}
                        className="text-primary-600 hover:text-primary-900 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PropertiesPage;
