import React from 'react';

export default function MasterEventos({
  tituloEvento, setTituloEvento,
  tipoEvento, setTipoEvento,
  descripcionEvento, setDescripcionEvento,
  costoEvento, setCostoEvento,
  fechaInicioVisibilidad, setFechaInicioVisibilidad,
  fechaFinVisibilidad, setFechaFinVisibilidad,
  fechaRealEvento, setFechaRealEvento,
  fechaLimitePago, setFechaLimitePago,
  guardandoEvento, crearNuevoEvento, listaEventos
}) {
  return (
    <div style={{ maxWidth: '900px' }}>
      <h2>Convocatorias, Exámenes y Eventos</h2>
      <p style={{ color: '#aaa', marginBottom: '25px' }}>Crea eventos oficiales. El sistema validará automáticamente la asistencia, antigüedad y pagos al inscribirse.</p>
      
      <form onSubmit={crearNuevoEvento} style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Crear Nuevo Evento / Examen</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Título del Evento</label>
            <input type="text" placeholder="Ej. Examen de Promoción Diciembre" value={tituloEvento} onChange={(e) => setTituloEvento(e.target.value)} required style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Tipo de Evento</label>
            <select value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}>
              <option value="Examen">Examen de Grado</option>
              <option value="Capacitacion">Capacitación</option>
              <option value="Exhibicion">Exhibición</option>
              <option value="Torneo">Torneo / Competencia</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Descripción y Requisitos</label>
          <textarea rows="3" placeholder="Detalles, lugar, hora..." value={descripcionEvento} onChange={(e) => setDescripcionEvento(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Costo (₡ Colones)</label>
            <input type="text" placeholder="Ej. 15000" value={costoEvento} onChange={(e) => setCostoEvento(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha Real del Evento</label>
            <input type="date" value={fechaRealEvento} onChange={(e) => setFechaRealEvento(e.target.value)} required style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha Límite de Pago</label>
            <input type="date" value={fechaLimitePago} onChange={(e) => setFechaLimitePago(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <button type="submit" disabled={guardandoEvento} style={{ background: '#e63946', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {guardandoEvento ? 'Publicando...' : 'Publicar Evento Oficial'}
          </button>
        </div>
      </form>

      <h3 style={{ marginBottom: '15px', color: '#fff' }}>Eventos Activos Creados ({listaEventos.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {listaEventos.map((ev) => (
          <div key={ev.id} style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px' }}>
            <span style={{ background: '#3498db', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{ev.tipo}</span>
            <h4 style={{ margin: '8px 0 5px 0', color: '#fff', fontSize: '1.1rem' }}>{ev.titulo}</h4>
            <p style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.9rem' }}>{ev.descripcion}</p>
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: '#f39c12' }}>
              <span>Fecha: {ev.fechaReal}</span>
              <span>Costo: ₡{ev.costo}</span>
              <span>Límite de Pago: {ev.fechaLimitePago}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}