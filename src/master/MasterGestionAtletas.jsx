import React, { useState } from 'react';

export default function MasterGestionAtletas({ listaAtletasGlobal, manejarCambioLocalAtleta, manejarCambioDiasLocal, guardarCambiosMasivosAtletas, guardandoMasivoAtletas }) {
  const [busquedaAtleta, setBusquedaAtleta] = useState('');
  const diasSemanaDisponibles = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados", "Domingo"];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>Gestión Global de Atletas</h2>
          <p style={{ color: '#aaa', margin: 0 }}>Modifica los datos libremente y guarda todo al final de la página.</p>
        </div>
        <button onClick={guardarCambiosMasivosAtletas} className="btn-principal" style={{ padding: '12px 25px', background: '#2ecc71', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', borderRadius: '8px' }} disabled={guardandoMasivoAtletas}>
          {guardandoMasivoAtletas ? 'GUARDANDO CAMBIOS...' : 'GUARDAR CAMBIOS MASIVOS'}
        </button>
      </div>

      <input
        type="text"
        placeholder="🔍 Buscar por nombre o cédula..."
        value={busquedaAtleta}
        onChange={(e) => setBusquedaAtleta(e.target.value)}
        style={{ width: '100%', padding: '12px 15px', marginBottom: '20px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {listaAtletasGlobal
          .filter(a => `${a.nombre1} ${a.apellido1} ${a.cedula}`.toLowerCase().includes(busquedaAtleta.toLowerCase()))
          .map((atleta) => {
            const diasAsignados = atleta.disciplina?.diasEntreno || [];
            return (
              <div key={atleta.id} style={{ background: 'rgba(10, 25, 47, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2.5fr 1fr', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#fff' }}>{atleta.nombre1} {atleta.apellido1} {atleta.apellido2}</h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                    Cédula: {atleta.cedula} | <strong style={{ color: '#f39c12' }}>Edad: {atleta.edad} años ({atleta.categoria})</strong>
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Estado</label>
                  <select value={atleta.estado || 'Activo'} onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'estado', e.target.value)} style={{ padding: '6px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%' }}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Tipo / Cuota</label>
                  <select value={atleta.financiera?.tipoAlumno || 'Regular'} onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'financiera.tipoAlumno', e.target.value)} style={{ padding: '6px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%', marginBottom: '4px' }}>
                    <option value="Regular">Regular</option>
                    <option value="Becado">Becado</option>
                  </select>
                  <input type="text" value={atleta.financiera?.cuotaMensual || ''} placeholder="Cuota ₡" onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'financiera.cuotaMensual', e.target.value)} style={{ padding: '5px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Días de Entreno</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {diasSemanaDisponibles.map((dia) => {
                      const seleccionado = diasAsignados.includes(dia);
                      return (
                        <button key={dia} type="button" onClick={() => manejarCambioDiasLocal(atleta.id, dia)} style={{ padding: '4px 6px', fontSize: '0.65rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: seleccionado ? '#e63946' : 'rgba(255,255,255,0.08)', color: seleccionado ? '#fff' : '#aaa' }}>
                          {dia.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Grado</label>
                  <select value={atleta.disciplina?.grado || 'Cinturón Blanco'} onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'disciplina.grado', e.target.value)} style={{ padding: '6px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%', fontSize: '0.85rem' }}>
                    <option value="Cinturón Blanco">Blanco (10° Gup)</option>
                    <option value="Cinturón Blanco-Amarillo">Blanco-Amarillo (9° Gup)</option>
                    <option value="Cinturón Amarillo">Amarillo (8° Gup)</option>
                    <option value="Cinturón Naranja">Naranja (7° Gup)</option>
                    <option value="Cinturón Verde">Verde (6° Gup)</option>
                    <option value="Cinturón Verde-Azul">Verde-Azul (5° Gup)</option>
                    <option value="Cinturón Azul">Azul (4° Gup)</option>
                    <option value="Cinturón Azul-Rojo">Azul-Rojo (3° Gup)</option>
                    <option value="Cinturón Rojo">Rojo (2° Gup)</option>
                    <option value="Cinturón Rojo-Negro">Rojo-Negro (1° Gup)</option>
                    <option value="Cinturón Negro 1er Dan">Negro (1er Dan)</option>
                    <option value="Cinturón Negro 2do Dan">Negro (2do Dan)</option>
                  </select>
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ marginTop: '20px', textAlign: 'right', background: 'rgba(7, 17, 30, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={guardarCambiosMasivosAtletas} className="btn-principal" style={{ padding: '15px 30px', background: '#2ecc71', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', borderRadius: '8px' }} disabled={guardandoMasivoAtletas}>
          {guardandoMasivoAtletas ? 'GUARDANDO CAMBIOS...' : 'GUARDAR TODOS LOS CAMBIOS DE ATLETAS (MASIVO)'}
        </button>
      </div>
    </div>
  );
}