import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Importamos las herramientas de Firebase
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import logoDaeji from '../assets/logo-letras.png';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  // Esta función se ejecuta al presionar "INGRESAR"
  const manejarLogin = async (e) => {
    e.preventDefault();
    setError(''); // Limpiamos errores

    try {
      // Le pedimos a Firebase que inicie sesión
      await signInWithEmailAndPassword(auth, correo, password);
      
      // Si la contraseña es correcta, lo enviamos (por ahora) a la portada
      alert("¡Inicio de sesión exitoso!");
      navigate('/dashboard');
      
    } catch (errorFirebase) {
      // Por seguridad, Firebase no dice si falló el correo o la clave, solo dice "credenciales inválidas"
      setError('No fue posible iniciar sesión. Verifica tus datos.');
    }
  };

  return (
    <div className="contenedor-principal auth-fondo">
      <div className="tarjeta-auth">
        <img src={logoDaeji} alt="Logo DAEJI" className="logo-auth" />
        <h2>Acceso Autorizado</h2>
        
        {error && <div className="alerta-error">{error}</div>}

        <form onSubmit={manejarLogin} className="formulario">
          <div className="grupo-input">
            <label>Correo electrónico</label>
            <input 
              type="email" 
              required 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)} 
              placeholder="Tu correo registrado"
            />
          </div>

          <div className="grupo-input">
            <label>Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Tu contraseña"
            />
          </div>

          <button type="submit" className="btn-principal ancho-completo">
            INGRESAR
          </button>
        </form>

        {/* Enlaces de ayuda para el usuario */}
        <p className="texto-ayuda">
          <Link to="/recuperar" className="enlace">¿Olvidaste tu contraseña?</Link>
        </p>
        <p className="texto-ayuda" style={{ marginTop: '10px' }}>
          ¿No tienes cuenta? <Link to="/registro" className="enlace">Crea una aquí</Link>
        </p>
      </div>
    </div>
  );
}