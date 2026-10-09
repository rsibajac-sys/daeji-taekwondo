import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Iniciar sesión en Firebase Auth
      await signInWithEmailAndPassword(auth, correo, password);
      
      // 2. Verificar el estado de autorización en Firestore
      const idDoc = correo.replace(/[@.]/g, '_');
      const docRef = doc(db, 'roles_usuarios', idDoc);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const datosUsuario = docSnap.data();
        
        // Candado: Si está pendiente, lo sacamos del sistema
        if (datosUsuario.estado === 'pendiente') {
          await signOut(auth);
          setError('Tu cuenta ha sido registrada, pero está pendiente de autorización por la administración.');
          return;
        }
        
        if (datosUsuario.estado === 'rechazado') {
          await signOut(auth);
          setError('Tu solicitud de cuenta no ha sido aprobada.');
          return;
        }
      }

      // Si pasa los filtros (es Master o usuario aprobado), entra
      navigate('/dashboard');
      
    } catch (errorFirebase) {
      setError('No fue posible iniciar sesión. Verifica tus datos o contraseña.');
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