import { Button, Card } from 'react-bootstrap';

function Graficos() {
  return (
    <div className="container py-4">
      <Card className="mb-4 shadow-sm border-0" style={{background: '#fff'}}>
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div style={{flex: 1}}>
              <h2 className="fw-bold text-primary mb-1">Monitoreo del Sistema Eólico</h2>
              <p className="text-muted mb-0" style={{fontSize: '1rem'}}>Mostrando: admin123@gmail.com | Dispositivo: 0001</p>
            </div>
            <div style={{width: '100%', maxWidth: '220px'}}>
              <Button 
                variant="primary"
                style={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
                  width: '100%',
                  minWidth: '140px',
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#007bff',
                  color: '#fff',
                  border: 'none',
                  transition: 'background 0.2s',
                }}
                className="mt-3 mt-md-0"
              >
                <i className="bi bi-arrow-repeat me-2" style={{color: '#fff'}}></i>
                <span style={{whiteSpace: 'nowrap', color: '#fff'}}>Recargar datos</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
      {/* Aquí van los gráficos y demás contenido */}
      <Card className="shadow-sm border-0 mb-4" style={{background: '#fff'}}>
        <Card.Body>
          <p>Contenido principal de la página</p>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Graficos;