import React, { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Eye, 
  DollarSign, 
  Percent,
  Tag,
  FileText,
  Palette,
  Zap
} from 'lucide-react';
import RegularPageWrapper from '../components/RegularPageWrapper';
import Input from '../components/inputs/Input';
import Button from '../components/button/Button';

interface NFTProperty {
  id: string;
  trait_type: string;
  value: string;
}

interface NFTFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  currency: string;
  royalties: string;
  blockchain: string;
  supply: string;
}

const CreateNFTPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [properties, setProperties] = useState<NFTProperty[]>([]);
  const [formData, setFormData] = useState<NFTFormData>({
    name: '',
    description: '',
    category: '',
    price: '',
    currency: 'ETH',
    royalties: '5',
    blockchain: 'ethereum',
    supply: '1'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'art', label: 'Art', icon: Palette },
    { value: 'music', label: 'Music', icon: Zap },
    { value: 'photography', label: 'Photography', icon: ImageIcon },
    { value: 'sports', label: 'Sports', icon: Zap },
    { value: 'collectibles', label: 'Collectibles', icon: Tag },
    { value: 'gaming', label: 'Gaming', icon: Zap },
  ];

  const blockchains = [
    { value: 'ethereum', label: 'Ethereum', color: 'bg-blue-500' },
    { value: 'polygon', label: 'Polygon', color: 'bg-purple-500' },
    { value: 'solana', label: 'Solana', color: 'bg-green-500' },
    { value: 'binance', label: 'Binance Smart Chain', color: 'bg-yellow-500' }
  ];

  const currencies = ['ETH', 'MATIC', 'SOL', 'BNB', 'USD'];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const addProperty = () => {
    setProperties([...properties, {
      id: Date.now().toString(),
      trait_type: '',
      value: ''
    }]);
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter(prop => prop.id !== id));
  };

  const updateProperty = (id: string, field: keyof Omit<NFTProperty, 'id'>, value: string) => {
    setProperties(properties.map(prop => 
      prop.id === id ? { ...prop, [field]: value } : prop
    ));
  };

  const handleInputChange = (field: keyof NFTFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would handle the NFT creation/minting process
    console.log('NFT Data:', {
      file,
      formData,
      properties
    });
  };

  return (
    <RegularPageWrapper>
      <div className="min-h-screen  py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto container">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-main mb-2">Create New NFT</h1>
            <p className="text-muted text-sm sm:text-base max-w-2xl mx-auto">
              Upload your digital artwork and set up your NFT with detailed metadata and pricing
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:gap-8">
            {/* Left Column - Upload and Preview */}
            <div className="space-y-6">
              {/* File Upload */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload Artwork
                </h3>
      
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-300 hover:border-primary hover:bg-background'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
      
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto max-h-64 rounded-lg shadow-md"
                      />
                      <p className="text-sm text-gray-600">{file?.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setImagePreview('');
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16  rounded-full flex items-center justify-center mx-auto">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-main">Drop your image here</p>
                        <p className="text-sm text-muted mt-1">or click to browse files</p>
                        <p className="text-xs text-muted mt-2">Supports: JPG, PNG, GIF (Max 50MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* NFT Preview */}
              {imagePreview && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Preview
                  </h3>
      
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="NFT Preview"
                        className="w-full h-48 sm:h-56 object-cover"
                      />
                      <div className="p-4 space-y-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {formData.name || 'Untitled NFT'}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {formData.description || 'No description provided'}
                        </p>
                        {formData.price && (
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-500">Price</span>
                            <span className="font-semibold text-gray-900">
                              {formData.price} {formData.currency}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Right Column - Form Fields */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Basic Information
                </h3>
      
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      NFT Name *
                    </label>
                    <Input
                      placeholder='Enter NFT name'
                      value={formData.name}
                      bgColor='bg-background'
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Description
                    </label>
                    <Input
                      placeholder="Describe your NFT"
                      value={formData.description}
                      bgColor='bg-background'
                      type='textarea'
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Category *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() => handleInputChange('category', category.value)}
                            className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 ${
                              formData.category === category.value
                                ? 'border-primary bg-primary text-white'
                                : 'border-muted hover:border-muted text-muted'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{category.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {/* Pricing */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Pricing & Supply
                </h3>
      
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-muted mb-2">
                      Price *
                    </label>
                    <div className="flex rounded-lg border bg-background border-muted focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
                      <input
                        type="number"
                        step="0.001"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="0.00"
                        className="flex-1 px-4 py-3 placeholder:text-main border-0 bg-background text-main rounded-l-lg focus:ring-0 focus:outline-none"
                      />
                      <select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        className="px-3 py-3 bg-primary text-white border-0 rounded-r-lg focus:ring-0 focus:outline-none text-sm font-medium"
                      >
                        {currencies.map(currency => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      Supply
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.supply}
                      onChange={(e) => handleInputChange('supply', e.target.value)}
                      className="w-full px-4 py-3 border border-muted bg-background text-main rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      Royalties (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={formData.royalties}
                        onChange={(e) => handleInputChange('royalties', e.target.value)}
                        className="w-full px-4 py-3 pr-10 border border-muted bg-background text-main rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <Percent className="absolute right-3 top-3 w-5 h-5 text-main" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Blockchain Selection */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-main mb-4">
                  Blockchain
                </h3>
      
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blockchains.map((blockchain) => (
                    <button
                      key={blockchain.value}
                      type="button"
                      onClick={() => handleInputChange('blockchain', blockchain.value)}
                      className={`p-4 rounded-lg border transition-all text-main duration-200 flex items-center gap-3 ${
                        formData.blockchain === blockchain.value
                          ? 'border-blue-500 bg-primary text-white'
                          : 'border-main hover:border-primary'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${formData.blockchain !== blockchain.value ? blockchain.color : 'bg-white'}`} />
                      <span className="font-medium">{blockchain.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Properties */}
              <div className="bg-surface rounded-2xl shadow-sm border border-muted p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-main flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Properties
                  </h3>
                  <Button
                    type="button"
                    onClick={addProperty}
                    size='md'
                    sxclass='px-4'
                    // variant=''
                    // className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Property
                  </Button>
                </div>
      
                <div className="space-y-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Property name"
                        value={property.trait_type}
                        onChange={(e) => updateProperty(property.id, 'trait_type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={property.value}
                        onChange={(e) => updateProperty(property.id, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-main placeholder:text-main text-main bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeProperty(property.id)}
                        className="p-2 text-red-500 hover:text-red-700  hover:bg-red-50 rounded-lg transition-colors duration-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
      
                  {properties.length === 0 && (
                    <p className="text-muted text-sm text-center py-4">
                      No properties added yet. Click "Add Property" to get started.
                    </p>
                  )}
                </div>
              </div>
              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!file || !formData.name || !formData.category}
                size='md'
                fullWidth
                // className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                Create NFT
              </Button>
            </div>
          </form>
        </div>
      </div>
    </RegularPageWrapper>
  );
};

export default CreateNFTPage;