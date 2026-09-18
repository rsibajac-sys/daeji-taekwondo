import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import logoDaeji from '../assets/logo-letras.png';

export default function MasterDashboard() {
  const [usuario, setUsuario] = useState(null);
  
  const [seccionActiva, setSeccionActiva] = useState('inicio');
  const [totalAtletas, setTotalAtletas] = useState(0);
  const [atletasActivos, setAtletasActivos] = useState(0);
  const [atletasInactivos, setAtletasInactivos] = useState(0);
  const [listaAtletasGlobal, setListaAtletasGlobal] = useState([]);
  const [busquedaAtleta, setBusquedaAtleta] = useState('');
  const [guardandoMasivoAtletas, setGuardandoMasivoAtletas] = useState(false);

  // Estados para Carga Masiva
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState('');

  // Estados para Gestión de Roles y Permisos por Tutor
  const [listaTutores, setListaTutores] = useState([]);
  const [tutorSeleccionado, setTutorSeleccionado] = useState('');
  const [permisosTutor, setPermisosTutor] = useState({
    asistencias: false,
    pagos: false,
    expedientes: false,
    evaluaciones: false,
    competencias: false
  });
  const [cargandoRoles, setCargandoRoles] = useState(false);

  const modulosDisponibles = [
    { id: 'asistencias', label: '📋 Control de Asistencias' },
    { id: 'pagos', label: '💰 Gestión de Pagos / Financiero' },
    { id: 'expedientes', label: '🥋 Expediente de Atletas' },
    { id: 'evaluaciones', label: '📝 Evaluaciones y Exámenes' },
    { id: 'competencias', label: '🏆 Historial de Competencias' }
  ];

  const navigate = useNavigate();
  const diasSemanaDisponibles = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados", "Domingo"];

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarDatosGenerales();
        await cargarTutoresRegistrados();
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [navigate]);

  // Función ultra-robusta para calcular la edad buscando en todas las variantes de Firestore
  const calcularEdad = (atletaData) => {
    const valorFecha = atletaData.fechaNacimiento || atletaData.nacimiento || atletaData.fechaNac || atletaData.fechanac;
    if (!valorFecha) return 0;
    let nacimiento;

    if (typeof valorFecha === 'string') {
      let fechaLimpia = valorFecha.trim();
      if (fechaLimpia.includes('/')) {
        const partes = fechaLimpia.split('/');
        if (partes.length === 3) {
          fechaLimpia = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
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
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad >= 0 ? edad : 0;
  };

  const obtenerCategoriaPorEdad = (edad) => {
    if (edad >= 3 && edad <= 7) return 'Pewwe';
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
        
        if (estado === 'Inactivo') {
          inactivosCount++;
        } else {
          activosCount++;
        }

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
        if (data.tutorEmail) {
          correosUnicos.add(data.tutorEmail);
        }
      });

      correosUnicos.add('prischernandez15@gmail.com');
      correosUnicos.add('rsibajac@gmail.com');

      setListaTutores(Array.from(correosUnicos));
    } catch (error) {
      console.error("Error al cargar tutores:", error);
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
          asistencias: false, pagos: false, expedientes: false, evaluaciones: false, competencias: false
        });
      } else {
        setPermisosTutor({ asistencias: false, pagos: false, expedientes: false, evaluaciones: false, competencias: false });
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
    if (seccion === 'gestion') {
      await cargarDatosGenerales();
    } else if (seccion === 'roles') {
      await cargarTutoresRegistrados();
    }
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
      "profesorAnterior", "tiempoAcademiaAnterior", "fechaIngresoDaeji", "diasEntreno", "tipoAlumno", "cuotaMensual"
    ];

    const ejemploFila = [
      "tutor.ejemplo@correo.com", "Daeji2026*", "101110111", "Donovan", "Ramirez", "Esquivel",
      "2010-05-12", "88888888", "Masculino", "San José", "Tibás", "San Juan", "Costado este del parque",
      "O+", "Ninguno", "Ninguna", "María Esquivel", "77777777", "Madre", "Cinturón Amarillo",
      "No", "", "", "", "2024-01-15", "Lunes,Miércoles", "Regular", "25000"
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
        alert(`✅ Migración masiva completada.\n\n- Tutores creados: ${tutoresCreados}\n- Atletas registrados: ${atletasRegistrados}\n- Omitidos (duplicados): ${totalOmitidos}`);
        setArchivoSeleccionado(null);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a192f', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside style={{ width: '260px', background: '#07111e', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', padding: '20px', position: 'fixed', height: '100vh', boxSizing: 'border-box' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '120px', marginBottom: '10px' }} />
          <span style={{ background: '#e63946', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>MASTER ADMIN</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => cambiarSeccion('inicio')}
            style={{
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer',
              background: seccionActiva === 'inicio' ? '#e63946' : 'transparent',
              color: seccionActiva === 'inicio' ? '#fff' : '#aaa'
            }}
          >
            📊 Resumen Ejecutivo
          </button>

          <button 
            onClick={() => cambiarSeccion('gestion')}
            style={{
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer',
              background: seccionActiva === 'gestion' ? '#e63946' : 'transparent',
              color: seccionActiva === 'gestion' ? '#fff' : '#aaa'
            }}
          >
            🥋 Gestión de Atletas
          </button>

          <button 
            onClick={() => cambiarSeccion('roles')}
            style={{
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer',
              background: seccionActiva === 'roles' ? '#e63946' : 'transparent',
              color: seccionActiva === 'roles' ? '#fff' : '#aaa'
            }}
          >
            🔐 Gestión de Roles
          </button>

          <button 
            onClick={() => cambiarSeccion('migracion')}
            style={{
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer',
              background: seccionActiva === 'migracion' ? '#e63946' : 'transparent',
              color: seccionActiva === 'migracion' ? '#fff' : '#aaa'
            }}
          >
            📥 Carga Masiva (CSV)
          </button>

          <button 
            onClick={() => cambiarSeccion('asistencia')}
            style={{
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer',
              background: 'transparent',
              color: '#aaa'
            }}
          >
            📋 Control de Asistencia &rarr;
          </button>
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px' }}>
          <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.email}</p>
          <button onClick={manejarCerrarSesion} className="btn-secundario" style={{ width: '100%', fontSize: '0.85rem' }}>
            CERRAR SESIÓN
          </button>
        </div>

      </aside>

      {/* CONTENEDOR DERECHO */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '40px', boxSizing: 'border-box', overflowY: 'auto' }}>
        
        {/* VISTA 1: INICIO (RESUMEN EJECUTIVO CON KPI'S DE ACTIVOS E INACTIVOS) */}
        {seccionActiva === 'inicio' && (
          <div>
            <h2>Resumen Ejecutivo</h2>
            <p style={{ color: '#aaa', marginBottom: '30px' }}>Indicadores clave y estado general de la Escuela DAEJI.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              
              {/* Tarjeta Total */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.85rem' }}>Total de Atletas</p>
                <h3 style={{ margin: 0, fontSize: '2rem', color: '#3498db' }}>{totalAtletas}</h3>
              </div>

              {/* Tarjeta Activos */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                <p style={{ margin: '0 0 5px 0', color: '#2ecc71', fontSize: '0.85rem', fontWeight: 'bold' }}>🟢 Alumnos Activos</p>
                <h3 style={{ margin: 0, fontSize: '2rem', color: '#2ecc71' }}>{atletasActivos}</h3>
              </div>

              {/* Tarjeta Inactivos */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
                <p style={{ margin: '0 0 5px 0', color: '#e74c3c', fontSize: '0.85rem', fontWeight: 'bold' }}>🔴 Alumnos Inactivos</p>
                <h3 style={{ margin: 0, fontSize: '2rem', color: '#e74c3c' }}>{atletasInactivos}</h3>
              </div>

            </div>

            <div className="tarjeta-auth" style={{ textAlign: 'left' }}>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>Accesos Rápidos</h3>
              <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '20px' }}>Selecciona una herramienta del menú lateral izquierdo para gestionar la academia.</p>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button onClick={() => cambiarSeccion('gestion')} className="btn-secundario" style={{ background: '#e63946', color: '#fff', border: 'none' }}>
                  Gestionar Atletas &rarr;
                </button>
                <button onClick={() => cambiarSeccion('roles')} className="btn-secundario" style={{ background: '#3498db', color: '#fff', border: 'none' }}>
                  Gestión de Roles &rarr;
                </button>
                <button onClick={() => navigate('/asistencia')} className="btn-secundario" style={{ background: '#2ecc71', color: '#fff', border: 'none' }}>
                  Control de Asistencia &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: GESTIÓN DE ATLETAS */}
        {seccionActiva === 'gestion' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2>Gestión Global de Atletas</h2>
                <p style={{ color: '#aaa', margin: 0 }}>Modifica los datos libremente y guarda todo al final de la página.</p>
              </div>
              <button
                onClick={guardarCambiosMasivosAtletas}
                className="btn-principal"
                style={{ padding: '12px 25px', background: '#2ecc71', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', borderRadius: '8px' }}
                disabled={guardandoMasivoAtletas}
              >
                {guardandoMasivoAtletas ? '💾 GUARDANDO CAMBIOS...' : '💾 GUARDAR CAMBIOS MASIVOS'}
              </button>
            </div>

            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre o cédula..." 
              value={busquedaAtleta}
              onChange={(e) => setBusquedaAtleta(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', marginBottom: '20px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {listaAtletasGlobal
                .filter(a => `${a.nombre1} ${a.apellido1} ${a.cedula}`.toLowerCase().includes(busquedaAtleta.toLowerCase()))
                .map((atleta) => {
                  const diasAsignados = atleta.disciplina?.diasEntreno || [];

                  return (
                    <div key={atleta.id} style={{ background: 'rgba(10, 25, 47, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2.5fr 1fr', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                      
                      <div>
                        <h4 style={{ margin: 0, color: '#fff' }}>{atleta.nombre1} {atleta.apellido1} {atleta.apellido2}</h4>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                          Cédula: {atleta.cedula} | <strong style={{ color: '#f39c12' }}>Edad: {atleta.edad} años ({atleta.categoria})</strong>
                        </p>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Estado</label>
                        <select 
                          value={atleta.estado || 'Activo'} 
                          onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'estado', e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%' }}
                        >
                          <option value="Activo">Activo</option>
                          <option value="Inactivo">Inactivo</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Tipo / Cuota</label>
                        <select 
                          value={atleta.financiera?.tipoAlumno || 'Regular'} 
                          onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'financiera.tipoAlumno', e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%', marginBottom: '4px' }}
                        >
                          <option value="Regular">Regular</option>
                          <option value="Becado">Becado</option>
                        </select>
                        <input 
                          type="text" 
                          value={atleta.financiera?.cuotaMensual || ''} 
                          placeholder="Cuota ₡"
                          onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'financiera.cuotaMensual', e.target.value)}
                          style={{ padding: '5px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Días de Entreno (Todos incluidos)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {diasSemanaDisponibles.map((dia) => {
                            const seleccionado = diasAsignados.includes(dia);
                            return (
                              <button
                                key={dia}
                                type="button"
                                onClick={() => manejarCambioDiasLocal(atleta.id, dia)}
                                style={{
                                  padding: '4px 6px',
                                  fontSize: '0.65rem',
                                  borderRadius: '4px',
                                  border: 'none',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  background: seleccionado ? '#e63946' : 'rgba(255,255,255,0.08)',
                                  color: seleccionado ? '#fff' : '#aaa'
                                }}
                              >
                                {dia.substring(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Grado</label>
                        <select 
                          value={atleta.disciplina?.grado || 'Cinturón Blanco'} 
                          onChange={(e) => manejarCambioLocalAtleta(atleta.id, 'disciplina.grado', e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', background: '#121212', color: '#fff', border: '1px solid #333', width: '100%', fontSize: '0.85rem' }}
                        >
                          <option value="Cinturón Blanco">Blanco (10° Gup)</option>
                          <option value="Cinturón Blanco-Amarillo">Blanco-Amarillo (9° Gup)</option>
                          <option value="Cinturón Amarillo">Amarillo (8° Gup)</option>
                          <option value="Cinturón Amarillo-Verde">Amarillo-Verde (7° Gup)</option>
                          <option value="Cinturón Verde">Verde (6° Gup)</option>
                          <option value="Cinturón Verde-Azul">Verde-Azul (5° Gup)</option>
                          <option value="Cinturón Azul">Azul (4° Gup)</option>
                          <option value="Cinturón Azul-Rojo">Azul-Rojo (3° Gup)</option>
                          <option value="Cinturón Rojo">Rojo (2° Gup)</option>
                          <option value="Cinturón Rojo-Negro">Rojo-Negro (1° Gup)</option>
                          <option value="Cinturón Negro 1er Dan">Negro (1er Dan)</option>
                        </select>
                      </div>

                    </div>
                  );
                })}

              <div style={{ marginTop: '20px', textAlign: 'right', background: 'rgba(7, 17, 30, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={guardarCambiosMasivosAtletas}
                  className="btn-principal"
                  style={{ padding: '15px 30px', background: '#2ecc71', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', borderRadius: '8px' }}
                  disabled={guardandoMasivoAtletas}
                >
                  {guardandoMasivoAtletas ? '💾 GUARDANDO CAMBIOS...' : '💾 GUARDAR TODOS LOS CAMBIOS DE ATLETAS (MASIVO)'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* VISTA 3: GESTIÓN DE ROLES */}
        {seccionActiva === 'roles' && (
          <div style={{ maxWidth: '850px' }}>
            <h2>🔐 Gestión de Roles y Permisos por Tutor</h2>
            <p style={{ color: '#aaa', marginBottom: '25px' }}>
              Selecciona un tutor registrado en el sistema y asigna los módulos o páginas a los que tendrá acceso.
            </p>

            <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#3498db', marginBottom: '8px', fontWeight: 'bold' }}>
                Seleccionar Tutor / Correo Electrónico:
              </label>
              <select 
                value={tutorSeleccionado} 
                onChange={(e) => seleccionarTutor(e.target.value)}
                style={{ width: '100%', padding: '12px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px', fontSize: '0.95rem' }}
              >
                <option value="">-- Seleccione un tutor --</option>
                {listaTutores.map((correo, idx) => (
                  <option key={idx} value={correo}>{correo}</option>
                ))}
              </select>
            </div>

            {tutorSeleccionado && (
              <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                  Páginas autorizadas para: <span style={{ color: '#2ecc71' }}>{tutorSeleccionado}</span>
                </h3>

                {cargandoRoles ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Cargando permisos...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modulosDisponibles.map((modulo) => (
                      <label key={modulo.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <input 
                          type="checkbox" 
                          checked={permisosTutor[modulo.id] || false}
                          onChange={() => cambiarCheckModulo(modulo.id)}
                          style={{ width: '20px', height: '20px', accentColor: '#e63946', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>{modulo.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '25px', textAlign: 'right' }}>
                  <button 
                    onClick={guardarPermisosTutor}
                    style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    💾 Guardar Permisos del Tutor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA 4: CARGA MASIVA */}
        {seccionActiva === 'migracion' && (
          <div className="tarjeta-auth" style={{ width: '100%', textAlign: 'left', maxWidth: '800px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
              Módulo de Migración y Carga Masiva
            </h3>
            <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
              En la columna <strong>diasEntreno</strong> de tu CSV, puedes escribir los días separados por comas (ej: <code style={{color: '#3498db'}}>Lunes,Miércoles,Viernes</code>).
            </p>

            <div style={{ margin: '25px 0', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>1. Obtén la estructura base</h4>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Plantilla CSV actualizada con soporte para días múltiples.</p>
              </div>
              <button onClick={descargarPlantillaCSV} className="btn-secundario" style={{ background: '#3498db', color: '#fff', border: 'none' }}>
                📥 Descargar Plantilla CSV
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>2. Sube el archivo completado</h4>
              
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setArchivoSeleccionado(e.target.files[0])}
                style={{ width: '100%', padding: '10px', background: '#121212', borderRadius: '8px', border: '1px solid #333', color: '#fff' }} 
              />
              
              {procesando && (
                <p style={{ color: '#f39c12', marginTop: '15px', fontWeight: 'bold', textAlign: 'center' }}>
                  ⏳ {progreso}
                </p>
              )}

              <button 
                className="btn-principal ancho-completo" 
                style={{ marginTop: '15px', opacity: procesando ? 0.7 : 1, cursor: procesando ? 'not-allowed' : 'pointer' }}
                onClick={iniciarMigracionMasiva}
                disabled={procesando}
              >
                {procesando ? 'IMPORTANDO DATOS...' : '🚀 Procesar e Iniciar Migración Masiva'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}