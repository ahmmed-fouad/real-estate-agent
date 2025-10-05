import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import { PropertyFormData } from '@/types';

// Validation schema
const propertySchema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  developerName: z.string().optional(),
  propertyType: z.string().min(1, 'Property type is required'),
  city: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  area: z.number().min(1, 'Area must be greater than 0').optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  floors: z.number().min(0).optional(),
  basePrice: z.number().min(0, 'Price must be greater than 0').optional(),
  pricePerMeter: z.number().min(0).optional(),
  currency: z.string().default('EGP'),
  amenities: z.array(z.string()),
  description: z.string().optional(),
  deliveryDate: z.string().optional(),
  status: z.enum(['available', 'sold', 'reserved']).default('available'),
  paymentPlans: z.array(
    z.object({
      planName: z.string().min(1, 'Plan name is required'),
      downPaymentPercentage: z.number().min(0).max(100),
      installmentYears: z.number().min(0),
      monthlyPayment: z.number().min(0).optional(),
      description: z.string().optional(),
    })
  ),
});

interface PropertyFormProps {
  initialData?: PropertyFormData;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  isLoading?: boolean;
}

const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Townhouse',
  'Duplex',
  'Studio',
  'Penthouse',
  'Commercial',
  'Land',
];

const COMMON_AMENITIES = [
  'Swimming Pool',
  'Gym',
  'Garden',
  'Parking',
  'Security',
  'Elevator',
  'Balcony',
  'Central AC',
  'Natural Gas',
  'Club House',
  'Kids Area',
  'Spa',
  'Cinema',
  'Shopping Mall',
  'School',
  'Hospital',
];

const PropertyForm = ({ initialData, onSubmit, isLoading = false }: PropertyFormProps) => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialData?.amenities || []
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.images || []);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: initialData || {
      projectName: '',
      propertyType: '',
      currency: 'EGP',
      status: 'available',
      amenities: [],
      paymentPlans: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paymentPlans',
  });

  const handleFormSubmit = async (data: PropertyFormData) => {
    // Add selected amenities to form data
    data.amenities = selectedAmenities;
    
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file sizes (max 5MB per image)
    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageFiles((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Only PDF and DOC files are allowed');
      return;
    }

    // Validate file sizes (max 10MB per document)
    const oversizedFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Document size must be less than 10MB');
      return;
    }

    setDocumentFiles((prev) => [...prev, ...files]);
  };

  const removeDocument = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Project Name *"
            placeholder="Enter project name"
            error={errors.projectName?.message}
            {...register('projectName')}
          />

          <Input
            label="Developer Name"
            placeholder="Enter developer name"
            error={errors.developerName?.message}
            {...register('developerName')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type *
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('propertyType')}
            >
              <option value="">Select type</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.propertyType && (
              <p className="mt-1 text-sm text-red-600">{errors.propertyType.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('status')}
            >
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Location */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="City"
            placeholder="e.g., Cairo"
            error={errors.city?.message}
            {...register('city')}
          />

          <Input
            label="District"
            placeholder="e.g., New Cairo"
            error={errors.district?.message}
            {...register('district')}
          />

          <div className="md:col-span-2">
            <Input
              label="Address"
              placeholder="Enter full address"
              error={errors.address?.message}
              {...register('address')}
            />
          </div>

          <Input
            label="Latitude"
            type="number"
            step="any"
            placeholder="e.g., 30.0444"
            error={errors.latitude?.message}
            {...register('latitude', { valueAsNumber: true })}
          />

          <Input
            label="Longitude"
            type="number"
            step="any"
            placeholder="e.g., 31.2357"
            error={errors.longitude?.message}
            {...register('longitude', { valueAsNumber: true })}
          />
        </div>
      </Card>

      {/* Specifications */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Area (m²)"
            type="number"
            placeholder="e.g., 120"
            error={errors.area?.message}
            {...register('area', { valueAsNumber: true })}
          />

          <Input
            label="Bedrooms"
            type="number"
            placeholder="e.g., 3"
            error={errors.bedrooms?.message}
            {...register('bedrooms', { valueAsNumber: true })}
          />

          <Input
            label="Bathrooms"
            type="number"
            placeholder="e.g., 2"
            error={errors.bathrooms?.message}
            {...register('bathrooms', { valueAsNumber: true })}
          />

          <Input
            label="Floors"
            type="number"
            placeholder="e.g., 1"
            error={errors.floors?.message}
            {...register('floors', { valueAsNumber: true })}
          />
        </div>
      </Card>

      {/* Pricing */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Base Price"
            type="number"
            placeholder="e.g., 2500000"
            error={errors.basePrice?.message}
            {...register('basePrice', { valueAsNumber: true })}
          />

          <Input
            label="Price per m²"
            type="number"
            placeholder="e.g., 20000"
            error={errors.pricePerMeter?.message}
            {...register('pricePerMeter', { valueAsNumber: true })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('currency')}
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payment Plans */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Plans</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() =>
              append({
                planName: '',
                downPaymentPercentage: 0,
                installmentYears: 0,
                monthlyPayment: 0,
                description: '',
              })
            }
          >
            Add Plan
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No payment plans added yet. Click "Add Plan" to create one.
          </p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Plan {index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Plan Name"
                  placeholder="e.g., Standard Plan"
                  error={errors.paymentPlans?.[index]?.planName?.message}
                  {...register(`paymentPlans.${index}.planName`)}
                />

                <Input
                  label="Down Payment (%)"
                  type="number"
                  placeholder="e.g., 20"
                  error={errors.paymentPlans?.[index]?.downPaymentPercentage?.message}
                  {...register(`paymentPlans.${index}.downPaymentPercentage`, {
                    valueAsNumber: true,
                  })}
                />

                <Input
                  label="Installment Years"
                  type="number"
                  placeholder="e.g., 5"
                  error={errors.paymentPlans?.[index]?.installmentYears?.message}
                  {...register(`paymentPlans.${index}.installmentYears`, {
                    valueAsNumber: true,
                  })}
                />

                <Input
                  label="Monthly Payment"
                  type="number"
                  placeholder="Optional"
                  error={errors.paymentPlans?.[index]?.monthlyPayment?.message}
                  {...register(`paymentPlans.${index}.monthlyPayment`, {
                    valueAsNumber: true,
                  })}
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    rows={2}
                    placeholder="Optional description"
                    {...register(`paymentPlans.${index}.description`)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Amenities */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMMON_AMENITIES.map((amenity) => (
            <label
              key={amenity}
              className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedAmenities.includes(amenity)}
                onChange={() => handleAmenityToggle(amenity)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{amenity}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Images */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
        
        <div className="mb-4">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handleImageUpload}
            />
          </label>
        </div>

        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Documents */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
        
        <div className="mb-4">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PDF, DOC up to 10MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept="application/pdf,.doc,.docx"
              onChange={handleDocumentUpload}
            />
          </label>
        </div>

        {documentFiles.length > 0 && (
          <div className="space-y-2">
            {documentFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Description */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        <textarea
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          rows={5}
          placeholder="Enter property description..."
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </Card>

      {/* Delivery Date */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
        <Input
          label="Delivery Date"
          type="date"
          error={errors.deliveryDate?.message}
          {...register('deliveryDate')}
        />
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Property' : 'Create Property'}
        </Button>
      </div>
    </form>
  );
};

export default PropertyForm;
