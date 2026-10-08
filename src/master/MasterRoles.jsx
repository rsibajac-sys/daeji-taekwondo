import React from 'react';

export default function MasterRoles({
  listaTutores,
  tutorSeleccionado,
  seleccionarTutor,
  cargandoRoles,
  modulosDisponibles,
  permisosTutor,
  cambiarCheckModulo,
  guardarPermisosTutor
}) {
  return (
    <div style={{ maxWidth: '850px' }}>
      <h2>Gestión de Roles y Permisos por Tutor</h2>
      <p style={{ color: '#aaa', marginBottom: '25px' }}>Selecciona un tutor registrado y asígnale los módulos o páginas autorizadas.</p>
      
      <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', marginBottom: '25px' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: '#3498db', marginBottom: '8px', fontWeight: 'bold' }}>Seleccionar Tutor / Correo Electrónico:</label>
        <select value={tutorSeleccionado} onChange={(e) => seleccionarTutor(e.target.value)} style={{ width: '100%', padding: '12px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px', fontSize: '0.95rem' }}>
          <option value="">-- Seleccione un tutor --</option>
          {listaTutores.map((correo, idx) => (
            <option key={idx} value={correo}>{correo}</option>
          ))}
        </select>
      </div>

      {tutorSeleccionado && (
        <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            Páginas autorizadas para: <span style={{ color: '#2ecc71' }}>{tutorSeleccionado}</span>
          </h3>
          {cargandoRoles ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Cargando permisos...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modulosDisponibles.map((modulo) => (
                <label key={modulo.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input type="checkbox" checked={permisosTutor[modulo.id] || false} onChange={() => cambiarCheckModulo(modulo.id)} style={{ width: '20px', height: '20px', accentColor: '#e63946', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>{modulo.label}</span>
                </label>
              ))}
            </div>
          )}
          <div style={{ marginTop: '25px', textAlign: 'right' }}>
            <button onClick={guardarPermisosTutor} style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}>
              Guardar Permisos del Tutor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}