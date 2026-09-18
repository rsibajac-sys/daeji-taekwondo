import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';
import { provinciasCR } from '../data/ubicacionesCR';

export default function Dashboard() {
  const [usuario, setUsuario] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('inicio'); // Pestañas: 'inicio', 'atletas', 'datos', 'seguridad'
  const [misAlumnos, setMisAlumnos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados y lógica para la pestaña de modificación de datos de perfil del tutor/usuario
  const [idPerfilDoc, setIdPerfilDoc] = useState(null);
  const [telefonoPerfil, setTelefonoPerfil] = useState('');
  const [contactoEmergenciaPerfil, setContactoEmergenciaPerfil] = useState('');
  const [telefonoEmergenciaPerfil, setTelefonoEmergenciaPerfil] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Estados y lógica para la pestaña de seguridad (Cambio de Contraseña)
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);

  // Permisos del tutor asignados por el Master
  const [permisosTutor, setPermisosTutor] = useState({
    asistencias: false,
    pagos: false,
    expedientes: true,
    evaluaciones: false,
    competencias: false
  });

  const [atletzasConAtrasos, setAtletasConAtrasos] = useState([]);
  const navigate = useNavigate();

  // Estados del Formulario - Datos Personales
  const [cedula, setCedula] = useState('');
  const [nombre1, setNombre1] = useState('');
  const [apellido1, setApellido1] = useState('');
  const [apellido2, setApellido2] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [genero, setGenero] = useState('Masculino');
  const [foto, setFoto] = useState('');
  const [vistaPreviaFoto, setVistaPreviaFoto] = useState('');

  // Estados para Ubicación Dinámica (Costa Rica)
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('');
  const [cantonesDisponibles, setCantonesDisponibles] = useState([]);
  const [cantonSeleccionado, setCantonSeleccionado] = useState('');
  const [distritosDisponibles, setDistritosDisponibles] = useState([]);
  const [distritoSeleccionado, setDistritoSeleccionado] = useState('');
  const [otrasSenas, setOtrasSenas] = useState('');
  
  // Información Médica y Emergencia
  const [tipoSangre, setTipoSangre] = useState('');
  const [padecimientos, setPadecimientos] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [telefonoEmergencia, setTelefonoEmergencia] = useState('');
  const [parentescoEmergencia, setParentescoEmergencia] = useState('');

  // Información Disciplinaria
  const [grado, setGrado] = useState('Cinturón Blanco');
  const [otraAcademia, setOtraAcademia] = useState('No');
  const [nombreAcademiaAnterior, setNombreAcademiaAnterior] = useState('');
  const [profesorAnterior, setProfesorAnterior] = useState('');
  const [tiempoAcademiaAnterior, setTiempoAcademiaAnterior] = useState('');
  const [fechaIngresoDaeji, setFechaIngresoDaeji] = useState('');
  const [cargandoHacienda, setCargandoHacienda] = useState(false);

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarPermisosYAlumnos(usuarioActual.email);
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [navigate]);

  const cargarPermisosYAlumnos = async (emailTutor) => {
    try {
      const idDoc = emailTutor.replace(/[@.]/g, '_');
      const docPermisosRef = doc(db, 'roles_usuarios', idDoc);
      const docPermisosSnap = await getDoc(docPermisosRef);

      if (docPermisosSnap.exists()) {
        const dataPermisos = docPermisosSnap.data();
        if (dataPermisos.permisos) {
          setPermisosTutor(dataPermisos.permisos);
        }
      }

      const q = query(collection(db, 'atletas'), where('tutorEmail', '==', emailTutor));
      const querySnapshot = await getDocs(q);
      const lista = [];
      const mesActual = new Date().toISOString().slice(0, 7);
      const atrasados = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lista.push({ id: docSnap.id, ...data });

        // Detección de morosidad en el mes actual
        const historial = data.historialPagos || {};
        const estadoMes = historial[mesActual] || 'pendiente';
        if (estadoMes === 'pendiente' && data.financiera?.tipoAlumno !== 'Becado') {
          atrasados.push(data);
        }
      });

      setMisAlumnos(lista);
      setAtletasConAtrasos(atrasados);

      // Si tiene al menos un atleta registrado, precargamos sus datos de perfil para la sección de edición
      if (lista.length > 0) {
        const primerAlumno = lista[0];
        setIdPerfilDoc(primerAlumno.id);
        setTelefonoPerfil(primerAlumno.telefono || '');
        setContactoEmergenciaPerfil(primerAlumno.emergencia?.contacto || '');
        setTelefonoEmergenciaPerfil(primerAlumno.emergencia?.telefono || '');
      }

    } catch (error) {
      console.error("Error cargando datos del tutor:", error);
    } finally {
      setCargandoAlumnos(false);
    }
  };

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    navigate('/');
  };

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
      await cargarPermisosYAlumnos(usuario.email);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert("❌ Ocurrió un error al actualizar los datos.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

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

  const manejarCambioProvincia = (e) => {
    const provinciaId = e.target.value;
    setProvinciaSeleccionada(provinciaId);
    setCantonSeleccionado('');
    setDistritoSeleccionado('');
    setDistritosDisponibles([]);

    const provinciaEncontrada = provinciasCR.find(p => p.id === provinciaId);
    if (provinciaEncontrada) {
      setCantonesDisponibles(provinciaEncontrada.cantones);
    } else {
      setCantonesDisponibles([]);
    }
  };

  const manejarCambioCanton = (e) => {
    const cantonId = e.target.value;
    setCantonSeleccionado(cantonId);
    setDistritoSeleccionado('');

    const cantonEncontrado = cantonesDisponibles.find(c => c.id === cantonId);
    if (cantonEncontrado) {
      setDistritosDisponibles(cantonEncontrado.distritos);
    } else {
      setDistritosDisponibles([]);
    }
  };

  const manejarCambioFoto = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      const lector = new FileReader();
      lector.onload = (eventoLectura) => {
        const imagenOriginal = new Image();
        imagenOriginal.src = eventoLectura.target.result;
        imagenOriginal.onload = () => {
          const lienzo = document.createElement('canvas');
          let ancho = imagenOriginal.width;
          let alto = imagenOriginal.height;

          const tamanoMaximo = 300;
          if (ancho > alto) {
            if (ancho > tamanoMaximo) { alto *= tamanoMaximo / ancho; ancho = tamanoMaximo; }
          } else {
            if (alto > tamanoMaximo) { ancho *= tamanoMaximo / alto; alto = tamanoMaximo; }
          }

          lienzo.width = ancho;
          lienzo.height = alto;
          const contexto = lienzo.getContext('2d');
          contexto.drawImage(imagenOriginal, 0, 0, ancho, alto);

          const imagenComprimidaBase64 = lienzo.toDataURL('image/jpeg', 0.7);
          setFoto(imagenComprimidaBase64);
          setVistaPreviaFoto(imagenComprimidaBase64);
        };
      };
      lector.readAsDataURL(archivo);
    }
  };

  const buscarCedulaHacienda = async (e) => {
    const valorCedula = e.target.value;
    setCedula(valorCedula);

    if (valorCedula.length >= 9) {
      setCargandoHacienda(true);
      try {
        const respuesta = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${valorCedula}`);
        const datos = await respuesta.json();
        
        if (datos && datos.nombre) {
          const partes = datos.nombre.trim().split(' ');
          if (partes.length >= 3) {
            setApellido2(partes.pop());
            setApellido1(partes.pop());
            setNombre1(partes.join(' '));
          } else {
            setNombre1(datos.nombre);
          }
        }
      } catch (error) {
        console.log("Ingreso manual requerido.");
      } finally {
        setCargandoHacienda(false);
      }
    }
  };

  const guardarExpedienteAtleta = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);

    try {
      const qCedula = query(collection(db, 'atletas'), where('cedula', '==', cedula));
      const resultadoCedula = await getDocs(qCedula);

      if (!resultadoCedula.empty) {
        alert("⚠️ Ya existe un atleta registrado con este número de cédula en el sistema.");
        setGuardando(false);
        return;
      }

      const nuevoAtleta = {
        cedula,
        nombre1,
        apellido1,
        apellido2,
        fechaNacimiento,
        telefono,
        genero,
        foto: foto || '',
        direccion: {
          provincia: provinciaSeleccionada,
          canton: cantonSeleccionado,
          distrito: distritoSeleccionado,
          otrasSenas
        },
        medico: { tipoSangre, padecimientos, lesiones },
        emergencia: { contacto: contactoEmergencia, telefono: telefonoEmergencia, parentesco: parentescoEmergencia },
        disciplina: { 
          grado, 
          otraAcademia, 
          nombreAcademiaAnterior: otraAcademia === 'Si' ? nombreAcademiaAnterior : '',
          profesorAnterior: otraAcademia === 'Si' ? profesorAnterior : '',
          tiempoAcademiaAnterior: otraAcademia === 'Si' ? tiempoAcademiaAnterior : '',
          fechaIngresoDaeji
        },
        tutorEmail: usuario.email,
        fechaRegistro: new Date()
      };

      await addDoc(collection(db, 'atletas'), nuevoAtleta);
      alert("¡Atleta registrado exitosamente!");
      
      setMostrarFormulario(false);
      setCedula(''); setNombre1(''); setApellido1(''); setApellido2('');
      setFechaNacimiento(''); setTelefono(''); setFoto(''); setVistaPreviaFoto('');
      setProvinciaSeleccionada(''); setCantonesDisponibles([]); setCantonSeleccionado('');
      setDistritosDisponibles([]); setDistritoSeleccionado(''); setOtrasSenas('');
      setTipoSangre(''); setPadecimientos(''); setLesiones('');
      setContactoEmergencia(''); setTelefonoEmergencia(''); setParentescoEmergencia('');
      setOtraAcademia('No'); setNombreAcademiaAnterior(''); setProfesorAnterior(''); 
      setTiempoAcademiaAnterior(''); setFechaIngresoDaeji('');

      await cargarPermisosYAlumnos(usuario.email);
    } catch (error) {
      console.error(error);
      alert("Error al guardar el expediente. Revisa la consola.");
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) return <div className="contenedor-principal">Cargando...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a192f', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '60px' }}>
      
      {/* ENCABEZADO EJECUTIVO */}
      <header style={{ background: '#07111e', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '110px' }} />
          <span style={{ background: '#e63946', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PORTAL DE TUTOR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{usuario.email}</span>
          <button className="btn-secundario" onClick={manejarCerrarSesion} style={{ fontSize: '0.85rem' }}>
            CERRAR SESIÓN
          </button>
        </div>
      </header>

      {/* MENÚ DE PESTAÑAS SUPERIOR (SUBMENÚ COMPLETO) */}
      <nav style={{ background: '#07111e', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setSeccionActiva('inicio')}
          style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: seccionActiva === 'inicio' ? '3px solid #e63946' : '3px solid transparent', color: seccionActiva === 'inicio' ? '#fff' : '#aaa', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          🏠 Inicio y Alertas
        </button>

        <button 
          onClick={() => { setSeccionActiva('atletas'); setMostrarFormulario(false); }}
          style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: seccionActiva === 'atletas' ? '3px solid #e63946' : '3px solid transparent', color: seccionActiva === 'atletas' ? '#fff' : '#aaa', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          🥋 Mis Atletas ({misAlumnos.length})
        </button>

        <button 
          onClick={() => setSeccionActiva('datos')}
          style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: seccionActiva === 'datos' ? '3px solid #e63946' : '3px solid transparent', color: seccionActiva === 'datos' ? '#fff' : '#aaa', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          ✏️ Modificar Mis Datos
        </button>

        <button 
          onClick={() => setSeccionActiva('seguridad')}
          style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: seccionActiva === 'seguridad' ? '3px solid #e63946' : '3px solid transparent', color: seccionActiva === 'seguridad' ? '#fff' : '#aaa', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          🔒 Seguridad (Contraseña)
        </button>
      </nav>

      <main style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        
        {/* VISTA 1: INICIO Y ALERTAS DE MOROSIDAD */}
        {seccionActiva === 'inicio' && (
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
                Bienvenido al sistema institucional DAEJI. Selecciona una herramienta autorizada abajo o navega a través de las pestañas superiores.
              </p>

              {(permisosTutor.asistencias || permisosTutor.pagos || permisosTutor.evaluaciones || permisosTutor.competencias) && (
                <div style={{ marginTop: '25px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                  <p style={{ fontSize: '0.8rem', color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                    Módulos Autorizados para tu Cuenta:
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {permisosTutor.asistencias && (
                      <button 
                        onClick={() => navigate('/asistencia')}
                        style={{ background: 'linear-gradient(135deg, #2980b9, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        📋 Control de Asistencias &rarr;
                      </button>
                    )}
                    {permisosTutor.pagos && (
                      <button 
                        onClick={() => navigate('/pagos')}
                        style={{ background: 'linear-gradient(135deg, #27ae60, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        💰 Gestión de Pagos &rarr;
                      </button>
                    )}
                    {permisosTutor.evaluaciones && (
                      <button 
                        onClick={() => alert("Módulo de evaluaciones.")}
                        style={{ background: 'linear-gradient(135deg, #f39c12, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        📝 Evaluaciones &rarr;
                      </button>
                    )}
                    {permisosTutor.competencias && (
                      <button 
                        onClick={() => alert("Módulo de competencias.")}
                        style={{ background: 'linear-gradient(135deg, #e63946, #2c3e50)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        🏆 Competencias &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: MIS ATLETAS REGISTRADOS */}
        {seccionActiva === 'atletas' && (
          <div>
            {!mostrarFormulario ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.4rem' }}>Mis Atletas Registrados</h3>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Selecciona un atleta para ver su expediente completo</p>
                  </div>
                  <button 
                    className="btn-principal" 
                    onClick={() => setMostrarFormulario(true)}
                    style={{ background: '#e63946', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    + Registrar Nuevo Alumno
                  </button>
                </div>

                {cargandoAlumnos ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Cargando tus atletas...</p>
                ) : misAlumnos.length === 0 ? (
                  <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', textAlign: 'center', padding: '50px 20px' }}>
                    <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '1rem' }}>Aún no tienes atletas registrados en tu cuenta.</p>
                    <button className="btn-secundario" onClick={() => setMostrarFormulario(true)}>
                      Registrar mi primer alumno ahora
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {misAlumnos.map((alumno) => (
                      <div 
                        key={alumno.id} 
                        onClick={() => navigate(`/expediente/${alumno.id}`)}
                        style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '22px', cursor: 'pointer', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#e63946'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                          {alumno.foto ? (
                            <img src={alumno.foto} alt="Atleta" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e63946' }} />
                          ) : (
                            <div style={{ width: '60px', height: '60px', background: '#e63946', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem', color: '#fff' }}>
                              {alumno.nombre1 ? alumno.nombre1.charAt(0) : 'A'}
                            </div>
                          )}
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem' }}>{alumno.nombre1} {alumno.apellido1}</h4>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(230,57,70,0.15)', color: '#e63946', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{alumno.disciplina?.grado || 'Sin Grado'}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '15px' }}>
                          <p style={{ margin: 0 }}>Cédula: <strong style={{ color: '#fff' }}>{alumno.cedula}</strong></p>
                          <p style={{ margin: 0 }}>Cuota: <strong style={{ color: '#2ecc71' }}>₡{alumno.financiera?.cuotaMensual || '0'}</strong> ({alumno.financiera?.tipoAlumno || 'Regular'})</p>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#2ecc71', fontWeight: 'bold' }}>● {alumno.estado || 'Activo'}</span>
                          <span style={{ fontSize: '0.85rem', color: '#3498db', fontWeight: 'bold' }}>Ver Expediente &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', maxWidth: '750px', margin: '0 auto', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: '1.3rem' }}>Registrar Nuevo Expediente de Atleta</h3>
                  <button 
                    onClick={() => setMostrarFormulario(false)} 
                    style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    ✕ Cancelar
                  </button>
                </div>
                
                <form onSubmit={guardarExpedienteAtleta} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ color: '#3498db', margin: '0 0 12px 0', fontSize: '1rem' }}>1. Datos Personales y Residencia</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Cédula de Identidad {cargandoHacienda && <span style={{color: '#e63946'}}>(Consultando...)</span>}</label>
                        <input 
                          type="text" 
                          required 
                          value={cedula}
                          onChange={buscarCedulaHacienda}
                          placeholder="Número de cédula (Ej: 101110111)"
                          style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fotografía del Atleta</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={manejarCambioFoto}
                            style={{ width: '100%', padding: '8px', background: '#121212', borderRadius: '8px', border: '1px solid #333', color: '#fff', fontSize: '0.85rem' }} 
                          />
                          {vistaPreviaFoto && (
                            <img src={vistaPreviaFoto} alt="Vista previa" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2ecc71' }} />
                          )}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nombre</label>
                        <input type="text" required value={nombre1} onChange={(e) => setNombre1(e.target.value)} placeholder="Nombre del atleta" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Primer Apellido</label>
                          <input type="text" required value={apellido1} onChange={(e) => setApellido1(e.target.value)} placeholder="Primer Apellido" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Segundo Apellido</label>
                          <input type="text" required value={apellido2} onChange={(e) => setApellido2(e.target.value)} placeholder="Segundo Apellido" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha de Nacimiento</label>
                          <input type="date" required value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Género</label>
                          <select value={genero} onChange={(e) => setGenero(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Teléfono de contacto</label>
                        <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 8888-8888" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Provincia</label>
                          <select value={provinciaSeleccionada} onChange={manejarCambioProvincia} required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                            <option value="">Seleccione...</option>
                            {provinciasCR.map((prov) => (
                              <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Cantón</label>
                          <select value={cantonSeleccionado} onChange={manejarCambioCanton} required disabled={!provinciaSeleccionada} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                            <option value="">Seleccione...</option>
                            {cantonesDisponibles.map((cant) => (
                              <option key={cant.id} value={cant.nombre}>{cant.nombre}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Distrito</label>
                          <select value={distritoSeleccionado} onChange={(e) => setDistritoSeleccionado(e.target.value)} required disabled={!cantonSeleccionado} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                            <option value="">Seleccione...</option>
                            {distritosDisponibles.map((dist, idx) => (
                              <option key={idx} value={dist}>{dist}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Otras Señas</label>
                          <input type="text" value={otrasSenas} onChange={(e) => setOtrasSenas(e.target.value)} placeholder="Dirección exacta" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#3498db', margin: '15px 0 12px 0', fontSize: '1rem' }}>2. Información Médica</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Tipo de Sangre</label>
                        <input type="text" value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)} placeholder="Ej: O+" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Padecimientos o Alergias</label>
                        <input type="text" value={padecimientos} onChange={(e) => setPadecimientos(e.target.value)} placeholder="Ej: Asma" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Lesiones Previas</label>
                        <input type="text" value={lesiones} onChange={(e) => setLesiones(e.target.value)} placeholder="Ej: Ninguna" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#3498db', margin: '15px 0 12px 0', fontSize: '1rem' }}>3. Contacto en Caso de Emergencia</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nombre del Contacto</label>
                        <input type="text" required value={contactoEmergencia} onChange={(e) => setContactoEmergencia(e.target.value)} placeholder="Nombre completo" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Teléfono de Emergencia</label>
                          <input type="tel" required value={telefonoEmergencia} onChange={(e) => setTelefonoEmergencia(e.target.value)} placeholder="Teléfono" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Parentesco</label>
                          <input type="text" required value={parentescoEmergencia} onChange={(e) => setParentescoEmergencia(e.target.value)} placeholder="Ej: Madre" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#3498db', margin: '15px 0 12px 0', fontSize: '1rem' }}>4. Datos Académicos y Disciplina</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Grado / Cinturón Actual</label>
                        <select value={grado} onChange={(e) => setGrado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                          <option value="Cinturón Blanco">Cinturón Blanco (10° Gup)</option>
                          <option value="Cinturón Blanco-Amarillo">Cinturón Blanco - Amarillo (9° Gup)</option>
                          <option value="Cinturón Amarillo">Cinturón Amarillo (8° Gup)</option>
                          <option value="Cinturón Amarillo-Verde">Cinturón Amarillo - Verde (7° Gup)</option>
                          <option value="Cinturón Verde">Cinturón Verde (6° Gup)</option>
                          <option value="Cinturón Verde-Azul">Cinturón Verde - Azul (5° Gup)</option>
                          <option value="Cinturón Azul">Cinturón Azul (4° Gup)</option>
                          <option value="Cinturón Azul-Rojo">Cinturón Azul - Rojo (3° Gup)</option>
                          <option value="Cinturón Rojo">Cinturón Rojo (2° Gup)</option>
                          <option value="Cinturón Rojo-Negro">Cinturón Rojo - Negro (1° Gup)</option>
                          <option value="Cinturón Negro 1er Dan">Cinturón Negro (1er Dan)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>¿Ha pertenecido a otra academia de Taekwondo?</label>
                        <select value={otraAcademia} onChange={(e) => setOtraAcademia(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                          <option value="No">No</option>
                          <option value="Si">Sí</option>
                        </select>
                      </div>

                      {otraAcademia === 'Si' && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Nombre de la academia anterior</label>
                            <input type="text" value={nombreAcademiaAnterior} onChange={(e) => setNombreAcademiaAnterior(e.target.value)} placeholder="Ej: Academia Koryo" style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Profesor anterior</label>
                            <input type="text" value={profesorAnterior} onChange={(e) => setProfesorAnterior(e.target.value)} placeholder="Nombre del profesor" style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Tiempo de permanencia</label>
                            <input type="text" value={tiempoAcademiaAnterior} onChange={(e) => setTiempoAcademiaAnterior(e.target.value)} placeholder="Ej: 2 años" style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha de ingreso a DAEJI</label>
                        <input type="date" required value={fechaIngresoDaeji} onChange={(e) => setFechaIngresoDaeji(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setMostrarFormulario(false)} style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {guardando ? 'Guardando...' : 'Guardar Atleta'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: MODIFICAR DATOS DEL PERFIL */}
        {seccionActiva === 'datos' && (
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
        )}

        {/* VISTA 4: SEGURIDAD (CAMBIO DE CONTRASEÑA) */}
        {seccionActiva === 'seguridad' && (
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
        )}

      </main>
    </div>
  );
}