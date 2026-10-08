import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function TutorSeguridad() {
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);

  const manejarCambioPassword = async (e) => {
    e.preventDefault();
    if (nuevoPassword !== confirmarPassword) {
      alert("❌ Las nuevas contraseñas no coinciden.");
      return;
    }
    if (nuevoPassword.length < 6) {
      alert("⚠️ La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setGuardandoPass(true);
    const user = auth.currentUser;

    try {
      const credencial = EmailAuthProvider.credential(user.email, passwordActual);
      await reauthenticateWithCredential(user, credencial);
      await updatePassword(user, nuevoPassword);
      
      alert("✅ ¡Contraseña actualizada con éxito!");
      setPasswordActual('');
      setNuevoPassword('');
      setConfirmarPassword('');
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert("❌ La contraseña actual es incorrecta.");
      } else {
        alert("❌ Ocurrió un error al actualizar la contraseña.");
      }
    } finally {
      setGuardandoPass(false);
    }
  };

  return (
    <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', maxWidth: '550px', margin: '0 auto', padding: '30px' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#3498db', fontSize: '1.4rem' }}>🔒 Seguridad de la Cuenta</h3>
      <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '25px' }}>Actualiza tu contraseña de acceso ingresando tus credenciales actuales.</p>

      <form onSubmit={manejarCambioPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Contraseña Actual</label>
          <input 
            type="password" 
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nueva Contraseña</label>
          <input 
            type="password" 
            value={nuevoPassword}
            onChange={(e) => setNuevoPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Confirmar Nueva Contraseña</label>
          <input 
            type="password" 
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
          />
        </div>

        <div style={{ textAlign: 'right', marginTop: '10px' }}>
          <button 
            type="submit" 
            disabled={guardandoPass}
            style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: guardandoPass ? 0.7 : 1 }}
          >
            {guardandoPass ? 'Actualizando...' : '🔒 Actualizar Contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}