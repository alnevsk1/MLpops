import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Что-то пошло не так</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Перезагрузить</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
