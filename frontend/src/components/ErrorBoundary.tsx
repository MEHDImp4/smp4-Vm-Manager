import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                    <div className="max-w-md w-full text-center space-y-4">
                        <h1 className="text-4xl font-bold text-destructive">Oops!</h1>
                        <h2 className="text-2xl font-semibold">Something went wrong</h2>
                        <p className="text-muted-foreground">
                            {this.state.error?.message || "An unexpected error occurred. Please try again."}
                        </p>
                        <div className="pt-4">
                            <Button onClick={this.handleReload} variant="default" size="lg">
                                Reload Application
                            </Button>
                        </div>
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <pre className="mt-4 p-4 bg-muted rounded text-left text-xs overflow-auto max-h-64">
                                {this.state.error.stack}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
