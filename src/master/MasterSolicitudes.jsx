import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function MasterSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarSolicitudes = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'roles_usuarios'), where('estado', '==', 'pendiente'));
      const querySnapshot = await getDocs(q);
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setSolicitudes(lista);
    } catch (error) {
      console.error("Error cargando solicitudes pendientes:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const actualizarEstado = async (id, correo, nuevoEstado) => {
    try {
      const docRef = doc(db, 'roles_usuarios', id);
      
      // Si se aprueba, le otorgamos el permiso básico de ver expedientes. 
      // Si se rechaza, solo cambiamos el estado para que el sistema lo siga bloqueando.
      const datosActualizar = nuevoEstado === 'aprobado' 
        ? { 
            estado: 'aprobado', 
            permisos: { gestionAtletas: false, asistencias: false, pagos: false, expedientes: true, evaluaciones: false, competencias: false, eventos: false },
            fechaAprobacion: new Date().toISOString()
          } 
        : { estado: 'rechazado' };

      await updateDoc(docRef, datosActualizar);
      alert(`La solicitud de ${correo} ha sido ${nuevoEstado}.`);
      await cargarSolicitudes(); // Recargar la lista para quitar al usuario procesado
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  if (cargando) {
    return <div style={{ color: '#aaa', padding: '20px' }}>Buscando solicitudes nuevas...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: '#fff', marginBottom: '5px' }}>Solicitudes de Acceso Pendientes</h2>
      <p style={{ color: '#aaa', marginBottom: '25px' }}>Aprueba a los usuarios verificados para que puedan ingresar al Portal de Tutor.</p>

      {solicitudes.length === 0 ? (
        <div style={{ background: 'var(--bg-secundario)', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--borde-color)' }}>
          <p style={{ color: '#aaa', fontSize: '1.1rem' }}>No hay solicitudes pendientes en este momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {solicitudes.map((solicitud) => (
            <div key={solicitud.id} style={{ background: 'var(--bg-secundario)', padding: '20px', borderRadius: '12px', border: '1px solid var(--borde-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h4 style={{ color: '#fff', margin: '0 0 5px 0', fontSize: '1.1rem' }}>{solicitud.nombre || 'Sin nombre'}</h4>
                <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>Correo: <strong style={{ color: '#fff' }}>{solicitud.correo}</strong></p>
                <p style={{ color: '#aaa', margin: '5px 0 0 0', fontSize: '0.8rem' }}>Registrado el: {new Date(solicitud.fechaRegistro).toLocaleDateString()}</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => actualizarEstado(solicitud.id, solicitud.correo, 'aprobado')}
                  style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ✅ Aprobar
                </button>
                <button 
                  onClick={() => actualizarEstado(solicitud.id, solicitud.correo, 'rechazado')}
                  style={{ background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ❌ Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}