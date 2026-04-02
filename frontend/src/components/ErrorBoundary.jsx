import React from 'react';
import { useLocation } from 'react-router-dom';

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  componentDidUpdate(prevProps) {
    // Reset error state when route changes
    if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
          <div className="mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-semibold mb-2">Algo salió mal en esta sección</h2>
          <p className="text-muted-foreground text-sm mb-5 max-w-sm">
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundaryInner locationKey={location.key}>
      {children}
    </ErrorBoundaryInner>
  );
}
