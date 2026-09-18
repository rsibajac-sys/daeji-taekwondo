import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function Expediente() {
  const { id } = useParams();
  const [usuario, setUsuario] = useState(null);
  const [atleta, setAtleta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Pestaña activa: 'inicio', 'asistencia', 'competencias', 'info'
  const [pestanaExpediente, setPestanaExpediente] = useState('inicio');

  // Estados para KPIs y Desglose de Asistencia
  const [estadisticasAsistencia, setEstadisticasAsistencia] = useState({
    porcentajeHistorico: 0,
    porcentajeAnual: 0,
    porcentajeSemestral: 0
  });
  const [historialFechasAsistencia, setHistorialFechasAsistencia] = useState([]);
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState('todos');
  const [mostrarDesgloseAsistencia, setMostrarDesgloseAsistencia] = useState(false);

  // Estados para Módulo de Competencias y Ranking
  const [listaCompetencias, setListaCompetencias] = useState([]);
  const [mostrarModalCompetencia, setMostrarModalCompetencia] = useState(false);
  const [nuevaComp, setNuevaComp] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'G2',
    lugar: '',
    categoriaWTF: 'Senior -58kg',
    posicion: '1',
    participantesLlave: [{ nombre: '', lugar: '1' }],
    enfrentamientos: [{ oponente: '', r1: '', r2: '', r3: '' }]
  });

  // Filtros globales para el Ranking y Puntos
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState(['G2', 'G4', 'JDN', 'Internacional', 'Amistoso']);

  const navigate = useNavigate();

  const categoriasWTFDisponibles = [
    "Cadete -33kg", "Cadete -37kg", "Cadete -41kg", "Cadete -45kg", "Cadete -49kg", "Cadete -53kg", "Cadete +53kg",
    "Juvenil -45kg", "Juvenil -48kg", "Juvenil -51kg", "Juvenil -55kg", "Juvenil -59kg", "Juvenil -63kg", "Juvenil +73kg",
    "Sub-21 -54kg", "Sub-21 -58kg", "Sub-21 -63kg", "Sub-21 -68kg", "Sub-21 -74kg", "Sub-21 +80kg",
    "Senior -54kg", "Senior -58kg", "Senior -63kg", "Senior -68kg", "Senior -74kg", "Senior -80kg", "Senior +80kg",
    "Poomsae Individual", "Poomsae Parejas", "Poomsae Team"
  ];

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarDatosAtletaYAsistencia(id);
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [id, navigate]);

  const cargarDatosAtletaYAsistencia = async (idAtleta) => {
    try {
      const docRef = doc(db, 'atletas', idAtleta);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        alert("El expediente no existe o fue eliminado.");
        navigate('/dashboard');
        return;
      }

      const datosAtleta = { id: docSnap.id, ...docSnap.data() };
      setAtleta(datosAtleta);
      setListaCompetencias(datosAtleta.competencias || []);

      const queryAsistencias = await getDocs(collection(db, 'asistencias'));
      const registrosAlumno = [];
      let totalClasesEsperadasHistoricas = 0, totalClasesAsistidasHistoricas = 0;
      let totalClasesEsperadasAnual = 0, totalClasesAsistidasAnual = 0;
      let totalClasesEsperadasSemestre = 0, totalClasesAsistidasSemestre = 0;

      const anioActual = new Date().getFullYear();
      const mesActual = new Date().getMonth();
      const esPrimerSemestre = mesActual < 6;
      const diasEntrenoAtleta = datosAtleta.disciplina?.diasEntreno || ["Lunes", "Miércoles"];

      queryAsistencias.forEach((docAsistencia) => {
        const dataFecha = docAsistencia.data();
        const fechaStr = dataFecha.fecha;
        const detalles = dataFecha.detalles || {};

        if (detalles[idAtleta]) {
          const estado = detalles[idAtleta];
          registrosAlumno.push({ fecha: fechaStr, estado: estado });

          const fechaObj = new Date(fechaStr + 'T00:00:00');
          const anioFecha = fechaObj.getFullYear();
          const mesFecha = fechaObj.getMonth();
          const esSemestreFechaPrimer = mesFecha < 6;

          const diasMap = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábados" };
          const diaSemanaStr = diasMap[fechaObj.getDay()];

          if (diasEntrenoAtleta.includes(diaSemanaStr)) {
            totalClasesEsperadasHistoricas++;
            if (estado === 'presente' || estado === 'justificado') totalClasesAsistidasHistoricas++;

            if (anioFecha === anioActual) {
              totalClasesEsperadasAnual++;
              if (estado === 'presente' || estado === 'justificado') totalClasesAsistidasAnual++;

              if (esSemestreFechaPrimer === esPrimerSemestre) {
                totalClasesEsperadasSemestre++;
                if (estado === 'presente' || estado === 'justificado') totalClasesAsistidasSemestre++;
              }
            }
          }
        }
      });

      registrosAlumno.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setHistorialFechasAsistencia(registrosAlumno);

      const calcPorcentaje = (asistidas, esperadas) => esperadas > 0 ? Math.round((asistidas / esperadas) * 100) : 100;

      setEstadisticasAsistencia({
        porcentajeHistorico: calcPorcentaje(totalClasesAsistidasHistoricas, totalClasesEsperadasHistoricas),
        porcentajeAnual: calcPorcentaje(totalClasesAsistidasAnual, totalClasesEsperadasAnual),
        porcentajeSemestral: calcPorcentaje(totalClasesAsistidasSemestre, totalClasesEsperadasSemestre)
      });

    } catch (error) {
      console.error("Error al cargar expediente:", error);
    } finally {
      setCargando(false);
    }
  };

  const calcularPuntos = (tipo, posicion) => {
    let base = 0;
    if (posicion === '1') base = 20;
    else if (posicion === '2') base = 12;
    else if (posicion === '3') base = 7.2;
    else if (posicion === '4') base = 4.32;
    else if (posicion === '5') base = 3.02;
    else if (posicion === '6') base = 3.02;

    let resultado = 0;
    if (tipo === 'G2') resultado = base;
    else if (tipo === 'G4') resultado = base * 2;
    else if (tipo === 'JDN') resultado = base;

    return parseFloat(resultado.toFixed(2));
  };

  const guardarCompetencia = async (e) => {
    e.preventDefault();
    const puntosObtenidos = calcularPuntos(nuevaComp.tipo, nuevaComp.posicion);
    const competenciaFinal = { ...nuevaComp, puntos: puntosObtenidos, idComp: Date.now() };
    const nuevasCompetencias = [competenciaFinal, ...listaCompetencias];

    try {
      const docRef = doc(db, 'atletas', id);
      await updateDoc(docRef, { competencias: nuevasCompetencias });
      setListaCompetencias(nuevasCompetencias);
      setMostrarModalCompetencia(false);
      setNuevaComp({
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'G2',
        lugar: '',
        categoriaWTF: 'Senior -58kg',
        posicion: '1',
        participantesLlave: [{ nombre: '', lugar: '1' }],
        enfrentamientos: [{ oponente: '', r1: '', r2: '', r3: '' }]
      });
      alert("✅ Competencia registrada con éxito.");
    } catch (error) {
      console.error("Error al guardar competencia:", error);
      alert("❌ Ocurrió un error al guardar.");
    }
  };

  const agregarParticipanteLlave = () => {
    setNuevaComp({ ...nuevaComp, participantesLlave: [...nuevaComp.participantesLlave, { nombre: '', lugar: '1' }] });
  };

  const agregarEnfrentamiento = () => {
    setNuevaComp({ ...nuevaComp, enfrentamientos: [...nuevaComp.enfrentamientos, { oponente: '', r1: '', r2: '', r3: '' }] });
  };

  const toggleTipoFiltro = (tipo) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter(t => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

  // Obtener lista única de nombres de rivales ya existentes en la base de datos del atleta
  const obtenerNombresRivalesExistentes = () => {
    const nombresSet = new Set();
    listaCompetencias.forEach(comp => {
      if (comp.participantesLlave) {
        comp.participantesLlave.forEach(p => {
          if (p.nombre && p.nombre.trim()) nombresSet.add(p.nombre.trim());
        });
      }
      if (comp.enfrentamientos) {
        comp.enfrentamientos.forEach(enf => {
          if (enf.oponente && enf.oponente.trim()) nombresSet.add(enf.oponente.trim());
        });
      }
    });
    return Array.from(nombresSet);
  };

  const listaRivalesBD = obtenerNombresRivalesExistentes();

  // Filtrado de competencias personales del atleta
  const competenciasFiltradasPersonal = listaCompetencias.filter(comp => {
    const cumpleTipo = tiposSeleccionados.includes(comp.tipo);
    const cumpleFechaInicio = filtroFechaInicio ? comp.fecha >= filtroFechaInicio : true;
    const cumpleFechaFin = filtroFechaFin ? comp.fecha <= filtroFechaFin : true;
    return cumpleTipo && cumpleFechaInicio && cumpleFechaFin;
  });

  const totalPuntosPersonal = parseFloat(
    competenciasFiltradasPersonal.reduce((acc, curr) => acc + (Number(curr.puntos) || 0), 0).toFixed(2)
  );

  // ANÁLISIS AUTOMÁTICO DE RIVALES DE LAS LLAVES FILTRADAS
  const calcularRankingRivalesDeLlaves = () => {
    const acumuladorRivales = {};

    competenciasFiltradasPersonal.forEach(comp => {
      const participantes = comp.participantesLlave || [];
      participantes.forEach(part => {
        const nombreRival = part.nombre?.trim();
        if (nombreRival) {
          const lugarRival = part.lugar || '1';
          const puntosRival = calcularPuntos(comp.tipo, lugarRival);

          if (!acumuladorRivales[nombreRival]) {
            acumuladorRivales[nombreRival] = {
              nombre: nombreRival,
              torneosEnfrentados: 0,
              puntosTotales: 0
            };
          }
          acumuladorRivales[nombreRival].torneosEnfrentados += 1;
          acumuladorRivales[nombreRival].puntosTotales = parseFloat(
            (acumuladorRivales[nombreRival].puntosTotales + puntosRival).toFixed(2)
          );
        }
      });
    });

    return Object.values(acumuladorRivales).sort((a, b) => b.puntosTotales - a.puntosTotales);
  };

  const rankingRivales = calcularRankingRivalesDeLlaves();

  const manejarCambioFotoExpediente = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      setSubiendoFoto(true);
      const lector = new FileReader();
      lector.onload = async (eventoLectura) => {
        const imagenOriginal = new Image();
        imagenOriginal.src = eventoLectura.target.result;
        imagenOriginal.onload = async () => {
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

          try {
            const docRef = doc(db, 'atletas', id);
            await updateDoc(docRef, { foto: imagenComprimidaBase64 });
            setAtleta({ ...atleta, foto: imagenComprimidaBase64 });
            alert("¡Fotografía actualizada con éxito!");
          } catch (error) {
            console.error("Error al actualizar foto:", error);
          } finally {
            setSubiendoFoto(false);
          }
        };
      };
      lector.readAsDataURL(archivo);
    }
  };

  if (!usuario || cargando) {
    return <div className="contenedor-principal">Cargando expediente digital...</div>;
  }

  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 80) return '#2ecc71';
    if (porcentaje >= 60) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a192f', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      
      {/* ENCABEZADO EJECUTIVO */}
      <header style={{ background: '#07111e', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '100px' }} />
          <span style={{ background: '#e63946', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>EXPEDIENTE DIGITAL</span>
        </div>
        <button className="btn-secundario" onClick={() => navigate('/dashboard')} style={{ fontSize: '0.85rem' }}>
          &larr; Volver al Panel
        </button>
      </header>

      {/* DATLIST PARA AUTOCOMPLETADO DE RIVALES */}
      <datalist id="lista-rivales-existentes">
        {listaRivalesBD.map((nombreRival, idx) => (
          <option key={idx} value={nombreRival} />
        ))}
      </datalist>

      {/* CONTENEDOR PRINCIPAL */}
      <main style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        
        {/* CABECERA DEL ATLETA */}
        <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '25px', flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              {atleta.foto ? (
                <img src={atleta.foto} alt="Atleta" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e63946', display: 'block', margin: '0 auto 8px auto' }} />
              ) : (
                <div style={{ width: '90px', height: '90px', background: '#e63946', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', color: '#fff', margin: '0 auto 8px auto' }}>
                  {atleta.nombre1 ? atleta.nombre1.charAt(0) : 'A'}
                </div>
              )}
              <label style={{ fontSize: '0.7rem', background: '#3498db', color: '#fff', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'inline-block' }}>
                {subiendoFoto ? 'Subiendo...' : '📷 Cambiar Foto'}
                <input type="file" accept="image/*" onChange={manejarCambioFotoExpediente} style={{ display: 'none' }} disabled={subiendoFoto} />
              </label>
            </div>
            <div>
              <span style={{ background: '#e63946', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {atleta.disciplina?.grado || 'Sin Grado'}
              </span>
              <h2 style={{ margin: '8px 0 5px 0', fontSize: '1.6rem', color: '#fff' }}>{atleta.nombre1} {atleta.apellido1} {atleta.apellido2}</h2>
              <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                Cédula: {atleta.cedula} | Días de Entreno: <strong style={{color: '#3498db'}}>{atleta.disciplina?.diasEntreno?.join(', ') || 'No asignados'}</strong>
              </p>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: '0 0 3px 0', fontSize: '0.8rem', color: '#aaa' }}>Estado de Cuenta</p>
            <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.95rem' }}>● {atleta.estado || 'Activo'}</span>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#aaa' }}>Cuota: <strong style={{color: '#fff'}}>₡{atleta.financiera?.cuotaMensual || '0'}</strong> ({atleta.financiera?.tipoAlumno || 'Regular'})</p>
          </div>
        </div>

        {/* NAVEGACIÓN ESTILO PESTAÑAS (TABS) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid rgba(255,255,255,0.08)', paddingBottom: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setPestanaExpediente('inicio')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaExpediente === 'inicio' ? '#e63946' : 'rgba(255,255,255,0.05)', color: pestanaExpediente === 'inicio' ? '#fff' : '#aaa' }}
          >
            🏠 Panel de Inicio
          </button>
          <button 
            onClick={() => setPestanaExpediente('asistencia')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaExpediente === 'asistencia' ? '#e63946' : 'rgba(255,255,255,0.05)', color: pestanaExpediente === 'asistencia' ? '#fff' : '#aaa' }}
          >
            📋 Control de Asistencias
          </button>
          <button 
            onClick={() => setPestanaExpediente('competencias')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaExpediente === 'competencias' ? '#e63946' : 'rgba(255,255,255,0.05)', color: pestanaExpediente === 'competencias' ? '#fff' : '#aaa' }}
          >
            🏆 Historial Competencias & Ranking
          </button>
          <button 
            onClick={() => setPestanaExpediente('info')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaExpediente === 'info' ? '#e63946' : 'rgba(255,255,255,0.05)', color: pestanaExpediente === 'info' ? '#fff' : '#aaa' }}
          >
            🥋 Información General
          </button>
        </div>

        {/* PESTAÑA 1: INICIO */}
        {pestanaExpediente === 'inicio' && (
          <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.4rem' }}>¡Bienvenido al Panel de Atleta, {atleta.nombre1}!</h3>
            <p style={{ color: '#aaa', lineHeight: '1.6' }}>
              Este es tu espacio personal dentro de la Escuela de Taekwondo DAEJI. Aquí podrás consultar tus porcentajes de asistencia para derecho a examen, tu acumulación de puntos en el ranking oficial de competencias y tus datos generales de expediente.
            </p>

            <div style={{ marginTop: '25px', background: 'rgba(230, 57, 70, 0.1)', border: '1px solid rgba(230, 57, 70, 0.3)', padding: '20px', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#e63946' }}>📢 Anuncios Importantes de la Academia</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#ddd' }}>
                Próximo torneo evaluatorio rumbo a los Juegos Deportivos Nacionales. Asegúrate de mantener tu porcentaje de asistencia semestral por encima del 80% para habilitar tu inscripción.
              </p>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ASISTENCIA */}
        {pestanaExpediente === 'asistencia' && (
          <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>📊 Rendimiento y Asistencia</h3>
              <button onClick={() => setMostrarDesgloseAsistencia(!mostrarDesgloseAsistencia)} style={{ background: mostrarDesgloseAsistencia ? '#e63946' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                {mostrarDesgloseAsistencia ? '▲ Ocultar Desglose Detallado' : '▼ Ver Desglose y Filtros de Fechas'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#aaa' }}>Semestre Actual (Derecho a Examen)</p>
                <h3 style={{ margin: '5px 0', fontSize: '2.2rem', color: getColorPorcentaje(estadisticasAsistencia.porcentajeSemestral) }}>
                  {estadisticasAsistencia.porcentajeSemestral}%
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: estadisticasAsistencia.porcentajeSemestral >= 80 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                  {estadisticasAsistencia.porcentajeSemestral >= 80 ? '✔ Elegible (≥80%)' : '⚠ Mínimo 80% requerido'}
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#aaa' }}>Anual ({new Date().getFullYear()})</p>
                <h3 style={{ margin: '5px 0', fontSize: '2.2rem', color: getColorPorcentaje(estadisticasAsistencia.porcentajeAnual) }}>
                  {estadisticasAsistencia.porcentajeAnual}%
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Constancia anual</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#aaa' }}>Histórico General</p>
                <h3 style={{ margin: '5px 0', fontSize: '2.2rem', color: getColorPorcentaje(estadisticasAsistencia.porcentajeHistorico) }}>
                  {estadisticasAsistencia.porcentajeHistorico}%
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Desde ingreso</p>
              </div>
            </div>

            {mostrarDesgloseAsistencia && (
              <div style={{ marginTop: '25px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Auditoría de Fechas y Estados</h4>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['todos', 'presente', 'ausente', 'justificado'].map((filtro) => (
                      <button key={filtro} onClick={() => setFiltroEstadoAsistencia(filtro)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: filtroEstadoAsistencia === filtro ? '#e63946' : 'rgba(255,255,255,0.05)', color: filtroEstadoAsistencia === filtro ? '#fff' : '#aaa', textTransform: 'capitalize' }}>
                        {filtro}
                      </button>
                    ))}
                  </div>
                </div>
                {historialFechasAsistencia.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '15px 0', fontSize: '0.9rem' }}>No hay registros de asistencia guardados todavía para este atleta.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {historialFechasAsistencia.filter(item => filtroEstadoAsistencia === 'todos' || item.estado === filtroEstadoAsistencia).map((item, index) => {
                      const colorEstado = item.estado === 'presente' ? '#2ecc71' : item.estado === 'justificado' ? '#f39c12' : '#e74c3c';
                      const textoEstado = item.estado === 'presente' ? 'Presente' : item.estado === 'justificado' ? 'Justificado' : 'Ausente';
                      return (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                          <span style={{ color: '#ccc' }}>📅 {item.fecha}</span>
                          <span style={{ background: colorEstado, color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>{textoEstado}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: COMPETENCIAS Y RANKING */}
        {pestanaExpediente === 'competencias' && (
          <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.3rem' }}>🏆 Historial de Competencias y Ranking</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Control de torneos, llaves de combate y acumulación de puntos oficiales</p>
              </div>
              <button 
                onClick={() => setMostrarModalCompetencia(true)}
                className="btn-principal"
                style={{ background: '#e63946', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
              >
                + Registrar Competencia
              </button>
            </div>

            {/* CONTROLES DE FILTRO GLOBAL */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px', marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#f39c12', fontSize: '1.05rem' }}>⚙️ Filtros de Fechas y Tipo de Evento</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Fecha Inicial</label>
                  <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Fecha Final</label>
                  <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Filtrar por Tipo (Multiselección)</label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['G2', 'G4', 'JDN', 'Internacional', 'Amistoso'].map((t) => (
                      <button key={t} type="button" onClick={() => toggleTipoFiltro(t)} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: tiposSeleccionados.includes(t) ? '#3498db' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 'bold' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PUNTUACIÓN TOTAL PERSONAL DEL ATLETA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)', padding: '12px 20px', borderRadius: '8px', marginTop: '15px' }}>
                <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>Puntuación Personal Acumulada de {atleta.nombre1}:</span>
                <span style={{ fontSize: '1.5rem', color: '#2ecc71', fontWeight: 'bold' }}>{totalPuntosPersonal.toFixed(2)} pts</span>
              </div>
            </div>

            {/* SECCIÓN: TABLA DE RANKING DE RIVALES */}
            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.1rem' }}>🏅 Tabla de Ranking de Rivales (Según tus Llaves)</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: '#aaa' }}>Acumulado de puntos de los contrincantes que has registrado en las llaves de tus competencias filtradas.</p>

              {rankingRivales.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '15px 0' }}>No hay rivales registrados en las llaves de las competencias filtradas.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#3498db' }}>
                        <th style={{ padding: '10px' }}>Pos.</th>
                        <th style={{ padding: '10px' }}>Nombre del Rival / Atleta en Llave</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Torneos Enfrentados</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Puntos Acumulados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingRivales.map((rival, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: index === 0 ? 'rgba(241, 196, 15, 0.08)' : 'transparent' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: index === 0 ? '#f1c40f' : index === 1 ? '#bdc3c7' : index === 2 ? '#e67e22' : '#fff' }}>
                            {index === 0 ? '🥇 1°' : index === 1 ? '🥈 2°' : index === 2 ? '🥉 3°' : `${index + 1}°`}
                          </td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>{rival.nombre}</td>
                          <td style={{ padding: '10px', textAlign: 'center', color: '#aaa' }}>{rival.torneosEnfrentados}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2ecc71', fontSize: '1.05rem' }}>{rival.puntosTotales.toFixed(2)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* LISTADO DE COMPETENCIAS PERSONALES */}
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>📜 Torneos Registrados de {atleta.nombre1}</h4>
            {competenciasFiltradasPersonal.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px 0', fontSize: '0.9rem' }}>No hay torneos registrados que coincidan con los filtros seleccionados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {competenciasFiltradasPersonal.map((comp) => {
                  const colorMedalla = comp.posicion === '1' ? '#f1c40f' : comp.posicion === '2' ? '#bdc3c7' : comp.posicion === '3' ? '#e67e22' : '#7f8c8d';
                  const textoPosicion = comp.posicion === '1' ? '🥇 1° Lugar (Oro)' : comp.posicion === '2' ? '🥈 2° Lugar (Plata)' : comp.posicion === '3' ? '🥉 3° Lugar (Bronce)' : comp.posicion === '4' ? '4° Lugar' : '5° Lugar';

                  return (
                    <div key={comp.idComp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                        <div>
                          <span style={{ background: '#3498db', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '8px' }}>{comp.tipo}</span>
                          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>📅 {comp.fecha} | 📍 {comp.lugar || 'Lugar no especificado'}</span>
                          <h4 style={{ margin: '6px 0 0 0', color: '#fff', fontSize: '1.1rem' }}>{comp.categoriaWTF}</h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: colorMedalla, color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '4px' }}>
                            {textoPosicion}
                          </span>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#2ecc71', fontWeight: 'bold' }}>+{Number(comp.puntos || 0).toFixed(2)} Pts</p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', fontSize: '0.85rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                          <strong style={{ color: '#3498db', display: 'block', marginBottom: '6px' }}>👥 Podio / Participantes en la Llave:</strong>
                          <ul style={{ margin: 0, paddingLeft: '15px', color: '#ccc' }}>
                            {comp.participantesLlave?.map((p, idx) => (
                              <li key={idx} style={{ marginBottom: '3px' }}>
                                {p.nombre || 'Atleta'} — <strong style={{ color: '#f39c12' }}>{p.lugar}° Lugar</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                          <strong style={{ color: '#e63946', display: 'block', marginBottom: '6px' }}>🥊 Llaves y Marcadores (Round x Round):</strong>
                          {comp.enfrentamientos?.map((enf, idx) => (
                            <div key={idx} style={{ marginBottom: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                              <p style={{ margin: '0 0 2px 0', color: '#fff' }}><strong>Vs:</strong> {enf.oponente || 'Rival'}</p>
                              <p style={{ margin: 0, color: '#aaa', fontSize: '0.75rem' }}>
                                R1: [ {enf.r1 || '-'} ] | R2: [ {enf.r2 || '-'} ] | R3: [ {enf.r3 || '-'} ]
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: INFORMACIÓN GENERAL */}
        {pestanaExpediente === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ color: '#e63946', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginTop: 0 }}>Datos Personales y Ubicación</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <p style={{ margin: 0 }}><strong>Fecha de Nacimiento:</strong> {atleta.fechaNacimiento}</p>
                <p style={{ margin: 0 }}><strong>Género:</strong> {atleta.genero}</p>
                <p style={{ margin: 0 }}><strong>Teléfono:</strong> {atleta.telefono || 'No indicado'}</p>
                <p style={{ margin: 0 }}><strong>Residencia:</strong> {atleta.direccion ? `${atleta.direccion.provincia}, ${atleta.direccion.canton}, ${atleta.direccion.distrito}` : 'No registrada'}</p>
              </div>
            </div>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ color: '#e63946', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginTop: 0 }}>Información Médica</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <p style={{ margin: 0 }}><strong>Tipo de Sangre:</strong> <span style={{ color: '#e63946', fontWeight: 'bold' }}>{atleta.medico?.tipoSangre || 'No indicado'}</span></p>
                <p style={{ margin: 0 }}><strong>Padecimientos / Alergias:</strong> {atleta.medico?.padecimientos || 'Ninguno'}</p>
                <p style={{ margin: 0 }}><strong>Lesiones Previas:</strong> {atleta.medico?.lesiones || 'Ninguna registrada'}</p>
              </div>
            </div>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ color: '#e63946', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginTop: 0 }}>Contacto de Emergencia</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <p style={{ margin: 0 }}><strong>Contacto:</strong> {atleta.emergencia?.contacto}</p>
                <p style={{ margin: 0 }}><strong>Parentesco:</strong> {atleta.emergencia?.parentesco}</p>
                <p style={{ margin: 0 }}><strong>Teléfono:</strong> <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{atleta.emergencia?.telefono}</span></p>
              </div>
            </div>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ color: '#e63946', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginTop: 0 }}>Historial Académico</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <p style={{ margin: 0 }}><strong>Fecha de Ingreso DAEJI:</strong> {atleta.disciplina?.fechaIngresoDaeji}</p>
                <p style={{ margin: 0 }}><strong>¿Viene de otra academia?:</strong> {atleta.disciplina?.otraAcademia}</p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL / FORMULARIO PARA REGISTRAR COMPETENCIA */}
        {mostrarModalCompetencia && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ background: '#07111e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '30px' }}>
              
              <h3 style={{ color: '#fff', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Registrar Nueva Competencia</h3>
              
              <form onSubmit={guardarCompetencia} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha del Evento</label>
                    <input type="date" value={nuevaComp.fecha} onChange={(e) => setNuevaComp({...nuevaComp, fecha: e.target.value})} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Tipo de Evento</label>
                    <select value={nuevaComp.tipo} onChange={(e) => setNuevaComp({...nuevaComp, tipo: e.target.value})} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}>
                      <option value="G2">G2 (Escala Normal)</option>
                      <option value="G4">G4 (Doble Puntuación)</option>
                      <option value="JDN">JDN (Juegos Deportivos Nacionales)</option>
                      <option value="Internacional">Internacional (Sin puntos)</option>
                      <option value="Amistoso">Amistoso (Sin puntos)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Lugar del Evento</label>
                    <input type="text" placeholder="Ej: Gimnasio Nacional" value={nuevaComp.lugar} onChange={(e) => setNuevaComp({...nuevaComp, lugar: e.target.value})} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Categoría WTF</label>
                    <select value={nuevaComp.categoriaWTF} onChange={(e) => setNuevaComp({...nuevaComp, categoriaWTF: e.target.value})} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}>
                      {categoriasWTFDisponibles.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Posición Obtenida</label>
                  <select value={nuevaComp.posicion} onChange={(e) => setNuevaComp({...nuevaComp, posicion: e.target.value})} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}>
                    <option value="1">1° Lugar (Oro)</option>
                    <option value="2">2° Lugar (Plata)</option>
                    <option value="3">3° Lugar (Bronce)</option>
                    <option value="4">4° Lugar</option>
                    <option value="5">5° Lugar</option>
                  </select>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#3498db', fontWeight: 'bold' }}>Listado de la Llave y Lugares</label>
                    <button type="button" onClick={agregarParticipanteLlave} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>+ Añadir Rival</button>
                  </div>
                  {nuevaComp.participantesLlave.map((part, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        list="lista-rivales-existentes"
                        placeholder="Nombre del Atleta (Autocompletable)" 
                        value={part.nombre} 
                        onChange={(e) => { const arr = [...nuevaComp.participantesLlave]; arr[idx].nombre = e.target.value; setNuevaComp({...nuevaComp, participantesLlave: arr}); }} 
                        style={{ flex: 1, padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }} 
                      />
                      <select value={part.lugar} onChange={(e) => { const arr = [...nuevaComp.participantesLlave]; arr[idx].lugar = e.target.value; setNuevaComp({...nuevaComp, participantesLlave: arr}); }} style={{ width: '90px', padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <option value="1">1°</option><option value="2">2°</option><option value="3">3°</option><option value="4">4°</option><option value="5">5°</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#e63946', fontWeight: 'bold' }}>Llaves Personales (Round x Round)</label>
                    <button type="button" onClick={agregarEnfrentamiento} style={{ background: '#e63946', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>+ Añadir Combate</button>
                  </div>
                  {nuevaComp.enfrentamientos.map((enf, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        list="lista-rivales-existentes"
                        placeholder="Nombre del Oponente (Autocompletable)" 
                        value={enf.oponente} 
                        onChange={(e) => { const arr = [...nuevaComp.enfrentamientos]; arr[idx].oponente = e.target.value; setNuevaComp({...nuevaComp, enfrentamientos: arr}); }} 
                        style={{ width: '100%', padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '6px' }} 
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        <input type="text" placeholder="R1" value={enf.r1} onChange={(e) => { const arr = [...nuevaComp.enfrentamientos]; arr[idx].r1 = e.target.value; setNuevaComp({...nuevaComp, enfrentamientos: arr}); }} style={{ padding: '5px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <input type="text" placeholder="R2" value={enf.r2} onChange={(e) => { const arr = [...nuevaComp.enfrentamientos]; arr[idx].r2 = e.target.value; setNuevaComp({...nuevaComp, enfrentamientos: arr}); }} style={{ padding: '5px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <input type="text" placeholder="R3" value={enf.r3} onChange={(e) => { const arr = [...nuevaComp.enfrentamientos]; arr[idx].r3 = e.target.value; setNuevaComp({...nuevaComp, enfrentamientos: arr}); }} style={{ padding: '5px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '0.8rem' }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModalCompetencia(false)} style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" className="btn-principal" style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Competencia</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}