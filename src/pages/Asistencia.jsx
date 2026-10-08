import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function Asistencia() {
  const [usuario, setUsuario] = useState(null);
  const [alumnosAsistencia, setAlumnosAsistencia] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const fechaHoy = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  
  const [registroAsistencia, setRegistroAsistencia] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [categoriaAsistenciaActiva, setCategoriaAsistenciaActiva] = useState('Pewwe');
  const [mostrarSoloProgramados, setMostrarSoloProgramados] = useState(true);

  // Estado para saber si el día seleccionado ya tiene un registro confirmado en Firebase
  const [diaRegistradoEnBD, setDiaRegistradoEnBD] = useState(false);

  const navigate = useNavigate();

  const categoriasEdades = [
    { id: 'Pewwe', label: 'Pewwe (3-7 años)', min: 3, max: 7 },
    { id: 'Infantiles', label: 'Infantiles (8-11 años)', min: 8, max: 11 },
    { id: 'Juveniles', label: 'Juveniles (12-17 años)', min: 12, max: 17 },
    { id: 'Mayores', label: 'Mayores (18+ años)', min: 18, max: 120 }
  ];

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarAlumnosYAsistencia(fechaSeleccionada);
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

  // CORRECCIÓN DE ZONA HORARIA AL LEER LA FECHA SELECCIONADA
  const [anio, mes, dia] = fechaSeleccionada.split('-').map(Number);
  const fechaObj = new Date(anio, mes - 1, dia); // Meses en JS van de 0 a 11
  const diasMap = { 0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábados" };
  const diaSemanaStr = diasMap[fechaObj.getDay()];

  const normalizarTexto = (texto) => {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
  };
  const diaActualNorm = normalizarTexto(diaSemanaStr);

  const alumnoLeTocaHoy = (alumno) => {
    const diasEntreno = alumno.disciplina?.diasEntreno || alumno.diasEntreno || [];
    if (!Array.isArray(diasEntreno) || diasEntreno.length === 0) return true;
    return diasEntreno.some(d => normalizarTexto(d) === diaActualNorm);
  };

  const cargarAlumnosYAsistencia = async (fecha) => {
    setCargando(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'atletas'));
      const listaAlumnos = [];
      const asistenciaInicial = {};

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const estadoAtleta = data.estado || 'Activo';
        const edad = calcularEdad(data);
        const categoria = obtenerCategoriaPorEdad(edad);
        const alumnoObj = { id: docSnap.id, ...data, edad, categoria };

        const tocaHoy = alumnoLeTocaHoy(alumnoObj);

        if (estadoAtleta !== 'Inactivo') {
          listaAlumnos.push(alumnoObj);
          asistenciaInicial[docSnap.id] = 'presente';
        } else if (tocaHoy) {
          asistenciaInicial[docSnap.id] = 'ausente';
        }
      });

      setAlumnosAsistencia(listaAlumnos);

      const docAsistenciaRef = doc(db, 'asistencias', fecha);
      const docAsistenciaSnap = await getDoc(docAsistenciaRef);

      if (docAsistenciaSnap.exists()) {
        setDiaRegistradoEnBD(true);
        const datosBD = docAsistenciaSnap.data().detalles || {};
        const estadosMapeados = {};
        Object.keys(datosBD).forEach(id => {
          estadosMapeados[id] = typeof datosBD[id] === 'object' ? datosBD[id].estado : datosBD[id];
        });
        setRegistroAsistencia({ ...asistenciaInicial, ...estadosMapeados });
      } else {
        setDiaRegistradoEnBD(false);
        setRegistroAsistencia(asistenciaInicial);
      }

    } catch (error) {
      console.error("Error al cargar datos de asistencia:", error);
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioFecha = async (e) => {
    const nuevaFecha = e.target.value;
    setFechaSeleccionada(nuevaFecha);
    await cargarAlumnosYAsistencia(nuevaFecha);
  };

  const cambiarEstadoAlumno = (idAtleta, estado) => {
    setRegistroAsistencia(prev => ({
      ...prev,
      [idAtleta]: estado
    }));
  };

  const guardarAsistenciaDelDia = async () => {
    setGuardando(true);
    try {
      const detallesEnriquecidos = {};
      
      alumnosAsistencia.forEach(alumno => {
        const estadoActual = registroAsistencia[alumno.id] || 'presente';
        detallesEnriquecidos[alumno.id] = {
          nombreCompleto: `${alumno.nombre1 || ''} ${alumno.apellido1 || ''} ${alumno.apellido2 || ''}`.trim(),
          cedula: alumno.cedula || 'Sin cédula',
          grado: alumno.disciplina?.grado || 'Sin Grado',
          estado: estadoActual
        };
      });

      const docAsistenciaRef = doc(db, 'asistencias', fechaSeleccionada);
      await setDoc(docAsistenciaRef, {
        fecha: fechaSeleccionada,
        registradoPor: usuario.email,
        detalles: detallesEnriquecidos,
        ultimaActualizacion: new Date()
      }, { merge: true });

      setDiaRegistradoEnBD(true);
      alert(`✅ Asistencia del día ${fechaSeleccionada} guardada correctamente.`);
    } catch (error) {
      console.error("Error al guardar asistencia:", error);
      alert("❌ Hubo un error al guardar la asistencia.");
    } finally {
      setGuardando(false);
    }
  };

  const alumnosFiltradosPorDia = alumnosAsistencia.filter(alumno => {
    if (!mostrarSoloProgramados) return true;
    return alumnoLeTocaHoy(alumno);
  });

  if (!usuario || cargando) {
    return <div className="contenedor-principal" style={{ padding: '40px', background: 'var(--bg-principal, #0a192f)', color: '#fff', minHeight: '100vh' }}>Cargando control de asistencia...</div>;
  }

  return (
    <div className="contenedor-principal fondo-animado" style={{ paddingBottom: '50px', background: 'var(--bg-principal, #0a192f)', color: 'var(--texto-principal, #fff)', minHeight: '100vh', fontFamily: 'sans-serif' }} translate="no">
      <header className="encabezado" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secundario, #07111e)', borderBottom: '1px solid var(--borde-color, rgba(255,255,255,0.08))' }}>
        <div className="logo-container">
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '110px' }} />
        </div>
        <div>
          <button className="btn-secundario" onClick={() => navigate('/dashboard')} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            &larr; Volver al Panel
          </button>
        </div>
      </header>

      <main className="hero" style={{ padding: '30px 20px', maxWidth: '950px', margin: '0 auto' }}>
        <h2>Control de Asistencia por Categorías</h2>
        <p style={{ color: 'var(--texto-secundario, #aaa)', marginBottom: '15px' }}>Pase de lista operativo organizado por grupos de edad ({diaSemanaStr})</p>

        {/* INDICADOR VISUAL DE ESTADO DEL DÍA */}
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          {diaRegistradoEnBD ? (
            <span style={{ background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: '1px solid #2ecc71', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block' }}>
              ✅ Asistencia ya registrada para esta fecha (Modo Edición)
            </span>
          ) : (
            <span style={{ background: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', border: '1px solid #f1c40f', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block' }}>
              ⚠️ Este día aún no tiene un registro guardado en el sistema
            </span>
          )}
        </div>

        {/* SELECTOR DE FECHA Y CONTROLES DE FILTRO */}
        <div className="tarjeta-auth" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px 25px', flexWrap: 'wrap', gap: '15px', background: 'var(--bg-secundario, rgba(7, 17, 30, 0.9))', borderRadius: '12px', border: '1px solid var(--borde-color, rgba(255,255,255,0.08))' }}>
          <div>
            <h4 style={{ margin: 0, color: '#fff' }}>Seleccionar Fecha de Clase</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Día detectado: <strong style={{ color: '#3498db' }}>{diaSemanaStr}</strong></p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setMostrarSoloProgramados(!mostrarSoloProgramados)}
              style={{ padding: '9px 14px', borderRadius: '6px', border: 'none', background: mostrarSoloProgramados ? '#2980b9' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {mostrarSoloProgramados ? '🎯 Filtrados por Día' : '👥 Mostrando Todos los Activos'}
            </button>

            <input 
              type="date" 
              value={fechaSeleccionada}
              max={fechaHoy}
              onChange={manejarCambioFecha}
              style={{ padding: '10px 15px', borderRadius: '8px', background: 'var(--bg-principal, #121212)', color: '#fff', border: '1px solid #333', fontSize: '1rem', fontWeight: 'bold' }}
            />
          </div>
        </div>

        {/* PESTAÑAS DE CATEGORÍAS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {categoriasEdades.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAsistenciaActiva(cat.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: categoriaAsistenciaActiva === cat.id ? 'var(--color-primario, #e63946)' : 'rgba(255,255,255,0.05)',
                color: categoriaAsistenciaActiva === cat.id ? '#fff' : '#aaa',
                fontSize: '0.9rem'
              }}
            >
              {cat.label} ({alumnosFiltradosPorDia.filter(a => a.categoria === cat.id).length})
            </button>
          ))}
        </div>

        {/* LISTADO DE ATLETAS */}
        {alumnosFiltradosPorDia.filter(a => a.categoria === categoriaAsistenciaActiva).length === 0 ? (
          <div className="tarjeta-info" style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-secundario, rgba(7, 17, 30, 0.9))', borderRadius: '12px' }}>
            <p style={{ color: '#aaa', marginBottom: '10px' }}>No hay atletas programados para entrenar este {diaSemanaStr} en esta categoría.</p>
            <button 
              onClick={() => setMostrarSoloProgramados(false)}
              style={{ background: 'transparent', border: '1px solid #3498db', color: '#3498db', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              Ver todos los alumnos activos de todas formas
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {alumnosFiltradosPorDia
              .filter(a => a.categoria === categoriaAsistenciaActiva)
              .map((alumno) => {
                const estadoActual = registroAsistencia[alumno.id] || 'presente';

                return (
                  <div 
                    key={alumno.id} 
                    style={{ 
                      background: 'var(--bg-secundario, rgba(10, 25, 47, 0.85))', 
                      border: '1px solid var(--borde-color, rgba(255,255,255,0.1))', 
                      borderRadius: '12px', 
                      padding: '15px 20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '15px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {alumno.foto ? (
                        <img src={alumno.foto} alt="Atleta" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primario, #e63946)' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', background: 'var(--color-primario, #e63946)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>
                          {alumno.nombre1 ? alumno.nombre1.charAt(0) : 'A'}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem' }}>{alumno.nombre1} {alumno.apellido1} {alumno.apellido2}</h4>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#aaa' }}>
                          Edad: <strong style={{ color: '#f39c12' }}>{alumno.edad} años</strong> | Grado: <span style={{ color: 'var(--color-primario, #e63946)', fontWeight: 'bold' }}>{alumno.disciplina?.grado}</span>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => cambiarEstadoAlumno(alumno.id, 'presente')}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                          background: estadoActual === 'presente' ? '#2ecc71' : 'rgba(255,255,255,0.05)',
                          color: estadoActual === 'presente' ? '#fff' : '#aaa'
                        }}
                      >
                        Presente
                      </button>

                      <button 
                        type="button"
                        onClick={() => cambiarEstadoAlumno(alumno.id, 'ausente')}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                          background: estadoActual === 'ausente' ? '#e74c3c' : 'rgba(255,255,255,0.05)',
                          color: estadoActual === 'ausente' ? '#fff' : '#aaa'
                        }}
                      >
                        Ausente
                      </button>

                      <button 
                        type="button"
                        onClick={() => cambiarEstadoAlumno(alumno.id, 'justificado')}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                          background: estadoActual === 'justificado' ? '#f39c12' : 'rgba(255,255,255,0.05)',
                          color: estadoActual === 'justificado' ? '#fff' : '#aaa'
                        }}
                      >
                        Justificado
                      </button>
                    </div>
                  </div>
                );
              })}

            <div style={{ marginTop: '25px', textAlign: 'right', background: 'var(--bg-secundario, rgba(7, 17, 30, 0.9))', padding: '20px', borderRadius: '12px', border: '1px solid var(--borde-color, rgba(255,255,255,0.08))' }}>
              <button 
                onClick={guardarAsistenciaDelDia}
                className="btn-principal"
                style={{ padding: '15px 30px', fontSize: '1.1rem', opacity: guardando ? 0.7 : 1, background: '#2ecc71', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}
                disabled={guardando}
              >
                {guardando ? 'GUARDANDO ASISTENCIA...' : '💾 GUARDAR ASISTENCIA DEL DÍA (MASIVO)'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}