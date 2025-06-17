/**
 * Form History Component
 * Demonstrates integration with the backend APIs using the new API service
 */

'use client';

import React, { useState } from 'react';
import { useFormHistory, useFormStats } from '@/hooks/useApi';
import { AuthGuard } from '@/components/AuthGuard';
import { FormHistoryItem } from '@/types';

interface FormHistoryProps {
  onSelectForm?: (form: FormHistoryItem) => void;
}

const FormHistoryContent: React.FC<FormHistoryProps> = ({ onSelectForm }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { 
    history, 
    pagination, 
    isLoading, 
    error, 
    fetchHistory 
  } = useFormHistory({ page: currentPage, limit: 10 });
  
  const { stats, isLoading: statsLoading } = useFormStats();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchHistory({ page, limit: 10 });
  };

  if (isLoading && history.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading form history
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => fetchHistory()}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      {!statsLoading && stats.totalForms > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalForms}</div>
            <div className="text-sm text-blue-800">Analyzed Forms</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{history.length}</div>
            <div className="text-sm text-green-800">This Page</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {history.reduce((total, form) => total + form.fields.length, 0)}
            </div>
            <div className="text-sm text-purple-800">Total Fields</div>
          </div>
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <svg
            className="mx-auto h-16 w-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No forms analyzed yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Forms will appear here once you start using Infillo AI to analyze forms on websites.
          </p>
        </div>
      ) : (
                <div className="space-y-4">
          {history.map((form) => (
            <div
              key={form._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header with domain and badges */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{form.domain}</h3>
                        <p className="text-xs text-gray-500 truncate max-w-md">{form.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                      </span>
                      {form.suggestions && Object.keys(form.suggestions).length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {Object.keys(form.suggestions).length} suggestion{Object.keys(form.suggestions).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Suggestions preview */}
                  {form.suggestions && Object.keys(form.suggestions).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">AI Suggestions:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(form.suggestions).slice(0, 4).map(([field, suggestions]) => (
                          <span
                            key={field}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs bg-green-50 text-green-700 border border-green-200"
                          >
                            <span className="font-medium mr-1">{field}:</span>
                            <span className="truncate max-w-24">
                              {suggestions[0]?.value?.substring(0, 15) || 'No suggestion'}
                              {suggestions[0]?.value && suggestions[0].value.length > 15 ? '...' : ''}
                            </span>
                          </span>
                        ))}
                        {Object.keys(form.suggestions).length > 4 && (
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200">
                            +{Object.keys(form.suggestions).length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                </div>
                
                {/* Right side - date */}
                <div className="ml-6 text-right">
                  <div className="text-xs text-gray-500 mb-2">
                    Analyzed on
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(form.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} analyzed forms
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                pagination.page <= 1 || isLoading
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page > pagination.totalPages - 3) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isLoading}
                    className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                pagination.page >= pagination.totalPages || isLoading
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && history.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const FormHistory: React.FC<FormHistoryProps> = ({ onSelectForm }) => {
  return (
    <AuthGuard>
      <FormHistoryContent onSelectForm={onSelectForm} />
    </AuthGuard>
  );
}; 