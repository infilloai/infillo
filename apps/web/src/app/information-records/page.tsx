"use client";

import React, { useState, useMemo } from 'react';
import { NavigationBar } from "@/components/NavigationBar";
import { PageHeader } from "@/components/PageHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, Search, Plus, FileText, User, Settings, FormInput, Shield, Download, Upload, Trash2, Eye, Edit, Globe, X, Filter, SortAsc, SortDesc, Copy, MoreVertical, RefreshCcw, Calendar, FileType, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_CONTENT, LAYOUT } from "@/lib/constants";
import { useUserContexts, useDocuments, useProviders, useBlockedOrigins, useDashboardStats } from "@/hooks/useApi";
import { DocumentUpload } from "@/components/DocumentUpload";
import { FormHistory } from "@/components/FormHistory";
import type { UserContext, UserContextData } from "@/types";

// Enhanced loading skeleton component
const LoadingSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid gap-4">
    {[...Array(count)].map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="h-5 bg-gray-200 rounded w-16"></div>
            <div className="h-5 bg-gray-200 rounded w-12"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Enhanced empty state component
const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <Card className="text-center py-16 border-dashed border-2 border-gray-200 bg-gray-50/50">
    <CardContent>
      <Icon className="h-16 w-16 mx-auto text-gray-300 mb-6" />
      <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="h-10 px-6 cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </CardContent>
  </Card>
);

