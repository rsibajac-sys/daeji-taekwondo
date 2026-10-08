import React from 'react';

export default function TutorInicio({ atletzasConAtrasos, permisosTutor, navigate }) {
  return (
    <div>
      {atletzasConAtrasos.length > 0 ? (
        <div style={{ background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e74c3c', borderRadius: '14px', padding: '25px', marginBottom: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#e74c3c', fontSize: '1.3rem' }}>Aviso de Atraso en Mensualidades</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#f5b7b1' }}>
                Se detectaron pagos pendientes correspondientes al periodo actual para los siguientes atletas vinculados a tu cuenta:
              </p>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#fff' }}>
            {atletzasConAtrasos.map((atleta) => (
              <li key={atleta.id} style={{ margin: '6px 0', fontSize: '0.95rem' }}>
                <strong>{atleta.nombre1} {atleta.apellido1}</strong> — Cuota mensual: <span style={{ color: '#2ecc71' }}>₡{atleta.financiera?.cuotaMensual || '0'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid #2ecc71', borderRadius: '14px', padding: '25px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '2rem' }}>✅</span>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#2ecc71', fontSize: '1.2rem' }}>¡Al Día con la Academia!</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#a3e4d7' }}>
              Todos tus atletas registrados se encuentran al día con sus mensualidades correspondientes a este periodo.
            </p>
          </div>
        </div>
      )}

      <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', color: '#fff' }}>Panel de Control del Tutor</h2>
        <p style={{ margin: 0, color: '#aaa', fontSize: '0.95rem' }}>
          Bienvenido al sistema institucional DAEJI. Selecciona una herramienta autorizada abajo o navega a través del menú.
        </p>

        {(permisosTutor.asistencias || permisosTutor.pagos || permisosTutor.evaluaciones || permisosTutor.competencias || permisosTutor.gestionAtletas || permisosTutor.eventos) && (
          <div style={{ marginTop: '25px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
            <p style={{ fontSize: '0.8rem', color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
              Módulos Autorizados para tu Cuenta:
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              
              {permisosTutor.asistencias && (
                <button onClick={() => navigate('/asistencia')} style={{ background: 'linear-gradient(135deg, #2980b9, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  📋 Control de Asistencias &rarr;
                </button>
              )}
              {permisosTutor.pagos && (
                <button onClick={() => navigate('/pagos')} style={{ background: 'linear-gradient(135deg, #27ae60, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  💰 Gestión de Pagos &rarr;
                </button>
              )}
              {permisosTutor.gestionAtletas && (
                <button onClick={() => navigate('/master')} style={{ background: 'linear-gradient(135deg, #e63946, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  🥋 Gestión Global de Atletas &rarr;
                </button>
              )}
              {permisosTutor.eventos && (
                <button onClick={() => navigate('/master')} style={{ background: 'linear-gradient(135deg, #d35400, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  🏆 Convocatorias y Eventos &rarr;
                </button>
              )}
              {permisosTutor.evaluaciones && (
                <button onClick={() => alert("Módulo de evaluaciones.")} style={{ background: 'linear-gradient(135deg, #f39c12, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  📝 Evaluaciones &rarr;
                </button>
              )}
              {permisosTutor.competencias && (
                <button onClick={() => alert("Módulo de competencias.")} style={{ background: 'linear-gradient(135deg, #8e44ad, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  🏆 Competencias &rarr;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}