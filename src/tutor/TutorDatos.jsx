import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

export default function TutorDatos({ misAlumnos, onDatosActualizados }) {
  const [idPerfilDoc, setIdPerfilDoc] = useState(null);
  const [telefonoPerfil, setTelefonoPerfil] = useState('');
  const [contactoEmergenciaPerfil, setContactoEmergenciaPerfil] = useState('');
  const [telefonoEmergenciaPerfil, setTelefonoEmergenciaPerfil] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  useEffect(() => {
    if (misAlumnos.length > 0) {
      const primerAlumno = misAlumnos[0];
      setIdPerfilDoc(primerAlumno.id);
      setTelefonoPerfil(primerAlumno.telefono || '');
      setContactoEmergenciaPerfil(primerAlumno.emergencia?.contacto || '');
      setTelefonoEmergenciaPerfil(primerAlumno.emergencia?.telefono || '');
    }
  }, [misAlumnos]);

  const guardarDatosPerfil = async (e) => {
    e.preventDefault();
    if (!idPerfilDoc) {
      alert("⚠️ No se encontró un expediente asociado para modificar.");
      return;
    }

    setGuardandoPerfil(true);
    try {
      const docRef = doc(db, 'atletas', idPerfilDoc);
      await updateDoc(docRef, {
        telefono: telefonoPerfil,
        emergencia: {
          ...misAlumnos.find(a => a.id === idPerfilDoc)?.emergencia,
          contacto: contactoEmergenciaPerfil,
          telefono: telefonoEmergenciaPerfil
        }
      });
      alert("✅ ¡Tus datos se han actualizado correctamente!");
      onDatosActualizados();
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert("❌ Ocurrió un error al actualizar los datos.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  return (
    <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', maxWidth: '650px', margin: '0 auto', padding: '30px' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#3498db', fontSize: '1.4rem' }}>✏️ Modificar Mis Datos de Contacto</h3>
      <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '25px' }}>Actualiza tu número telefónico o los datos de emergencia de tu expediente.</p>

      <form onSubmit={guardarDatosPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Teléfono de Contacto</label>
          <input 
            type="text" 
            value={telefonoPerfil}
            onChange={(e) => setTelefonoPerfil(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
          />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f39c12', fontSize: '1rem' }}>Contacto de Emergencia</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nombre Contacto</label>
              <input 
                type="text" 
                value={contactoEmergenciaPerfil}
                onChange={(e) => setContactoEmergenciaPerfil(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Teléfono Emergencia</label>
              <input 
                type="text" 
                value={telefonoEmergenciaPerfil}
                onChange={(e) => setTelefonoEmergenciaPerfil(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '10px' }}>
          <button 
            type="submit" 
            disabled={guardandoPerfil}
            style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: guardandoPerfil ? 0.7 : 1 }}
          >
            {guardandoPerfil ? 'Guardando...' : '💾 Guardar Modificaciones'}
          </button>
        </div>
      </form>
    </div>
  );
}