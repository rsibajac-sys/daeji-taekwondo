import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const manejarRegistro = async (e) => {
    e.preventDefault();
    setError(''); 

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return; 
    }

    try {
      // 1. Creamos el usuario en Firebase Auth
      const credencialUsuario = await createUserWithEmailAndPassword(auth, correo, password);
      
      // 2. Agregamos el nombre
      await updateProfile(credencialUsuario.user, {
        displayName: nombre
      });

      // 3. Lo guardamos en Firestore con estado "pendiente" para requerir aprobación
      const idDoc = correo.replace(/[@.]/g, '_');
      await setDoc(doc(db, 'roles_usuarios', idDoc), {
        correo: correo,
        nombre: nombre,
        estado: 'pendiente', // <--- Estado de Sala de Espera
        fechaRegistro: new Date().toISOString(),
        permisos: { // Permisos en falso por defecto hasta que el Master los edite
          gestionAtletas: false,
          asistencias: false,
          pagos: false,
          expedientes: false,
          evaluaciones: false,
          competencias: false,
          eventos: false
        }
      });

      // 4. Cerramos la sesión inmediatamente para que no salte al Dashboard
      await signOut(auth);

      alert("¡Cuenta creada con éxito! Tu acceso está pendiente de autorización por la administración.");
      navigate('/login'); 

    } catch (errorFirebase) {
      if (errorFirebase.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else if (errorFirebase.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error al crear la cuenta. Verifica tus datos.');
      }
    }
  };

  return (
    <div className="contenedor-principal auth-fondo">
      <div className="tarjeta-auth">
        <img src={logoDaeji} alt="Logo DAEJI" className="logo-auth" />
        <h2>Crear una cuenta</h2>
        
        {error && <div className="alerta-error">{error}</div>}

        <form onSubmit={manejarRegistro} className="formulario">
          <div className="grupo-input">
            <label>Nombre y Apellido</label>
            <input 
              type="text" 
              required 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Ej: Zoe Sibaja"
            />
          </div>

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

          <div className="grupo-input">
            <label>Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="grupo-input">
            <label>Confirmar contraseña</label>
            <input 
              type="password" 
              required 
              value={confirmar} 
              onChange={(e) => setConfirmar(e.target.value)} 
              placeholder="Repite tu contraseña"
            />
          </div>

          <button type="submit" className="btn-principal ancho-completo">
            CREAR CUENTA
          </button>
        </form>

        <p className="texto-ayuda">
          ¿Ya tienes una cuenta? <Link to="/login" className="enlace">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}