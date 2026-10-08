import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import logoDaeji from '../assets/logo-letras.png';

// Importamos las vistas independientes
import MasterInicio from '../master/MasterInicio';
import MasterGestionAtletas from '../master/MasterGestionAtletas';
import MasterEventos from '../master/MasterEventos';
import MasterRoles from '../master/MasterRoles';
import MasterMigracion from '../master/MasterMigracion';

export default function MasterDashboard() {
  const [usuario, setUsuario] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('inicio');
  const [menuAbiertoMovil, setMenuAbiertoMovil] = useState(false);
  
  const [totalAtletas, setTotalAtletas] = useState(0);
  const [atletasActivos, setAtletasActivos] = useState(0);
  const [atletasInactivos, setAtletasInactivos] = useState(0);
  const [listaAtletasGlobal, setListaAtletasGlobal] = useState([]);
  const [guardandoMasivoAtletas, setGuardandoMasivoAtletas] = useState(false);

  // Estados para Eventos
  const [listaEventos, setListaEventos] = useState([]);
  const [tituloEvento, setTituloEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('Examen');
  const [descripcionEvento, setDescripcionEvento] = useState('');
  const [costoEvento, setCostoEvento] = useState('0');
  const [fechaInicioVisibilidad, setFechaInicioVisibilidad] = useState('');
  const [fechaFinVisibilidad, setFechaFinVisibilidad] = useState('');
  const [fechaRealEvento, setFechaRealEvento] = useState('');
  const [fechaLimitePago, setFechaLimitePago] = useState('');
  const [guardandoEvento, setGuardandoEvento] = useState(false);

  // Estados para Carga Masiva
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState('');

  // Estados para Roles
  const [listaTutores, setListaTutores] = useState([]);
  const [tutorSeleccionado, setTutorSeleccionado] = useState('');
  const [permisosTutor, setPermisosTutor] = useState({
    gestionAtletas: false,
    asistencias: false,
    pagos: false,
    expedientes: false,
    evaluaciones: false,
    competencias: false,
    eventos: false,
  });
  const [cargandoRoles, setCargandoRoles] = useState(false);

  const modulosDisponibles = [
    { id: 'gestionAtletas', label: 'Gestión Global de Atletas' },
    { id: 'asistencias', label: 'Control de Asistencias' },
    { id: 'pagos', label: 'Gestión de Pagos / Financiero' },
    { id: 'expedientes', label: 'Expediente de Atletas' },
    { id: 'evaluaciones', label: 'Evaluaciones y Exámenes' },
    { id: 'competencias', label: 'Historial de Competencias' },
    { id: 'eventos', label: 'Convocatorias y Eventos (Master)' },
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarDatosGenerales();
        await cargarTutoresRegistrados();
        await cargarEventos();
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [navigate]);

  const calcularEdad = (atletaData) => {
    const valorFecha = atletaData.fechaNacimiento || atletaData.nacimiento || atletaData.fechaNac || atletaData.fechanac;
    if (!valorFecha) return 0;
    let nacimiento;
    if (typeof valorFecha === 'string') {
      let fechaLimpia = valorFecha.trim();
      if (fechaLimpia.includes('/')) {
        const partes = fechaLimpia.split('/');
        if (partes.length === 3) fechaLimpia = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
      nacimiento = new Date(fechaLimpia.includes('T') ? fechaLimpia : fechaLimpia + 'T00:00:00');
    } else if (valorFecha.seconds) {
      nacimiento = new Date(valorFecha.seconds * 1000);
    } else if (valorFecha instanceof Date) {
      nacimiento = valorFecha;
    } else {
      return 0;
    }
    if (isNaN(nacimiento.getTime())) return 0;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad >= 0 ? edad : 0;
  };

  const obtenerCategoriaPorEdad = (edad) => {
    if (edad >= 3 && edad < 7) return 'Pewwe';
    if (edad >= 8 && edad <= 11) return 'Infantiles';
    if (edad >= 12 && edad <= 17) return 'Juveniles';
    if (edad >= 18) return 'Mayores';
    return 'Pewwe';
  };

  const cargarDatosGenerales = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'atletas'));
      setTotalAtletas(querySnapshot.size);
      const atletas = [];
      let activosCount = 0;
      let inactivosCount = 0;
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const estado = data.estado || 'Activo';
        if (estado === 'Inactivo') inactivosCount++;
        else activosCount++;
        const edad = calcularEdad(data);
        const categoria = obtenerCategoriaPorEdad(edad);
        atletas.push({ id: docSnap.id, ...data, estado, edad, categoria });
      });
      setAtletasActivos(activosCount);
      setAtletasInactivos(inactivosCount);
      setListaAtletasGlobal(atletas);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const cargarTutoresRegistrados = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'atletas'));
      const correosUnicos = new Set();
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tutorEmail) correosUnicos.add(data.tutorEmail);
      });
      correosUnicos.add('prischernandez15@gmail.com');
      correosUnicos.add('rsibajac@gmail.com');
      setListaTutores(Array.from(correosUnicos));
    } catch (error) {
      console.error("Error al cargar tutores:", error);
    }
  };

  const cargarEventos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'eventos'));
      const eventosTemp = [];
      querySnapshot.forEach((docSnap) => {
        eventosTemp.push({ id: docSnap.id, ...docSnap.data() });
      });
      setListaEventos(eventosTemp);
    } catch (error) {
      console.error("Error al cargar eventos:", error);
    }
  };

  const crearNuevoEvento = async (e) => {
    e.preventDefault();
    if (!tituloEvento || !fechaRealEvento) {
      alert("⚠️ Por favor completa al menos el título y la fecha del evento.");
      return;
    }
    setGuardandoEvento(true);
    try {
      const nuevoEventoData = {
        titulo: tituloEvento,
        tipo: tipoEvento,
        descripcion: descripcionEvento,
        costo: costoEvento,
        fechaInicioVisibilidad: fechaInicioVisibilidad || new Date().toISOString().split('T')[0],
        fechaFinVisibilidad: fechaFinVisibilidad || fechaRealEvento,
        fechaReal: fechaRealEvento,
        fechaLimitePago: fechaLimitePago || fechaRealEvento,
        creadoEn: new Date()
      };
      await addDoc(collection(db, 'eventos'), nuevoEventoData);
      alert("✅ ¡Evento o convocatoria creado con éxito y visible para los atletas!");
      setTituloEvento('');
      setDescripcionEvento('');
      setCostoEvento('0');
      setFechaInicioVisibilidad('');
      setFechaFinVisibilidad('');
      setFechaRealEvento('');
      setFechaLimitePago('');
      await cargarEventos();
    } catch (error) {
      console.error("Error al crear evento:", error);
      alert("❌ Ocurrió un error al guardar el evento.");
    } finally {
      setGuardandoEvento(false);
    }
  };

  const seleccionarTutor = async (correo) => {
    setTutorSeleccionado(correo);
    if (!correo) return;
    setCargandoRoles(true);
    try {
      const idDoc = correo.replace(/[@.]/g, '_');
      const docRef = doc(db, 'roles_usuarios', idDoc);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPermisosTutor(docSnap.data().permisos || {
          gestionAtletas: false, asistencias: false, pagos: false, expedientes: false, evaluaciones: false, competencias: false, eventos: false
        });
      } else {
        setPermisosTutor({ gestionAtletas: false, asistencias: false, pagos: false, expedientes: false, evaluaciones: false, competencias: false, eventos: false });
      }
    } catch (error) {
      console.error("Error al cargar permisos del tutor:", error);
    } finally {
      setCargandoRoles(false);
    }
  };

  const guardarPermisosTutor = async () => {
    if (!tutorSeleccionado) {
      alert("⚠️ Por favor selecciona un tutor primero.");
      return;
    }
    try {
      const idDoc = tutorSeleccionado.replace(/[@.]/g, '_');
      const docRef = doc(db, 'roles_usuarios', idDoc);
      await setDoc(docRef, {
        correo: tutorSeleccionado,
        permisos: permisosTutor,
        actualizadoEn: new Date().toISOString()
      }, { merge: true });
      alert(`✅ Permisos actualizados con éxito para ${tutorSeleccionado}`);
    } catch (error) {
      console.error("Error al guardar permisos:", error);
      alert("❌ Ocurrió un error al guardar los permisos.");
    }
  };

  const cambiarCheckModulo = (idModulo) => {
    setPermisosTutor({
      ...permisosTutor,
      [idModulo]: !permisosTutor[idModulo]
    });
  };

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    navigate('/');
  };

  const cambiarSeccion = async (seccion) => {
    if (seccion === 'asistencia') {
      navigate('/asistencia');
      return;
    }
    setSeccionActiva(seccion);
    setMenuAbiertoMovil(false);
    if (seccion === 'gestion') await cargarDatosGenerales();
    else if (seccion === 'roles') await cargarTutoresRegistrados();
    else if (seccion === 'eventos') await cargarEventos();
  };

  const manejarCambioLocalAtleta = (idAtleta, campo, valor) => {
    setListaAtletasGlobal(prev => prev.map(a => {
      if (a.id === idAtleta) {
        if (campo.includes('.')) {
          const [padre, hijo] = campo.split('.');
          return { ...a, [padre]: { ...a[padre], [hijo]: valor } };
        }
        return { ...a, [campo]: valor };
      }
      return a;
    }));
  };

  const manejarCambioDiasLocal = (idAtleta, diaSeleccionado) => {
    setListaAtletasGlobal(prev => prev.map(a => {
      if (a.id === idAtleta) {
        const diasActuales = a.disciplina?.diasEntreno || [];
        let nuevosDias;
        if (diasActuales.includes(diaSeleccionado)) {
          nuevosDias = diasActuales.filter(d => d !== diaSeleccionado);
        } else {
          nuevosDias = [...diasActuales, diaSeleccionado];
        }
        return { ...a, disciplina: { ...a.disciplina, diasEntreno: nuevosDias } };
      }
      return a;
    }));
  };

  const guardarCambiosMasivosAtletas = async () => {
    setGuardandoMasivoAtletas(true);
    try {
      for (const atleta of listaAtletasGlobal) {
        const docRef = doc(db, 'atletas', atleta.id);
        await updateDoc(docRef, {
          estado: atleta.estado || 'Activo',
          financiera: {
            ...atleta.financiera,
            tipoAlumno: atleta.financiera?.tipoAlumno || 'Regular',
            cuotaMensual: atleta.financiera?.cuotaMensual || '0'
          },
          disciplina: {
            ...atleta.disciplina,
            diasEntreno: atleta.disciplina?.diasEntreno || [],
            grado: atleta.disciplina?.grado || 'Cinturón Blanco'
          }
        });
      }
      alert("✅ ¡Todos los cambios de los atletas se han guardado de forma masiva con éxito!");
      await cargarDatosGenerales();
    } catch (error) {
      console.error("Error al guardar masivamente atletas:", error);
      alert("❌ Ocurrió un error al guardar los cambios.");
    } finally {
      setGuardandoMasivoAtletas(false);
    }
  };

  const descargarPlantillaCSV = () => {
    const encabezados = [
      "tutorEmail", "passwordTemporal", "cedula", "nombre1", "apellido1", "apellido2",
      "fechaNacimiento", "telefono", "genero", "provincia", "canton", "distrito", "otrasSenas",
      "tipoSangre", "padecimientos", "lesiones", "contactoEmergencia", "telefonoEmergencia",
      "parentescoEmergencia", "grado", "otraAcademia", "nombreAcademiaAnterior",
      "profesorAnterior", "tiempoAcademiaAnterior", "fechaIngresoDaeji", "diasEntreno",
      "tipoAlumno", "cuotaMensual"
    ];
    const ejemploFila = [
      "tutor.ejemplo@correo.com", "Daeji2026*", "101110111", "Donovan", "Ramirez", "Esquivel",
      "2010-05-12", "88888888", "Masculino", "San José", "Tibás", "San Juan", "Costado este del parque",
      "0+", "Ninguno", "Ninguna", "María Esquivel", "77777777", "Madre", "Cinturón Amarillo",
      "No", "", "", "", "2024-01-15", "Lunes, Miércoles", "Regular", "25000"
    ];
    const contenidoCSV = [encabezados.join(","), ejemploFila.join(",")].join("\n");
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.setAttribute("href", url);
    enlace.setAttribute("download", "plantilla_migracion_daeji.csv");
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  const iniciarMigracionMasiva = () => {
    if (!archivoSeleccionado) {
      alert("⚠️ Por favor selecciona primero un archivo CSV lleno.");
      return;
    }
    setProcesando(true);
    setProgreso("Leyendo archivo CSV...");
    Papa.parse(archivoSeleccionado, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const filas = results.data;
        let tutoresCreados = 0;
        let atletasRegistrados = 0;
        let totalOmitidos = 0;
        for (let i = 0; i < filas.length; i++) {
          const fila = filas[i];
          setProgreso(`Procesando registro ${i + 1} de ${filas.length}...`);
          try {
            const emailTutor = fila.tutorEmail ? fila.tutorEmail.trim() : '';
            const passwordTemp = fila.passwordTemporal ? fila.passwordTemporal.trim() : 'Daeji2026*';
            if (!emailTutor || !fila.cedula) {
              totalOmitidos++;
              continue;
            }
            try {
              await createUserWithEmailAndPassword(auth, emailTutor, passwordTemp);
              tutoresCreados++;
            } catch (errorAuth) {
              if (errorAuth.code !== 'auth/email-already-in-use') {
                console.warn(`Aviso Auth para ${emailTutor}:`, errorAuth.message);
              }
            }
            const qCedula = query(collection(db, 'atletas'), where('cedula', '==', fila.cedula));
            const resultadoCedula = await getDocs(qCedula);
            if (!resultadoCedula.empty) {
              totalOmitidos++;
              continue;
            }
            const diasArray = fila.diasEntreno ? fila.diasEntreno.split(',').map(d => d.trim()) : ["Lunes", "Miércoles"];
            const nuevoAtleta = {
              cedula: fila.cedula || '',
              nombre1: fila.nombre1 || '',
              apellido1: fila.apellido1 || '',
              apellido2: fila.apellido2 || '',
              fechaNacimiento: fila.fechaNacimiento || '',
              telefono: fila.telefono || '',
              genero: fila.genero || 'Masculino',
              estado: 'Activo',
              foto: '',
              direccion: {
                provincia: fila.provincia || '',
                canton: fila.canton || '',
                distrito: fila.distrito || '',
                otrasSenas: fila.otrasSenas || ''
              },
              medico: {
                tipoSangre: fila.tipoSangre || '',
                padecimientos: fila.padecimientos || '',
                lesiones: fila.lesiones || ''
              },
              emergencia: {
                contacto: fila.contactoEmergencia || '',
                telefono: fila.telefonoEmergencia || '',
                parentesco: fila.parentescoEmergencia || ''
              },
              disciplina: {
                grado: fila.grado || 'Cinturón Blanco',
                diasEntreno: diasArray,
                otraAcademia: fila.otraAcademia || 'No',
                nombreAcademiaAnterior: fila.otraAcademia === 'Si' ? fila.nombreAcademiaAnterior : '',
                profesorAnterior: fila.otraAcademia === 'Si' ? fila.profesorAnterior : '',
                tiempoAcademiaAnterior: fila.otraAcademia === 'Si' ? fila.tiempoAcademiaAnterior : '',
                fechaIngresoDaeji: fila.fechaIngresoDaeji || ''
              },
              financiera: {
                tipoAlumno: fila.tipoAlumno || 'Regular',
                cuotaMensual: fila.cuotaMensual || '0'
              },
              tutorEmail: emailTutor,
              fechaRegistro: new Date()
            };
            await addDoc(collection(db, 'atletas'), nuevoAtleta);
            atletasRegistrados++;
          } catch (error) {
            console.error(`Error procesando la fila ${i + 1}:`, error);
          }
        }
        setProcesando(false);
        setProgreso('');
        await cargarDatosGenerales();
        alert(`Migración masiva completada.\n\n- Tutores creados: ${tutoresCreados}\n- Atletas registrados: ${atletasRegistrados}\n- Omitidos (duplicados): ${totalOmitidos}`);
      },
      error: () => {
        setProcesando(false);
        setProgreso('');
        alert("❌ Error al leer el archivo CSV.");
      }
    });
  };

  if (!usuario) return <div className="contenedor-principal">Cargando panel de Master...</div>;

  return (
    <div className="master-container" translate="no">
      
      {/* 1. ESTILOS CSS - MOBILE FIRST (Adaptados a variables globales) */}
      <style>{`
        * { box-sizing: border-box; }
        .master-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-principal, #0a192f);
          color: var(--texto-principal, #fff);
          font-family: sans-serif;
        }

        /* CABECERA EXCLUSIVA DE MÓVILES */
        .mobile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-secundario, #07111e);
          padding: 15px 20px;
          border-bottom: 1px solid var(--borde-color, rgba(255,255,255,0.08));
          position: sticky;
          top: 0;
          z-index: 50;
        }

        /* MENÚ LATERAL (DRAWER EN MÓVIL) */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 260px;
          height: 100vh;
          background: var(--bg-secundario, #07111e);
          border-right: 1px solid var(--borde-color, rgba(255,255,255,0.08));
          z-index: 100;
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          padding: 20px;
          overflow-y: auto;
        }
        
        .sidebar.closed-mobile {
          transform: translateX(-100%);
        }

        /* CAPA OSCURA */
        .mobile-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 90;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .mobile-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        /* CONTENIDO PRINCIPAL ADAPTABLE */
        .main-content {
          flex: 1;
          padding: 20px;
          width: 100%;
          max-width: 100vw;
          overflow-x: auto; 
        }

        .btn-volver {
          background: transparent;
          border: none;
          color: #3498db;
          font-size: 1rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        /* ------------------------------------------- */
        /* ADAPTACIÓN A PANTALLAS GRANDES (ESCRITORIO) */
        /* ------------------------------------------- */
        @media (min-width: 800px) {
          .master-container {
            flex-direction: row;
          }
          .mobile-header {
            display: none; 
          }
          .sidebar.closed-mobile {
            transform: translateX(0); 
          }
          .main-content {
            margin-left: 260px; 
            padding: 40px;
          }
          .mobile-overlay {
            display: none; 
          }
          .btn-cerrar-menu {
            display: none; 
          }
        }
      `}</style>

      {/* 2. BARRA SUPERIOR (Botones protegidos con propiedad 'key') */}
      <div className="mobile-header">
        {seccionActiva !== 'inicio' ? (
          <button key="btn-volver" onClick={() => cambiarSeccion('inicio')} className="btn-volver">
            <span style={{ fontSize: '1.2rem' }}>⬅</span> <span>Volver al Inicio</span>
          </button>
        ) : (
          <button 
            key="btn-menu"
            onClick={() => setMenuAbiertoMovil(true)} 
            style={{ background: '#121212', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <span>☰</span>
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '85px' }} />
        </div>
      </div>

      {/* 3. CAPA OSCURA */}
      <div 
        className={`mobile-overlay ${menuAbiertoMovil ? 'active' : ''}`} 
        onClick={() => setMenuAbiertoMovil(false)}
      ></div>

      {/* 4. BARRA LATERAL DE NAVEGACIÓN */}
      <aside className={`sidebar ${!menuAbiertoMovil ? 'closed-mobile' : ''}`}>
        
        <div className="btn-cerrar-menu" style={{ textAlign: 'right', marginBottom: '10px' }}>
          <button onClick={() => setMenuAbiertoMovil(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '110px', marginBottom: '10px' }} />
          <span style={{ background: 'var(--color-primario, #e63946)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', width: 'fit-content', margin: '0 auto' }}>MASTER ADMIN</span>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          <button 
            onClick={() => cambiarSeccion('inicio')} 
            style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', background: seccionActiva === 'inicio' ? 'var(--color-primario, #e63946)' : 'transparent', color: seccionActiva === 'inicio' ? '#fff' : '#aaa' }}
          >
            <span>Resumen Ejecutivo</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('gestion')} 
            style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', background: seccionActiva === 'gestion' ? 'var(--color-primario, #e63946)' : 'transparent', color: seccionActiva === 'gestion' ? '#fff' : '#aaa' }}
          >
            <span>Gestión de Atletas</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('eventos')} 
            style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', background: seccionActiva === 'eventos' ? 'var(--color-primario, #e63946)' : 'transparent', color: seccionActiva === 'eventos' ? '#fff' : '#aaa' }}
          >
            <span>Convocatorias y Eventos</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('roles')} 
            style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', background: seccionActiva === 'roles' ? 'var(--color-primario, #e63946)' : 'transparent', color: seccionActiva === 'roles' ? '#fff' : '#aaa' }}
          >
            <span>Gestión de Roles</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('migracion')} 
            style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', background: seccionActiva === 'migracion' ? 'var(--color-primario, #e63946)' : 'transparent', color: seccionActiva === 'migracion' ? '#fff' : '#aaa' }}
          >
            <span>Carga Masiva (CSV)</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('asistencia')} 
            style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', background: 'transparent', color: '#aaa' }}
          >
            <span>Control de Asistencia &rarr;</span>
          </button>
        </nav>
        
        <div style={{ borderTop: '1px solid var(--borde-color, rgba(255,255,255,0.08))', paddingTop: '15px' }}>
          <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.email}</p>
          <button onClick={manejarCerrarSesion} className="btn-secundario" style={{ width: '100%', fontSize: '0.85rem' }}>
            <span>CERRAR SESIÓN</span>
          </button>
        </div>
      </aside>

      {/* 5. CONTENIDO PRINCIPAL DONDE CARGAN LOS MÓDULOS */}
      <main className="main-content">
        {seccionActiva === 'inicio' && (
          <MasterInicio 
            key="inicio"
            totalAtletas={totalAtletas} 
            atletasActivos={atletasActivos} 
            atletasInactivos={atletasInactivos} 
            cambiarSeccion={cambiarSeccion} 
            navigate={navigate} 
          />
        )}

        {seccionActiva === 'gestion' && (
          <MasterGestionAtletas 
            key="gestion"
            listaAtletasGlobal={listaAtletasGlobal} 
            manejarCambioLocalAtleta={manejarCambioLocalAtleta} 
            manejarCambioDiasLocal={manejarCambioDiasLocal} 
            guardarCambiosMasivosAtletas={guardarCambiosMasivosAtletas} 
            guardandoMasivoAtletas={guardandoMasivoAtletas} 
          />
        )}

        {seccionActiva === 'eventos' && (
          <MasterEventos 
            key="eventos"
            tituloEvento={tituloEvento} setTituloEvento={setTituloEvento}
            tipoEvento={tipoEvento} setTipoEvento={setTipoEvento}
            descripcionEvento={descripcionEvento} setDescripcionEvento={setDescripcionEvento}
            costoEvento={costoEvento} setCostoEvento={setCostoEvento}
            fechaInicioVisibilidad={fechaInicioVisibilidad} setFechaInicioVisibilidad={setFechaInicioVisibilidad}
            fechaFinVisibilidad={fechaFinVisibilidad} setFechaFinVisibilidad={setFechaFinVisibilidad}
            fechaRealEvento={fechaRealEvento} setFechaRealEvento={setFechaRealEvento}
            fechaLimitePago={fechaLimitePago} setFechaLimitePago={setFechaLimitePago}
            guardandoEvento={guardandoEvento} crearNuevoEvento={crearNuevoEvento} listaEventos={listaEventos}
          />
        )}

        {seccionActiva === 'roles' && (
          <MasterRoles 
            key="roles"
            listaTutores={listaTutores}
            tutorSeleccionado={tutorSeleccionado}
            seleccionarTutor={seleccionarTutor}
            cargandoRoles={cargandoRoles}
            modulosDisponibles={modulosDisponibles}
            permisosTutor={permisosTutor}
            cambiarCheckModulo={cambiarCheckModulo}
            guardarPermisosTutor={guardarPermisosTutor}
          />
        )}

        {seccionActiva === 'migracion' && (
          <MasterMigracion 
            key="migracion"
            descargarPlantillaCSV={descargarPlantillaCSV}
            setArchivoSeleccionado={setArchivoSeleccionado}
            procesando={procesando}
            progreso={progreso}
            iniciarMigracionMasiva={iniciarMigracionMasiva}
          />
        )}
      </main>
    </div>
  );
}