import React from 'react';

export default function MasterMigracion({ descargarPlantillaCSV, setArchivoSeleccionado, procesando, progreso, iniciarMigracionMasiva }) {
  return (
    <div className="tarjeta-auth" style={{ width: '100%', textAlign: 'left', maxWidth: '800px' }}>
      <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Módulo de Migración y Carga Masiva</h3>
      <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
        En la columna <strong>diasEntreno</strong> de tu CSV, puedes escribir los días separados por comas (ej: <code style={{ color: '#3498db' }}>Lunes, Miércoles, Viernes</code>).
      </p>
      
      <div style={{ margin: '25px 0', background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>1. Obtén la estructura base</h4>
          <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Plantilla CSV actualizada con soporte para días múltiples.</p>
        </div>
        <button onClick={descargarPlantillaCSV} className="btn-secundario" style={{ background: '#3498db', color: '#fff', border: 'none' }}>
          Descargar Plantilla CSV
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>2. Sube el archivo completado</h4>
        <input type="file" accept=".csv" onChange={(e) => setArchivoSeleccionado(e.target.files[0])} style={{ width: '100%', padding: '10px', background: '#121212', borderRadius: '8px', border: '1px solid #333', color: '#fff' }} />
        {procesando && <p style={{ color: '#f39c12', marginTop: '15px', fontWeight: 'bold', textAlign: 'center' }}>{progreso}</p>}
        <button className="btn-principal ancho-completo" style={{ marginTop: '15px', opacity: procesando ? 0.7 : 1, cursor: procesando ? 'not-allowed' : 'pointer' }} onClick={iniciarMigracionMasiva} disabled={procesando}>
          {procesando ? 'IMPORTANDO DATOS...' : 'Procesar e Iniciar Migración Masiva'}
        </button>
      </div>
    </div>
  );
}