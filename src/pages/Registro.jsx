import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Importamos las herramientas de Firebase que configuramos antes
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import logoDaeji from '../assets/logo-letras.png';

export default function Registro() {
  // Aquí "guardamos" temporalmente lo que el usuario escribe en las cajas de texto
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  
  // Herramienta para "navegar" o mover al usuario a otra pantalla
  const navigate = useNavigate();

  // Esta función se ejecuta cuando el usuario presiona "CREAR CUENTA"
  const manejarRegistro = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setError(''); // Limpiamos errores previos

    // 1. Validar que las contraseñas sean iguales
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return; // Detenemos el proceso aquí
    }

    try {
      // 2. Le pedimos a Firebase que cree el usuario con correo y contraseña
      const credencialUsuario = await createUserWithEmailAndPassword(auth, correo, password);
      
      // 3. Le agregamos el nombre al perfil recién creado en Firebase
      await updateProfile(credencialUsuario.user, {
        displayName: nombre
      });

      // 4. Si todo salió bien, enviamos al usuario al inicio (más adelante irá al dashboard)
      alert("¡Cuenta creada correctamente!");
      navigate('/dashboard'); 

    } catch (errorFirebase) {
      // Si Firebase detecta un error (ej: correo ya existe o clave muy corta), lo mostramos
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
        
        {/* Si hay un error, mostramos este recuadro rojo */}
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