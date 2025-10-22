// src/components/ErrorBoundary.js
import React from 'react';
import { Alert, Button, Container } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Actualizar el estado para que el siguiente renderizado muestre la UI alternativa
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Puedes registrar el error en un servicio de reporte de errores
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Recargar la página para reiniciar el componente
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier UI alternativa
      return (
        <Container className="py-5">
          <Alert variant="danger">
            <Alert.Heading>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Algo salió mal
            </Alert.Heading>
            <p>
              Ha ocurrido un error inesperado. Por favor, recarga la página o contacta con soporte si el problema persiste.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-3">
                <summary style={{ cursor: 'pointer' }}>Ver detalles técnicos</summary>
                <pre className="mt-2 p-3 bg-light rounded" style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <hr />
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={this.handleReset}>
                <i className="bi bi-arrow-clockwise me-2"></i>
                Recargar página
              </Button>
              <Button variant="outline-secondary" onClick={() => window.history.back()}>
                <i className="bi bi-arrow-left me-2"></i>
                Volver atrás
              </Button>
            </div>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
