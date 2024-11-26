'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthErrorPage() {
  const router = useRouter();
  const [error, setError] = useState<{
    type: string;
    code: string;
    description: string;
  }>({ type: '', code: '', description: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      setError({
        type: params.get('error') || '',
        code: params.get('error_code') || '',
        description: params.get('error_description') || ''
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <div className="mt-4">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error Type: {error.type}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Code: {error.code}</p>
                    <p>Description: {decodeURIComponent(error.description)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/auth')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}