import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function Expediente() {
  const { id } = useParams();
  const [usuario, setUsuario] = useState(null);
  const [atleta, setAtleta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Pestaña activa principal: 'inicio', 'asistencia', 'competencias', 'material', 'info'
  const [pestanaExpediente, setPestanaExpediente] = useState('inicio');

  // Estados para Eventos y Convocatorias
  const [listaEventos, setListaEventos] = useState([]);
  const [inscripcionesAlumno, setInscripcionesAlumno] = useState([]);

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

  // Estados para el Aula Virtual Interactiva y Dinámica (Firestore)
  const [gradoSeleccionadoBiblioteca, setGradoSeleccionadoBiblioteca] = useState(null);
  const [subPestanaAula, setSubPestanaAula] = useState('videos'); // 'videos', 'documentos', 'juegos', 'notas', 'examenReal'
  const [notaPersonal, setNotaPersonal] = useState('');
  const [notasGuardadas, setNotasGuardadas] = useState({});
  
  // Datos traídos de la configuración del aula en Firestore para el grado seleccionado
  const [configAulaActual, setConfigAulaActual] = useState({
    videoUrl: '',
    manualUrl: '',
    tarjetasVisuales: [],
    preguntasQuiz: [],
    examenRealConfig: { activo: false, titulo: '', fechaLimite: '', observaciones: '' },
    preguntasExamenReal: []
  });

  // Respuestas del alumno para Quiz y Examen Real
  const [respuestasQuizAlumno, setRespuestasQuizAlumno] = useState({});
  const [respuestasExamenRealAlumno, setRespuestasExamenRealAlumno] = useState({});
  const [resultadoQuiz, setResultadoQuiz] = useState({});
  const [resultadoExamenReal, setResultadoExamenReal] = useState({});

  const navigate = useNavigate();

  // Función inteligente para convertir enlaces de Google Drive en formato de previsualización incrustable (`/preview`)
  const convertirUrlEmbed = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  // Jerarquía Completa idéntica al Master Aula
  const jerarquiaGrados = [
    { id: 'blanco', nombre: 'Cinturón Blanco', gup: 10, etiqueta: 'Blanco (10° Gup)', gradiente: 'linear-gradient(90deg, #ecf0f1 100%)' },
    { id: 'blanco_amarillo', nombre: 'Cinturón Blanco-Amarillo', gup: 9, etiqueta: 'Blanco-Amarillo (9° Gup)', gradiente: 'linear-gradient(90deg, #ecf0f1 50%, #f1c40f 50%)' },
    { id: 'amarillo', nombre: 'Cinturón Amarillo', gup: 8, etiqueta: 'Amarillo (8° Gup)', gradiente: 'linear-gradient(90deg, #f39c12 100%)' },
    { id: 'amarillo_naranja', nombre: 'Cinturón Amarillo-Naranja', gup: 8, etiqueta: 'Amarillo-Naranja (8° Gup)', gradiente: 'linear-gradient(90deg, #f39c12 50%, #e67e22 50%)' },
    { id: 'naranja', nombre: 'Cinturón Naranja', gup: 7, etiqueta: 'Naranja (7° Gup)', gradiente: 'linear-gradient(90deg, #d35400 100%)' },
    { id: 'amarillo_verde', nombre: 'Cinturón Amarillo-Verde', gup: 7, etiqueta: 'Amarillo-Verde (7° Gup)', gradiente: 'linear-gradient(90deg, #f39c12 50%, #27ae60 50%)' },
    { id: 'verde', nombre: 'Cinturón Verde', gup: 6, etiqueta: 'Verde (6° Gup)', gradiente: 'linear-gradient(90deg, #2ecc71 100%)' },
    { id: 'verde_azul', nombre: 'Cinturón Verde-Azul', gup: 5, etiqueta: 'Verde-Azul (5° Gup)', gradiente: 'linear-gradient(90deg, #2ecc71 50%, #3498db 50%)' },
    { id: 'azul', nombre: 'Cinturón Azul', gup: 4, etiqueta: 'Azul (4° Gup)', gradiente: 'linear-gradient(90deg, #3498db 100%)' },
    { id: 'azul_rojo', nombre: 'Cinturón Azul-Rojo', gup: 3, etiqueta: 'Azul-Rojo (3° Gup)', gradiente: 'linear-gradient(90deg, #3498db 50%, #e74c3c 50%)' },
    { id: 'rojo', nombre: 'Cinturón Rojo', gup: 2, etiqueta: 'Rojo (2° Gup)', gradiente: 'linear-gradient(90deg, #e74c3c 100%)' },
    { id: 'rojo_negro', nombre: 'Cinturón Rojo-Negro', gup: 1, etiqueta: 'Rojo-Negro (1° Gup)', gradiente: 'linear-gradient(90deg, #e74c3c 50%, #2c3e50 50%)' },
    { id: 'negro_1', nombre: 'Cinturón Negro 1er Dan', gup: 0, etiqueta: 'Negro 1er Dan', gradiente: 'linear-gradient(90deg, #1a252f 100%)' },
    { id: 'negro_2', nombre: 'Cinturón Negro 2do Dan', gup: -1, etiqueta: 'Negro 2do Dan', gradiente: 'linear-gradient(90deg, #1a252f 100%)' },
    { id: 'negro_3', nombre: 'Cinturón Negro 3er Dan', gup: -2, etiqueta: 'Negro 3er Dan', gradiente: 'linear-gradient(90deg, #1a252f 100%)' },
    { id: 'negro_4', nombre: 'Cinturón Negro 4to Dan', gup: -3, etiqueta: 'Negro 4to Dan', gradiente: 'linear-gradient(90deg, #000 100%)' },
    { id: 'negro_5', nombre: 'Cinturón Negro 5to Dan', gup: -4, etiqueta: 'Negro 5to Dan', gradiente: 'linear-gradient(90deg, #000 100%)' },
    { id: 'negro_6', nombre: 'Cinturón Negro 6to Dan', gup: -5, etiqueta: 'Negro 6to Dan', gradiente: 'linear-gradient(90deg, #000 100%)' },
    { id: 'negro_7', nombre: 'Cinturón Negro 7mo Dan', gup: -6, etiqueta: 'Negro 7mo Dan', gradiente: 'linear-gradient(90deg, #000 100%)' },
    { id: 'negro_8', nombre: 'Cinturón Negro 8vo Dan', gup: -7, etiqueta: 'Negro 8vo Dan', gradiente: 'linear-gradient(90deg, #000 100%)' },
    { id: 'negro_9', nombre: 'Cinturón Negro 9no Dan', gup: -8, etiqueta: 'Negro 9no Dan', gradiente: 'linear-gradient(90deg, #000 100%)' }
  ];

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarDatosAtletaYAsistencia(id);
        await cargarEventosYInscripciones(id);
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [id, navigate]);

  useEffect(() => {
    if (gradoSeleccionadoBiblioteca) {
      cargarConfiguracionAulaFirestore(gradoSeleccionadoBiblioteca);
    }
  }, [gradoSeleccionadoBiblioteca]);

  const cargarConfiguracionAulaFirestore = async (nombreGradoEtiqueta) => {
    try {
      const docRef = doc(db, 'configuracion_aula', nombreGradoEtiqueta);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfigAulaActual({
          videoUrl: data.videoUrl || '',
          manualUrl: data.manualUrl || '',
          tarjetasVisuales: data.tarjetasVisuales || [],
          preguntasQuiz: data.preguntasQuiz || [],
          examenRealConfig: data.examenRealConfig || { activo: false, titulo: '', fechaLimite: '', observaciones: '' },
          preguntasExamenReal: data.preguntasExamenReal || []
        });
      } else {
        setConfigAulaActual({
          videoUrl: '',
          manualUrl: '',
          tarjetasVisuales: [],
          preguntasQuiz: [],
          examenRealConfig: { activo: false, titulo: '', fechaLimite: '', observaciones: '' },
          preguntasExamenReal: []
        });
      }
    } catch (err) {
      console.error("Error al cargar configuración de aula desde Firestore:", err);
    }
  };

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
      if (datosAtleta.notasEstudio) {
        setNotasGuardadas(datosAtleta.notasEstudio);
      }

      const gradoAtletaCrudo = datosAtleta.disciplina?.grado || 'Blanco-Amarillo (9° Gup)';
      const gradoEncontrado = jerarquiaGrados.find(g => 
        g.etiqueta.toLowerCase() === gradoAtletaCrudo.toLowerCase() || 
        g.nombre.toLowerCase() === gradoAtletaCrudo.toLowerCase()
      );
      const gradoFinal = gradoEncontrado ? gradoEncontrado.etiqueta : 'Blanco-Amarillo (9° Gup)';

      setGradoSeleccionadoBiblioteca(gradoFinal);
      setNotaPersonal(datosAtleta.notasEstudio?.[gradoFinal] || '');

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

  const cargarEventosYInscripciones = async (idAtleta) => {
    try {
      const snapEventos = await getDocs(collection(db, 'eventos'));
      const eventosTemp = [];
      snapEventos.forEach(d => eventosTemp.push({ id: d.id, ...d.data() }));
      setListaEventos(eventosTemp);

      const snapInsc = await getDocs(collection(db, 'inscripciones_eventos'));
      const inscTemp = [];
      snapInsc.forEach(d => {
        const dat = d.data();
        if (dat.atletaId === idAtleta) inscTemp.push(dat.eventoId);
      });
      setInscripcionesAlumno(inscTemp);
    } catch (err) {
      console.error("Error cargando eventos:", err);
    }
  };

  const inscribirseAEvento = async (evento) => {
    if (inscripcionesAlumno.includes(evento.id)) {
      alert("ℹ️ Ya te encuentras inscrito en este evento.");
      return;
    }

    if (estadisticasAsistencia.porcentajeSemestral < 80) {
      alert(`⚠️ REQUISITO NO CUMPLIDO:\nTu asistencia semestral es de ${estadisticasAsistencia.porcentajeSemestral}%. Se requiere un mínimo de 80%.`);
      return;
    }

    try {
      await addDoc(collection(db, 'inscripciones_eventos'), {
        eventoId: evento.id,
        eventoTitulo: evento.titulo,
        atletaId: atleta.id,
        atletaNombre: `${atleta.nombre1} ${atleta.apellido1}`,
        gradoAtleta: atleta.disciplina?.grado || 'Cinturón Blanco',
        fechaInscripcion: new Date().toISOString()
      });

      setInscripcionesAlumno([...inscripcionesAlumno, evento.id]);
      alert(`🎉 ¡Inscripción exitosa a "${evento.titulo}"!`);
    } catch (error) {
      console.error("Error al inscribirse:", error);
      alert("❌ Ocurrió un error al procesar la inscripción.");
    }
  };

  const guardarNotaEstudio = async (gradoKey) => {
    try {
      const nuevasNotas = { ...notasGuardadas, [gradoKey]: notaPersonal };
      const docRef = doc(db, 'atletas', id);
      await updateDoc(docRef, { notasEstudio: nuevasNotas });
      setNotasGuardadas(nuevasNotas);
      alert("✅ ¡Anotación guardada en tu expediente con éxito!");
    } catch (err) {
      console.error("Error al guardar nota:", err);
      alert("❌ Error al guardar la anotación.");
    }
  };

  const enviarResultadoQuizAlMaster = async (puntajeObtenido, tipoEvaluacion = 'Quiz Práctico') => {
    try {
      await addDoc(collection(db, 'reportes_aula_virtual'), {
        atletaId: atleta.id,
        atletaNombre: `${atleta.nombre1} ${atleta.apellido1}`,
        grado: gradoActualBiblioteca.etiqueta,
        evaluacion: tipoEvaluacion,
        puntaje: puntajeObtenido,
        fecha: new Date().toISOString()
      });
      alert(`🚀 ¡Informe enviado al Master con éxito! Calificación registrada: ${puntajeObtenido} pts.`);
    } catch (err) {
      console.error("Error al enviar reporte:", err);
      alert("❌ Error al enviar el reporte.");
    }
  };

  const calcularPuntos = (tipo, posicion) => {
    let base = 0;
    if (posicion === '1') base = 20;
    else if (posicion === '2') base = 12;
    else if (posicion === '3') base = 7.2;
    else if (posicion === '4') base = 4.32;
    else if (posicion === '5') base = 3.02;

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
      alert("✅ Competencia registrada con éxito.");
    } catch (error) {
      console.error("Error al guardar competencia:", error);
      alert("❌ Ocurrió un error al guardar.");
    }
  };

  const toggleTipoFiltro = (tipo) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter(t => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

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

  const competenciasFiltradasPersonal = listaCompetencias.filter(comp => {
    const cumpleTipo = tiposSeleccionados.includes(comp.tipo);
    const cumpleFechaInicio = filtroFechaInicio ? comp.fecha >= filtroFechaInicio : true;
    const cumpleFechaFin = filtroFechaFin ? comp.fecha <= filtroFechaFin : true;
    return cumpleTipo && cumpleFechaInicio && cumpleFechaFin;
  });

  const totalPuntosPersonal = parseFloat(
    competenciasFiltradasPersonal.reduce((acc, curr) => acc + (Number(curr.puntos) || 0), 0).toFixed(2)
  );

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
            acumuladorRivales[nombreRival] = { nombre: nombreRival, torneosEnfrentados: 0, puntosTotales: 0 };
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
    return <div style={{ minHeight: '100vh', background: '#0a192f', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando expediente digital...</div>;
  }

  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 80) return '#2ecc71';
    if (porcentaje >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const gradoActualAtleta = atleta.disciplina?.grado || 'Blanco-Amarillo (9° Gup)';
  const indexGradoActual = jerarquiaGrados.findIndex(g => 
    g.etiqueta.toLowerCase() === gradoActualAtleta.toLowerCase() || 
    g.nombre.toLowerCase() === gradoActualAtleta.toLowerCase()
  );
  const gradosDisponiblesAcumulados = indexGradoActual !== -1 
    ? jerarquiaGrados.slice(0, indexGradoActual + 1) 
    : jerarquiaGrados.slice(0, 2);

  const gradosOrdenadosCarrusel = [...gradosDisponiblesAcumulados].reverse();

  const gradoActualBiblioteca = gradosDisponiblesAcumulados.find(g => 
    g.etiqueta.toLowerCase() === gradoSeleccionadoBiblioteca?.toLowerCase() || 
    g.nombre.toLowerCase() === gradoSeleccionadoBiblioteca?.toLowerCase()
  ) || gradosDisponiblesAcumulados[gradosDisponiblesAcumulados.length - 1];

  const examenRealActivo = configAulaActual.examenRealConfig?.activo === true || 
                           configAulaActual.examenRealConfig?.activo === 'true' || 
                           (configAulaActual.examenRealConfig?.titulo && configAulaActual.examenRealConfig.titulo.trim() !== '');

  return (
    <div style={{ minHeight: '100vh', background: '#0a192f', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      
      {/* ENCABEZADO EJECUTIVO */}
      <header style={{ background: '#07111e', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '100px' }} />
          <span style={{ background: '#e63946', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>EXPEDIENTE & AULA VIRTUAL</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#3498db', border: '1px solid #3498db', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
          &larr; Volver al Panel
        </button>
      </header>

      <datalist id="lista-rivales-existentes">
        {listaRivalesBD.map((nombreRival, idx) => (
          <option key={idx} value={nombreRival} />
        ))}
      </datalist>

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
            onClick={() => setPestanaExpediente('material')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaExpediente === 'material' ? '#e63946' : 'rgba(255,255,255,0.05)', color: pestanaExpediente === 'material' ? '#fff' : '#aaa' }}
          >
            🥋 Aula Virtual DAEJI
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
          <div>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '30px', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.4rem' }}>¡Bienvenido al Panel de Atleta, {atleta.nombre1}!</h3>
              <p style={{ color: '#aaa', lineHeight: '1.6' }}>
                Este es tu espacio personal dentro de la Escuela de Taekwondo DAEJI. Aquí podrás consultar tus porcentajes de asistencia, acumulación de puntos y material de estudio.
              </p>
            </div>

            <h3 style={{ color: '#fff', marginBottom: '15px' }}>🏆 Convocatorias y Exámenes Disponibles</h3>
            {listaEventos.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>No hay eventos o exámenes publicados en este momento.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {listaEventos.map((ev) => {
                  const yaInscrito = inscripcionesAlumno.includes(ev.id);
                  return (
                    <div key={ev.id} style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ background: '#3498db', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{ev.tipo}</span>
                        <h4 style={{ margin: '10px 0 8px 0', color: '#fff', fontSize: '1.15rem' }}>{ev.titulo}</h4>
                        <p style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.4' }}>{ev.descripcion}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: '#f39c12', marginBottom: '20px' }}>
                          <span>📅 Fecha del Evento: {ev.fechaReal}</span>
                          <span>💰 Costo: ₡{ev.costo}</span>
                          <span>⏳ Límite de Pago: {ev.fechaLimitePago}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => inscribirseAEvento(ev)}
                        style={{
                          background: yaInscrito ? '#27ae60' : '#e63946',
                          color: '#fff',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: yaInscrito ? 'default' : 'pointer',
                          width: '100%'
                        }}
                        disabled={yaInscrito}
                      >
                        {yaInscrito ? '✅ Inscrito Correctamente' : '📝 Inscribirme / Aceptar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <p style={{ textAlign: 'center', color: '#888', padding: '15px 0', fontSize: '0.9rem' }}>No hay registros de asistencia guardados todavía.</p>
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
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Control de torneos, llaves de combate y acumulación de puntos</p>
              </div>
              <button 
                onClick={() => setMostrarModalCompetencia(true)}
                style={{ background: '#e63946', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
              >
                + Registrar Competencia
              </button>
            </div>

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
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Filtrar por Tipo</label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['G2', 'G4', 'JDN', 'Internacional', 'Amistoso'].map((t) => (
                      <button key={t} type="button" onClick={() => toggleTipoFiltro(t)} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: tiposSeleccionados.includes(t) ? '#3498db' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 'bold' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)', padding: '12px 20px', borderRadius: '8px', marginTop: '15px' }}>
                <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>Puntuación Personal Acumulada de {atleta.nombre1}:</span>
                <span style={{ fontSize: '1.5rem', color: '#2ecc71', fontWeight: 'bold' }}>{totalPuntosPersonal.toFixed(2)} pts</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.1rem' }}>🏅 Tabla de Ranking de Rivales (Según tus Llaves)</h4>
              {rankingRivales.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '15px 0' }}>No hay rivales registrados en las llaves de las competencias filtradas.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#3498db' }}>
                        <th style={{ padding: '10px' }}>Pos.</th>
                        <th style={{ padding: '10px' }}>Nombre del Rival</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Torneos</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingRivales.map((rival, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: index === 0 ? '#f1c40f' : '#fff' }}>{index + 1}°</td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>{rival.nombre}</td>
                          <td style={{ padding: '10px', textAlign: 'center', color: '#aaa' }}>{rival.torneosEnfrentados}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2ecc71' }}>{rival.puntosTotales.toFixed(2)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 4: AULA VIRTUAL DAEJI */}
        {pestanaExpediente === 'material' && (
          <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px' }}>
            <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.3rem' }}>🥋 Aula Virtual & Biblioteca Académica</h3>
            <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>
              Selecciona tu cinturón en el carrusel para acceder a los recursos y exámenes configurados por el Master.
            </p>

            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {gradosOrdenadosCarrusel.map((g) => {
                const activo = gradoActualBiblioteca?.etiqueta.toLowerCase() === g.etiqueta.toLowerCase();
                const esGradoRealAtleta = atleta.disciplina?.grado?.toLowerCase() === g.etiqueta.toLowerCase() || 
                                          atleta.disciplina?.grado?.toLowerCase() === g.nombre.toLowerCase();

                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGradoSeleccionadoBiblioteca(g.etiqueta);
                      setNotaPersonal(notasGuardadas[g.etiqueta] || '');
                    }}
                    style={{
                      minWidth: '170px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: activo ? '2px solid #e63946' : '1px solid rgba(255,255,255,0.1)',
                      background: activo ? 'rgba(230, 57, 70, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: activo ? '0 4px 20px rgba(230, 57, 70, 0.3)' : 'none',
                      transform: activo ? 'scale(1.03)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ height: '8px', width: '100%', borderRadius: '4px', background: g.gradiente, marginBottom: '10px', border: '1px solid rgba(255,255,255,0.2)' }}></div>
                    <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>
                      {g.etiqueta}
                    </span>
                    {esGradoRealAtleta && (
                      <span style={{ fontSize: '0.65rem', background: '#2ecc71', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block' }}>
                        Tu Grado Actual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {gradoActualBiblioteca && (
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <h4 style={{ margin: 0, color: '#f39c12', fontSize: '1.2rem' }}>
                    Nivel Activo: {gradoActualBiblioteca.etiqueta}
                  </h4>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setSubPestanaAula('videos')}
                      style={{ background: subPestanaAula === 'videos' ? '#3498db' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      🎥 Videos y Galería
                    </button>
                    <button 
                      onClick={() => setSubPestanaAula('documentos')}
                      style={{ background: subPestanaAula === 'documentos' ? '#3498db' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      📚 Biblioteca (PDF)
                    </button>
                    <button 
                      onClick={() => setSubPestanaAula('juegos')}
                      style={{ background: subPestanaAula === 'juegos' ? '#27ae60' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ⚡ Quiz de Práctica
                    </button>

                    {examenRealActivo && (
                      <button 
                        onClick={() => setSubPestanaAula('examenReal')}
                        style={{ 
                          background: subPestanaAula === 'examenReal' ? '#e63946' : '#c0392b', 
                          color: '#fff', 
                          border: '2px solid #ff4d4d', 
                          padding: '8px 16px', 
                          borderRadius: '6px', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          boxShadow: '0 0 12px rgba(230, 57, 70, 0.6)'
                        }}
                      >
                        🔥 🥋 Examen Real Teórico Activo
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setSubPestanaAula('notas');
                        setNotaPersonal(notasGuardadas[gradoActualBiblioteca.etiqueta] || '');
                      }}
                      style={{ background: subPestanaAula === 'notas' ? '#3498db' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      📝 Mis Notas
                    </button>
                  </div>
                </div>

                {/* 1. VIDEOS Y GALERÍA (REPRODUCTOR CON IFRAME DE GOOGLE DRIVE) */}
                {subPestanaAula === 'videos' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ background: '#111', height: '220px', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {configAulaActual.videoUrl ? (
                            <iframe 
                              src={convertirUrlEmbed(configAulaActual.videoUrl)} 
                              title="Video forma oficial" 
                              style={{ width: '100%', height: '100%', border: 'none' }} 
                              allow="autoplay"
                            />
                          ) : (
                            <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>
                              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '5px' }}>▶️</span>
                              <span style={{ fontSize: '0.8rem' }}>Video no configurado por el Master aún</span>
                            </div>
                          )}
                        </div>
                        <h5 style={{ margin: '0 0 5px 0', color: '#fff' }}>Forma Oficial ({gradoActualBiblioteca.etiqueta})</h5>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ background: '#111', height: '220px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', border: '1px dashed #444' }}>
                          <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📄</span>
                          {configAulaActual.manualUrl ? (
                            <a href={configAulaActual.manualUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'none' }}>
                              Abrir Manual Teórico (PDF) ↗
                            </a>
                          ) : (
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>Manual no disponible</span>
                          )}
                        </div>
                        <h5 style={{ margin: '0 0 5px 0', color: '#fff' }}>Manual Teórico Imprimible en PDF</h5>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                      <h5 style={{ margin: '0 0 5px 0', color: '#3498db', fontSize: '1.05rem' }}>🖼️ Galería Técnica Visual y Cápsulas</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '15px' }}>
                        {(configAulaActual.tarjetasVisuales || []).map((tarjeta) => (
                          <div key={tarjeta.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '15px', textAlign: 'center' }}>
                            <div style={{ background: '#0a192f', height: '180px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', overflow: 'hidden' }}>
                              {tarjeta.url ? (
                                tarjeta.tipo?.includes('Video') ? (
                                  <iframe 
                                    src={convertirUrlEmbed(tarjeta.url)} 
                                    title={tarjeta.titulo} 
                                    style={{ width: '100%', height: '100%', border: 'none' }} 
                                    allow="autoplay"
                                  />
                                ) : (
                                  <img src={tarjeta.url} alt={tarjeta.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )
                              ) : (
                                <span style={{ fontSize: '1.5rem', color: '#555' }}>Sin contenido</span>
                              )}
                            </div>
                            <h6 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '0.95rem' }}>{tarjeta.titulo || 'Sin título'}</h6>
                            <span style={{ background: 'rgba(52, 152, 219, 0.2)', color: '#3498db', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {tarjeta.tipo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BIBLIOTECA */}
                {subPestanaAula === 'documentos' && (
                  <div>
                    <h5 style={{ color: '#fff', marginBottom: '15px' }}>📚 Repositorio de Documentos Académicos</h5>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '10px', textAlign: 'center', maxWidth: '300px' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📄</span>
                      <h6 style={{ margin: '0 0 5px 0', color: '#fff' }}>Manual Teórico Oficial (PDF)</h6>
                      {configAulaActual.manualUrl ? (
                        <a href={configAulaActual.manualUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', fontSize: '0.85rem', fontWeight: 'bold', textDecoration: 'none' }}>Abrir Documento ↗</a>
                      ) : (
                        <span style={{ color: '#888', fontSize: '0.8rem' }}>No disponible</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. QUIZ DE PRÁCTICA */}
                {subPestanaAula === 'juegos' && (
                  <div>
                    <h5 style={{ color: '#2ecc71', marginBottom: '10px', fontSize: '1.1rem' }}>⚡ Quiz de Práctica Interactiva</h5>
                    {(!configAulaActual.preguntasQuiz || configAulaActual.preguntasQuiz.length === 0 || !configAulaActual.preguntasQuiz[0].enunciado) ? (
                      <p style={{ color: '#888', fontStyle: 'italic', padding: '20px 0' }}>El profesor no ha configurado preguntas de quiz para este grado todavía.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {configAulaActual.preguntasQuiz.map((preg, pIdx) => (
                          <div key={pIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                              {pIdx + 1}. {preg.enunciado} <span style={{ color: '#f39c12', fontSize: '0.8rem' }}>({Number(preg.puntos) || 0} pts)</span>
                            </p>
                            {preg.tipo !== 'desarrollo' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                {preg.opciones?.filter(op => op.trim() !== '').map((opcion, opIdx) => (
                                  <label key={opIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#ddd' }}>
                                    <input 
                                      type="radio" 
                                      name={`quiz_${pIdx}`} 
                                      checked={respuestasQuizAlumno[pIdx] === opcion}
                                      onChange={() => setRespuestasQuizAlumno({ ...respuestasQuizAlumno, [pIdx]: opcion })} 
                                    />
                                    {opcion}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <textarea 
                                rows="3"
                                placeholder="Escribe tu respuesta de desarrollo..."
                                value={respuestasQuizAlumno[pIdx] || ''}
                                onChange={(e) => setRespuestasQuizAlumno({ ...respuestasQuizAlumno, [pIdx]: e.target.value })}
                                style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '8px', fontSize: '0.85rem' }}
                              />
                            )}
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            let puntajeCalculado = 0;
                            configAulaActual.preguntasQuiz.forEach((preg, pIdx) => {
                              const respAlumno = respuestasQuizAlumno[pIdx];
                              if (preg.tipo === 'opcion_multiple') {
                                if (respAlumno && respAlumno.trim().toLowerCase() === preg.correcta?.trim().toLowerCase()) {
                                  puntajeCalculado += Number(preg.puntos) || 0;
                                }
                              } else {
                                if (respAlumno && respAlumno.trim() !== '') {
                                  puntajeCalculado += Number(preg.puntos) || 0;
                                }
                              }
                            });
                            setResultadoQuiz({ ...resultadoQuiz, [gradoActualBiblioteca.etiqueta]: puntajeCalculado });
                            enviarResultadoQuizAlMaster(puntajeCalculado, 'Quiz Práctico');
                          }}
                          style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ✔ Calificar y Enviar Quiz al Profesor
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EXAMEN REAL TEÓRICO */}
                {subPestanaAula === 'examenReal' && (
                  <div>
                    <h5 style={{ color: '#e63946', marginBottom: '5px', fontSize: '1.1rem' }}>🥋 {configAulaActual.examenRealConfig?.titulo || 'Examen Oficial Teórico'}</h5>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '15px' }}>
                      {configAulaActual.examenRealConfig?.observaciones || 'Examen oficial de ascenso de grado.'} Fecha límite: <strong>{configAulaActual.examenRealConfig?.fechaLimite || 'No especificada'}</strong>
                    </p>

                    {(!configAulaActual.preguntasExamenReal || configAulaActual.preguntasExamenReal.length === 0 || !configAulaActual.preguntasExamenReal[0].enunciado) ? (
                      <p style={{ color: '#888', fontStyle: 'italic', padding: '20px 0' }}>El profesor no ha añadido preguntas al examen real todavía.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {configAulaActual.preguntasExamenReal.map((preg, pIdx) => (
                          <div key={pIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                              {pIdx + 1}. {preg.enunciado} <span style={{ color: '#e63946', fontSize: '0.8rem' }}>({Number(preg.puntos) || 0} pts)</span>
                            </p>
                            {preg.tipo !== 'desarrollo' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                {preg.opciones?.filter(op => op.trim() !== '').map((opcion, opIdx) => (
                                  <label key={opIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#ddd' }}>
                                    <input 
                                      type="radio" 
                                      name={`examenReal_${pIdx}`} 
                                      checked={respuestasExamenRealAlumno[pIdx] === opcion}
                                      onChange={() => setRespuestasExamenRealAlumno({ ...respuestasExamenRealAlumno, [pIdx]: opcion })} 
                                    />
                                    {opcion}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <textarea 
                                rows="3"
                                placeholder="Escribe tu respuesta de desarrollo..."
                                value={respuestasExamenRealAlumno[pIdx] || ''}
                                onChange={(e) => setRespuestasExamenRealAlumno({ ...respuestasExamenRealAlumno, [pIdx]: e.target.value })}
                                style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '8px', fontSize: '0.85rem' }}
                              />
                            )}
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            let puntajeCalculado = 0;
                            configAulaActual.preguntasExamenReal.forEach((preg, pIdx) => {
                              const respAlumno = respuestasExamenRealAlumno[pIdx];
                              if (preg.tipo === 'opcion_multiple') {
                                if (respAlumno && respAlumno.trim().toLowerCase() === preg.correcta?.trim().toLowerCase()) {
                                  puntajeCalculado += Number(preg.puntos) || 0;
                                }
                              } else {
                                if (respAlumno && respAlumno.trim() !== '') {
                                  puntajeCalculado += Number(preg.puntos) || 0;
                                }
                              }
                            });
                            setResultadoExamenReal({ ...resultadoExamenReal, [gradoActualBiblioteca.etiqueta]: puntajeCalculado });
                            enviarResultadoQuizAlMaster(puntajeCalculado, 'Examen Real Teórico');
                          }}
                          style={{ background: '#e63946', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ✔ Enviar Examen Teórico Oficial al Profesor
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. NOTAS PERSONALES */}
                {subPestanaAula === 'notas' && (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '10px' }}>
                      Escribe tus apuntes personales para tu examen de <strong style={{color: '#f39c12'}}>{gradoActualBiblioteca.etiqueta}</strong>:
                    </p>
                    <textarea 
                      rows="5"
                      value={notaPersonal}
                      onChange={(e) => setNotaPersonal(e.target.value)}
                      placeholder="Ej: Mantener la pierna de apoyo más flexionada..."
                      style={{ width: '100%', padding: '12px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '10px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => guardarNotaEstudio(gradoActualBiblioteca.etiqueta)} style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        💾 Guardar Mis Notas
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 5: INFORMACIÓN GENERAL */}
        {pestanaExpediente === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ color: '#e63946', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginTop: 0 }}>Datos Personales y Ubicación</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <p style={{ margin: 0 }}><strong>Fecha de Nacimiento:</strong> {atleta.fechaNacimiento}</p>
                <p style={{ margin: 0 }}><strong>Género:</strong> {atleta.genero}</p>
                <p style={{ margin: 0 }}><strong>Teléfono:</strong> {atleta.telefono || 'No indicado'}</p>
              </div>
            </div>
            <div style={{ background: 'rgba(7, 17, 30, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ color: '#e63946', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginTop: 0 }}>Información Médica</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <p style={{ margin: 0 }}><strong>Tipo de Sangre:</strong> <span style={{ color: '#e63946', fontWeight: 'bold' }}>{atleta.medico?.tipoSangre || 'No indicado'}</span></p>
                <p style={{ margin: 0 }}><strong>Padecimientos / Alergias:</strong> {atleta.medico?.padecimientos || 'Ninguno'}</p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL REGISTRO DE COMPETENCIA */}
        {mostrarModalCompetencia && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
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
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Lugar del Evento</label>
                  <input type="text" placeholder="Ej: Gimnasio Nacional" value={nuevaComp.lugar} onChange={(e) => setNuevaComp({...nuevaComp, lugar: e.target.value})} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModalCompetencia(false)} style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Competencia</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}