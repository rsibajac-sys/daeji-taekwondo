import { useState } from 'react';
import { Link } from 'react-router-dom';
// Importamos la herramienta específica de Firebase para correos de recuperación
import { auth } from '../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import logoDaeji from '../assets/logo-letras.png';

export default function Recuperar() {
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Esta función se ejecuta al presionar "ENVIAR ENLACE"
  const manejarRecuperacion = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    try {
      // Le pedimos a Firebase que envíe el correo
      await sendPasswordResetEmail(auth, correo);
      
      // Mostramos el mensaje de éxito (sin confirmar o negar si el correo existe)
      setMensaje('Si existe una cuenta asociada a este correo, recibirás instrucciones para restablecer tu contraseña.');
      
      // Limpiamos la caja de texto
      setCorreo('');
    } catch (errorFirebase) {
      // Si el correo tiene un formato inválido u ocurre un error de conexión
      setError('Ocurrió un error. Verifica que el correo esté escrito correctamente.');
    }
  };

  return (
    <div className="contenedor-principal auth-fondo">
      <div className="tarjeta-auth">
        <img src={logoDaeji} alt="Logo DAEJI" className="logo-auth" />
        <h2>Recuperar contraseña</h2>
        
        {/* Si hay un error, mostramos el recuadro rojo */}
        {error && <div className="alerta-error">{error}</div>}
        
        {/* Si el mensaje se envió, mostramos un recuadro verde (usaremos un estilo integrado rápido) */}
        {mensaje && (
          <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', padding: '12px', borderRadius: '8px', border: '1px solid #2ecc71', marginBottom: '20px', fontSize: '0.9rem' }}>
            {mensaje}
          </div>
        )}

        <form onSubmit={manejarRecuperacion} className="formulario">
          <div className="grupo-input">
            <label>Correo electrónico</label>
            <input 
              type="email" 
              required 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)} 
              placeholder="correo@ejemplo.com"
            />
          </div>

          <button type="submit" className="btn-principal ancho-completo">
            ENVIAR ENLACE
          </button>
        </form>

        <p className="texto-ayuda">
          <Link to="/login" className="enlace">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}