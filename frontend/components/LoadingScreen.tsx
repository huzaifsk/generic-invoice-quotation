import React from 'react';

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-slate-900 animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-slate-600">Loading...</p>
        </div>
    </div>
);

export default LoadingScreen;
