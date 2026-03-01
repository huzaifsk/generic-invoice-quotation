import React, { ReactNode } from 'react';
import { AlertCircle } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-50 rounded-full">
                                <HugeiconsIcon icon={AlertCircle} size={24} className="text-red-600" aria-hidden />
                            </div>
                        </div>
                        <h1 className="text-lg font-semibold text-center text-slate-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-slate-600 text-center mb-4">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full ui-btn-primary ui-focus-ring px-4 py-2"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
