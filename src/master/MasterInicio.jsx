import React from 'react';

export default function MasterInicio({ totalAtletas, atletasActivos, atletasInactivos, cambiarSeccion, navigate }) {
  return (
    <div>
      <h2>Resumen Ejecutivo</h2>
      <p style={{ color: '#aaa', marginBottom: '30px' }}>Indicadores clave y estado general de la Escuela DAEJI.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.85rem' }}>Total de Atletas</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: '#3498db' }}>{totalAtletas}</h3>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
          <p style={{ margin: '0 0 5px 0', color: '#2ecc71', fontSize: '0.85rem', fontWeight: 'bold' }}>Alumnos Activos</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: '#2ecc71' }}>{atletasActivos}</h3>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
          <p style={{ margin: '0 0 5px 0', color: '#e74c3c', fontSize: '0.85rem', fontWeight: 'bold' }}>Alumnos Inactivos</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: '#e74c3c' }}>{atletasInactivos}</h3>
        </div>
      </div>

      <div className="tarjeta-auth" style={{ textAlign: 'left' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Accesos Rápidos</h3>
        <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '20px' }}>Selecciona una herramienta del menú lateral izquierdo para gestionar la academia.</p>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => cambiarSeccion('gestion')} className="btn-secundario" style={{ background: '#e63946', color: '#fff', border: 'none' }}>
            Gestionar Atletas &rarr;
          </button>
          <button onClick={() => cambiarSeccion('eventos')} className="btn-secundario" style={{ background: '#e63946', color: '#fff', border: 'none' }}>
            Crear Eventos &rarr;
          </button>
          <button onClick={() => cambiarSeccion('roles')} className="btn-secundario" style={{ background: '#3498db', color: '#fff', border: 'none' }}>
            Gestión de Roles &rarr;
          </button>
          <button onClick={() => cambiarSeccion('asistencia')} className="btn-secundario" style={{ background: '#2ecc71', color: '#fff', border: 'none' }}>
            Control de Asistencia &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}