// Enhanced search and filter bar
const SearchAndFilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  showFilters = false,
  onFilterToggle,
  sortBy,
  onSortChange,
  contextType,
  onContextTypeChange
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFilters?: boolean;
  onFilterToggle?: () => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  contextType?: string;
  onContextTypeChange?: (type: string) => void;
}) => (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search records, documents, or settings..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
      <div className="flex gap-2">
        {onFilterToggle && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onFilterToggle}
            className={`cursor-pointer ${showFilters ? "bg-blue-50 border-blue-200" : ""}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        )}
        {sortBy && onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer">
                {sortBy === 'date-desc' ? <SortDesc className="h-4 w-4 mr-2" /> : <SortAsc className="h-4 w-4 mr-2" />}
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSortChange('date-desc')} className="cursor-pointer">
                <Calendar className="h-4 w-4 mr-2" />
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('date-asc')} className="cursor-pointer">
                <Calendar className="h-4 w-4 mr-2" />
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('name-asc')} className="cursor-pointer">
                <SortAsc className="h-4 w-4 mr-2" />
                Name A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('name-desc')} className="cursor-pointer">
                <SortDesc className="h-4 w-4 mr-2" />
                Name Z-A
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
    
    {showFilters && (
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border">
        {contextType !== undefined && onContextTypeChange && (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Type:</Label>
            <Select value={contextType} onChange={(e) => onContextTypeChange(e.target.value)}>
              <option value="">All types</option>
              <option value="personal">Personal</option>
              <option value="professional">Professional</option>
              <option value="document">Document</option>
              <option value="form">Form</option>
              <option value="preference">Preference</option>
            </Select>
          </div>
        )}
      </div>
    )}
  </div>
);

// Modal Components
const UserContextModal = ({
  open,
  onOpenChange,
  context,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: UserContext | null;
  onSave: (data: UserContextData) => Promise<void>;
}) => {
  const [formData, setFormData] = useState<UserContextData>({
    key: context?.key || '',
    value: context?.value || '',
    tags: context?.tags || [],
    metadata: context?.metadata || {}
  });

  // Reset form data when context changes
  React.useEffect(() => {
    if (context) {
      setFormData({
        key: context.key || '',
        value: context.value || '',
        tags: context.tags || [],
        metadata: context.metadata || {}
      });
    } else {
      setFormData({
        key: '',
        value: '',
        tags: [],
        metadata: {}
      });
    }
    setErrors({});
  }, [context]);
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.key.trim()) {
      newErrors.key = 'Key/Label is required';
    }
    
    if (formData.key.length > 100) {
      newErrors.key = 'Key must be less than 100 characters';
    }
    
    if (!formData.value.trim()) {
      newErrors.value = 'Value/Content is required';
    }
    
    if (formData.value.length > 5000) {
      newErrors.value = 'Value must be less than 5000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
      setErrors({});
    } catch (error) {
      console.error('Failed to save context:', error);
      setErrors({ general: 'Failed to save. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {context ? 'Edit Information Record' : 'Add New Information Record'}
            </div>
          </DialogTitle>
          <DialogDescription>
            {context ? 'Update your personal information to improve form filling accuracy.' : 'Add new personal information to help InfilloAI fill forms more accurately.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errors.general}</span>
            </div>
          )}

          <div>
            <Label htmlFor="key" className="text-sm font-medium">Label/Key *</Label>
            <Input
              id="key"
              placeholder="e.g., Name, Email, Phone, Address, Company"
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
              className={`mt-1 ${errors.key ? 'border-red-300' : ''}`}
            />
            {errors.key && (
              <p className="text-red-600 text-sm mt-1">{errors.key}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              A short identifier for this information (e.g., "Full Name", "Work Email")
            </p>
          </div>

          <div>
            <Label htmlFor="value" className="text-sm font-medium">Value/Content *</Label>
            <Textarea
              id="value"
              placeholder="Enter your information (e.g., John Doe, john@example.com, +1234567890)"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              rows={4}
              className={`mt-1 ${errors.value ? 'border-red-300' : ''}`}
            />
            {errors.value && (
              <p className="text-red-600 text-sm mt-1">{errors.value}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {formData.value.length}/5000 characters
            </p>
          </div>

          <div>
            <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="tags"
                placeholder="Add a tag (e.g., contact, address, work)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm" className="cursor-pointer">
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !formData.key.trim() || !formData.value.trim()} className={`${isLoading || !formData.key.trim() || !formData.value.trim() ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {isLoading ? (
              <>
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {context ? 'Update Record' : 'Create Record'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BlockedOriginModal = ({
  open,
  onOpenChange,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (origin: string) => Promise<void>;
}) => {
  const [origin, setOrigin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateOrigin = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!origin.trim()) {
      newErrors.origin = 'Origin is required';
    } else {
      // Basic URL/domain validation
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(origin.trim())) {
        newErrors.origin = 'Please enter a valid URL or domain';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateOrigin()) return;
    
    setIsLoading(true);
    try {
      await onSave(origin.trim());
      setOrigin('');
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to block origin:', error);
      setErrors({ general: 'Failed to block origin. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Block Website
            </div>
          </DialogTitle>
          <DialogDescription>
            Add a website or domain to prevent InfilloAI from working on it. This helps you maintain privacy on sensitive sites.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errors.general}</span>
            </div>
          )}

          <div>
            <Label htmlFor="origin" className="text-sm font-medium">Website URL or Domain *</Label>
            <Input
              id="origin"
              placeholder="https://example.com or example.com"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className={`mt-1 ${errors.origin ? 'border-red-300' : ''}`}
            />
            {errors.origin && (
              <p className="text-red-600 text-sm mt-1">{errors.origin}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Examples: facebook.com, https://banking.example.com, *.privatesite.com
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !origin.trim()} className={`${isLoading || !origin.trim() ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {isLoading ? (
              <>
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                Blocking...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Block Website
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteConfirmModal = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading} className={`${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Tab-specific components to avoid calling all API hooks simultaneously
const PersonalTab = ({ searchQuery }: { searchQuery: string }) => {
  const [paginationParams, setPaginationParams] = useState({ page: 1, limit: 10 });
  const { contexts: userContexts, isLoading: contextsLoading, pagination, createContext, updateContext, deleteContext, fetchContexts } = useUserContexts(paginationParams);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<UserContext | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'manual': return User;
      case 'document': return FileText;
      case 'form': return FormInput;
      default: return User;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'manual': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'document': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'form': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleCreate = async (data: UserContextData) => {
    await createContext(data);
    // Reset to first page to see the new record
    if (paginationParams.page !== 1) {
      setPaginationParams(prev => ({ ...prev, page: 1 }));
    }
  };

  const handleUpdate = async (data: UserContextData) => {
    if (selectedContext) {
      await updateContext(selectedContext._id, data);
      setSelectedContext(null);
    }
  };

  const handleDelete = async () => {
    if (selectedContext) {
      setIsDeleting(true);
      try {
        await deleteContext(selectedContext._id);
        setSelectedContext(null);
        
        // If we're on a page that would be empty after deletion, go to previous page
        const remainingItems = pagination.total - 1;
        const maxPage = Math.ceil(remainingItems / paginationParams.limit);
        if (paginationParams.page > maxPage && maxPage > 0) {
          setPaginationParams(prev => ({ ...prev, page: maxPage }));
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDuplicate = async (context: UserContext) => {
    const duplicateData: UserContextData = {
      key: context.key + ' (Copy)',
      value: context.value,
      tags: [...(context.tags || [])],
      metadata: { ...context.metadata }
    };
    await createContext(duplicateData);
    // Reset to first page to see the new record
    if (paginationParams.page !== 1) {
      setPaginationParams(prev => ({ ...prev, page: 1 }));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPaginationParams(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPaginationParams({ page: 1, limit: newLimit });
  };

  const openEditModal = (context: UserContext) => {
    setSelectedContext(context);
    setEditModalOpen(true);
  };

  const openDeleteModal = (context: UserContext) => {
    setSelectedContext(context);
    setDeleteModalOpen(true);
  };

  // Pagination component
  const PaginationControls = () => {
    if (!pagination) return null;

    const { page, totalPages, total, limit } = pagination;
    const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
    const endItem = Math.min(page * limit, total);

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {total > 0 ? `Showing ${startItem}-${endItem} of ${total} records` : 'No records found'}
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm">Per page:</Label>
            <Select 
              value={limit.toString()} 
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleLimitChange(Number(e.target.value))}
              className="w-20 cursor-pointer"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || contextsLoading || totalPages === 0}
            className={`cursor-pointer ${page <= 1 || contextsLoading || totalPages === 0 ? 'cursor-not-allowed' : ''}`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {/* Show page numbers */}
            {totalPages > 0 ? Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page > totalPages - 3) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={contextsLoading}
                  className={`w-10 cursor-pointer ${contextsLoading ? 'cursor-not-allowed' : ''}`}
                >
                  {pageNum}
                </Button>
              );
            }) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-10 cursor-not-allowed"
              >
                1
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || contextsLoading || totalPages === 0}
            className={`cursor-pointer ${page >= totalPages || contextsLoading || totalPages === 0 ? 'cursor-not-allowed' : ''}`}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
          <p className="text-gray-600 text-sm mt-1">
            Manage your personal details to improve form filling accuracy
            {pagination && pagination.total > 0 && (
              <span className="ml-2 text-gray-500">
                ({pagination.total} record{pagination.total !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {contextsLoading ? (
        <LoadingSkeleton count={4} />
      ) : userContexts && userContexts.length > 0 ? (
        <>
          <div className="grid gap-4">
            {userContexts.map((context) => {
              if (!context) return null;
              const IconComponent = getSourceIcon(context.source || 'manual');
              return (
                <Card key={context._id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComponent className="h-4 w-4 text-gray-600" />
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium ${getSourceColor(context.source || 'manual')}`}
                          >
                            {context.source?.charAt(0).toUpperCase() + context.source?.slice(1) || 'Manual'}
                          </Badge>
                          {context.accessCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Used {context.accessCount} times
                            </Badge>
                          )}
                        </div>
                        <div className="mb-2">
                          <h4 className="font-medium text-gray-900">{context.key}</h4>
                        </div>
                        <CardDescription className="text-gray-700 leading-relaxed">
                          {context.value ? (
                            context.value.length > 120 
                              ? context.value.substring(0, 120) + '...' 
                              : context.value
                          ) : 'No value'}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(context)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(context)} className="cursor-pointer">
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteModal(context)}
                            className="text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {context.tags && context.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {context.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {context.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{context.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                      <span>
                        Created {context.createdAt ? new Date(context.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                      <span>
                        Last used {context.lastAccessed ? new Date(context.lastAccessed).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <PaginationControls />
        </>
      ) : (
        <EmptyState
          icon={User}
          title="No personal information found"
          description="Start building your personal information database to make form filling faster and more accurate. Add details like your contact information, addresses, and preferences."
          actionLabel="Add Your First Record"
          onAction={() => setCreateModalOpen(true)}
        />
      )}

      {/* Modals */}
      <UserContextModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={handleCreate}
      />

      <UserContextModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        context={selectedContext}
        onSave={handleUpdate}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Information Record"
        description={`Are you sure you want to delete "${selectedContext?.key || 'this information'}" record? This action cannot be undone and may affect form filling accuracy.`}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

const DocumentsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { documents, isLoading: documentsLoading, deleteDocument } = useDocuments();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filterData = (items: any[], searchFields: string[]) => {
    if (!searchQuery || !items) return items || [];
    return items.filter((item: any) => {
      if (!item) return false;
      return searchFields.some((field: string) => {
        const value = field.split('.').reduce((obj: any, key: string) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  };

  const handleDelete = async () => {
    if (selectedDocument) {
      setIsDeleting(true);
      try {
        await deleteDocument(selectedDocument._id);
        setSelectedDocument(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const openDeleteModal = (document: any) => {
    setSelectedDocument(document);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <DocumentUpload />

      {documentsLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filterData(documents || [], ['fileName', 'mimeType']).map((doc) => {
            if (!doc) return null;
            return (
              <Card key={doc._id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{doc.fileName || 'Unknown file'}</CardTitle>
                      <CardDescription>
                        {doc.mimeType || 'Unknown type'} • {doc.fileSize ? Math.round(doc.fileSize / 1024) : 0} KB
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteModal(doc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={doc.processingStatus === 'completed' ? 'default' : 'secondary'}>
                      {doc.processingStatus || 'unknown'}
                    </Badge>
                  </div>
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {doc.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

const FormsTab = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Form History</h3>
      </div>
      <FormHistory />
    </div>
  );
};

const BlockedOriginsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { blockedOrigins, isLoading: originsLoading, blockOrigin, unblockOrigin } = useBlockedOrigins();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filterData = (items: any[], searchFields: string[]) => {
    if (!searchQuery || !items) return items || [];
    return items.filter((item: any) => {
      if (!item) return false;
      return searchFields.some((field: string) => {
        const value = field.split('.').reduce((obj: any, key: string) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  };

  const handleCreate = async (origin: string) => {
    await blockOrigin(origin);
  };

  const handleUnblock = async () => {
    if (selectedOrigin) {
      setIsDeleting(true);
      try {
        await unblockOrigin(selectedOrigin.origin);
        setSelectedOrigin(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const openDeleteModal = (origin: any) => {
    setSelectedOrigin(origin);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Blocked Origins</h3>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Shield className="h-4 w-4 mr-2" />
          Add Origin
        </Button>
      </div>

      {originsLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filterData(blockedOrigins || [], ['origin', 'domain']).map((blockedOrigin) => {
            if (!blockedOrigin) return null;
            return (
              <Card key={blockedOrigin.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {blockedOrigin.origin || 'Unknown origin'}
                      </CardTitle>
                      <CardDescription>Domain: {blockedOrigin.domain || 'Unknown domain'}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteModal(blockedOrigin)}
                      >
                        Unblock
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Blocked since:</span>
                    <span className="font-medium">
                      {blockedOrigin.createdAt ? new Date(blockedOrigin.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="destructive" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Blocked
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!blockedOrigins || blockedOrigins.length === 0) && (
            <Card className="text-center py-12">
              <CardContent>
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No blocked origins</h3>
                <p className="text-gray-600 mb-4">Block websites to prevent InfilloAI from working on them</p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Block your first origin
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <BlockedOriginModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={handleCreate}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Unblock Origin"
        description={`Are you sure you want to unblock ${selectedOrigin?.origin}? InfilloAI will be able to work on this website again.`}
        onConfirm={handleUnblock}
        isLoading={isDeleting}
      />
    </div>
  );
};

const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Data</CardTitle>
              <CardDescription>Download all your information records</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clear Cache</CardTitle>
              <CardDescription>Clear stored suggestions and temporary data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                Clear Cache
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const InformationRecordsContent = () => {
  const { title, description, tabs, searchPlaceholder } = PAGE_CONTENT.INFORMATION_RECORDS;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>(tabs.PERSONAL);

  // Get dashboard statistics for tab counts
  const { stats: dashboardStats, isLoading: statsLoading } = useDashboardStats();

  // Debounce search query for better performance
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear search when switching tabs
  React.useEffect(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, [activeTab]);

  const getTabStats = () => {
    if (!dashboardStats) return {
      personal: '',
      documents: '',
      forms: '',
      origins: '',
      settings: ''
    };

    const { overview } = dashboardStats;
    return {
      personal: overview.personalRecords > 0 ? `${overview.personalRecords} record${overview.personalRecords !== 1 ? 's' : ''}` : '',
      documents: overview.documents > 0 ? `${overview.documents} file${overview.documents !== 1 ? 's' : ''}` : '',
      forms: overview.forms > 0 ? `${overview.forms} submission${overview.forms !== 1 ? 's' : ''}` : '',
      origins: overview.blockedOrigins > 0 ? `${overview.blockedOrigins} blocked` : '',
      settings: ''
    };
  };

  const tabStats = getTabStats();

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      <NavigationBar />
      <main className={`flex justify-center w-full ${LAYOUT.PADDING.PAGE} flex-1 bg-[var(--bg-main)]`}>
        <div className="flex-1 flex flex-col">
          <PageHeader
            title={title}
            description={description}
          />

          <main className="flex-1" style={{ maxWidth: LAYOUT.MAX_WIDTH.RECORDS, margin: '0 auto', width: '100%' }}>
            <div className={LAYOUT.PADDING.PAGE}>
              {/* Enhanced Search Bar - Hidden for Personal tab */}
              {activeTab !== tabs.PERSONAL && (
                <div className="mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder={`Search ${activeTab === tabs.DOCUMENTS ? 'documents' : activeTab === tabs.FORMS ? 'forms' : activeTab === tabs.BLOCKED_ORIGINS ? 'blocked sites' : 'settings'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 text-base bg-white border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {debouncedSearchQuery && (
                    <p className="text-sm text-gray-600 mt-2">
                      Searching for "{debouncedSearchQuery}"...
                    </p>
                  )}
                </div>
              )}

              {/* Enhanced Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`grid w-full grid-cols-5 h-auto p-1 bg-gray-100 rounded-lg ${activeTab === tabs.PERSONAL ? 'mb-8' : ''}`}>
                  <TabsTrigger 
                    value={tabs.PERSONAL} 
                    className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Personal</span>
                    {tabStats.personal && (
                      <span className="text-xs text-gray-500">{tabStats.personal}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value={tabs.DOCUMENTS} 
                    className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">Documents</span>
                    {tabStats.documents && (
                      <span className="text-xs text-gray-500">{tabStats.documents}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value={tabs.FORMS} 
                    className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <FormInput className="h-4 w-4" />
                    <span className="text-sm font-medium">Forms</span>
                    {tabStats.forms && (
                      <span className="text-xs text-gray-500">{tabStats.forms}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value={tabs.BLOCKED_ORIGINS} 
                    className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Blocked</span>
                    {tabStats.origins && (
                      <span className="text-xs text-gray-500">{tabStats.origins}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value={tabs.SETTINGS} 
                    className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value={tabs.PERSONAL} className="mt-0">
                    <PersonalTab searchQuery={debouncedSearchQuery} />
                  </TabsContent>

                  <TabsContent value={tabs.DOCUMENTS} className="mt-0">
                    <DocumentsTab searchQuery={debouncedSearchQuery} />
                  </TabsContent>

                  <TabsContent value={tabs.FORMS} className="mt-0">
                    <FormsTab />
                  </TabsContent>

                  <TabsContent value={tabs.BLOCKED_ORIGINS} className="mt-0">
                    <BlockedOriginsTab searchQuery={debouncedSearchQuery} />
                  </TabsContent>

                  <TabsContent value={tabs.SETTINGS} className="mt-0">
                    <SettingsTab />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </main>
        </div>
      </main>
    </div>
  );
};

export default function InformationRecordsPage() {
  return (
    <AuthGuard>
      <InformationRecordsContent />
    </AuthGuard>
  );
} 