import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { propertyService } from '@/services/property.service';
import { PropertyFormData } from '@/types';

interface ValidationError {
  index: number;
  error: string;
}

const BulkUploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<PropertyFormData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: ValidationError[];
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV, Excel, or JSON file');
      return;
    }

    setFile(selectedFile);
    setParsedData([]);
    setValidationErrors([]);
    setUploadResults(null);
  };

  const handleParse = async () => {
    if (!file) return;

    setIsProcessing(true);
    setValidationErrors([]);

    try {
      const text = await file.text();
      let data: PropertyFormData[];

      if (file.name.endsWith('.json')) {
        // Parse JSON
        const jsonData = JSON.parse(text);
        data = Array.isArray(jsonData) ? jsonData : [jsonData];
      } else {
        // Parse CSV
        data = parseCSV(text);
      }

      // Validate data
      const errors: ValidationError[] = [];
      data.forEach((property, index) => {
        if (!property.projectName) {
          errors.push({ index, error: 'Project name is required' });
        }
        if (!property.propertyType) {
          errors.push({ index, error: 'Property type is required' });
        }
      });

      setParsedData(data);
      setValidationErrors(errors);

      if (errors.length === 0) {
        toast.success(`Successfully parsed ${data.length} properties`);
      } else {
        toast.error(`Found ${errors.length} validation errors`);
      }
    } catch (error) {
      toast.error('Failed to parse file. Please check the format.');
      console.error('Parse error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSV = (text: string): PropertyFormData[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const properties: PropertyFormData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const property: any = {
        amenities: [],
        paymentPlans: [],
        currency: 'EGP',
        status: 'available',
      };

      headers.forEach((header, index) => {
        const value = values[index];
        if (!value) return;

        switch (header.toLowerCase()) {
          case 'projectname':
          case 'project_name':
            property.projectName = value;
            break;
          case 'developername':
          case 'developer_name':
            property.developerName = value;
            break;
          case 'propertytype':
          case 'property_type':
            property.propertyType = value;
            break;
          case 'city':
            property.city = value;
            break;
          case 'district':
            property.district = value;
            break;
          case 'address':
            property.address = value;
            break;
          case 'area':
            property.area = parseFloat(value);
            break;
          case 'bedrooms':
            property.bedrooms = parseInt(value);
            break;
          case 'bathrooms':
            property.bathrooms = parseInt(value);
            break;
          case 'baseprice':
          case 'base_price':
            property.basePrice = parseFloat(value);
            break;
          case 'pricepermeter':
          case 'price_per_meter':
            property.pricePerMeter = parseFloat(value);
            break;
          case 'amenities':
            property.amenities = value.split(';').map((a: string) => a.trim());
            break;
          case 'description':
            property.description = value;
            break;
          case 'status':
            property.status = value;
            break;
        }
      });

      properties.push(property);
    }

    return properties;
  };

  const handleUpload = async () => {
    if (parsedData.length === 0 || validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    setIsUploading(true);

    try {
      const results = await propertyService.bulkUpload(parsedData);
      setUploadResults(results);

      if (results.failed === 0) {
        toast.success(`Successfully uploaded ${results.success} properties!`);
        setTimeout(() => navigate('/properties'), 2000);
      } else {
        toast.error(`Uploaded ${results.success} properties, ${results.failed} failed`);
      }
    } catch (error) {
      toast.error('Failed to upload properties');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `projectName,developerName,propertyType,city,district,address,area,bedrooms,bathrooms,basePrice,pricePerMeter,amenities,description,status
Luxury Apartment,ABC Developments,Apartment,Cairo,New Cairo,123 Main St,150,3,2,2500000,16666,Swimming Pool;Gym;Parking,Beautiful modern apartment,available
Villa Project,XYZ Corp,Villa,Giza,6th October,456 Oak Ave,300,4,3,5000000,16666,Garden;Security;Elevator,Spacious family villa,available`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'property_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully');
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Bulk Upload</h1>
            <p className="text-gray-600 mt-1">Upload multiple properties at once</p>
          </div>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
      </div>

      {/* Instructions */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">How to use bulk upload</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Download the CSV template using the button above</li>
          <li>Fill in your property data following the template format</li>
          <li>For amenities, separate multiple items with semicolons (;)</li>
          <li>Upload your completed file below</li>
          <li>Review the preview and validation results</li>
          <li>Click "Upload Properties" to import</li>
        </ol>
      </Card>

      {/* File Upload */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>
        
        <div className="mb-4">
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
              {file ? (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-600 mb-1">
                    <span className="font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">CSV, Excel, or JSON file</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
            />
          </label>
        </div>

        {file && (
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setParsedData([]);
                setValidationErrors([]);
                setUploadResults(null);
              }}
            >
              Clear
            </Button>
            <Button onClick={handleParse} isLoading={isProcessing}>
              Parse & Validate
            </Button>
          </div>
        )}
      </Card>

      {/* Validation Results */}
      {parsedData.length > 0 && (
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Validation Results</h2>
            <div className="flex items-center space-x-4">
              <Badge variant="success">
                <CheckCircle className="h-4 w-4 mr-1" />
                {parsedData.length - validationErrors.length} Valid
              </Badge>
              {validationErrors.length > 0 && (
                <Badge variant="danger">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors.length} Errors
                </Badge>
              )}
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Validation Errors:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {validationErrors.map((error, index) => (
                  <li key={index}>
                    Row {error.index + 2}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Preview */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Project Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    City
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsedData.slice(0, 10).map((property, index) => (
                  <tr key={index} className={validationErrors.some((e) => e.index === index) ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{property.projectName || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{property.propertyType || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{property.city || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {property.basePrice ? `${property.basePrice.toLocaleString()} ${property.currency}` : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <Badge variant={property.status === 'available' ? 'success' : 'gray'}>
                        {property.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 10 && (
              <p className="text-sm text-gray-500 text-center mt-2">
                Showing 10 of {parsedData.length} properties
              </p>
            )}
          </div>

          {validationErrors.length === 0 && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleUpload}
                isLoading={isUploading}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload {parsedData.length} Properties
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults && (
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{uploadResults.success}</p>
              <p className="text-sm text-green-700 mt-1">Successfully Uploaded</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">{uploadResults.failed}</p>
              <p className="text-sm text-red-700 mt-1">Failed</p>
            </div>
          </div>

          {uploadResults.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Upload Errors:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {uploadResults.errors.map((error, index) => (
                  <li key={index}>
                    Row {error.index + 2}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => navigate('/properties')}>
              View Properties
            </Button>
            <Button
              onClick={() => {
                setFile(null);
                setParsedData([]);
                setValidationErrors([]);
                setUploadResults(null);
              }}
            >
              Upload Another File
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkUploadPage;
