import { useState } from 'react';
import { auth } from '../firebase/config';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function CambiarPassword() {
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);

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

    setCargando(true);
    const user = auth.currentUser;

    try {
      // Por seguridad de Firebase, se requiere reautenticar al usuario antes de cambiar la contraseña
      const credencial = EmailAuthProvider.credential(user.email, passwordActual);
      await reauthenticateWithCredential(user, credencial);

      // Actualizar contraseña
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
        alert("❌ Ocurrió un error al actualizar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ background: 'rgba(7, 17, 30, 0.9)', padding: '25px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '500px', color: '#fff', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#3498db' }}>🔒 Cambiar Contraseña</h3>
      <form onSubmit={manejarCambioPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Contraseña Actual</label>
          <input 
            type="password" 
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nueva Contraseña</label>
          <input 
            type="password" 
            value={nuevoPassword}
            onChange={(e) => setNuevoPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Confirmar Nueva Contraseña</label>
          <input 
            type="password" 
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={cargando}
          style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: cargando ? 0.7 : 1 }}
        >
          {cargando ? 'Actualizando...' : '💾 Guardar Nueva Contraseña'}
        </button>
      </form>
    </div>
  );
}