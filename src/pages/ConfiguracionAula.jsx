import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function ConfiguracionAula() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const jerarquiaGrados = [
    { id: 'blanco', nombre: 'Cinturón Blanco', etiqueta: 'Blanco (10° Gup)' },
    { id: 'blanco_amarillo', nombre: 'Cinturón Blanco-Amarillo', etiqueta: 'Blanco-Amarillo (9° Gup)' },
    { id: 'amarillo', nombre: 'Cinturón Amarillo', etiqueta: 'Amarillo (8° Gup)' },
    { id: 'amarillo_naranja', nombre: 'Cinturón Amarillo-Naranja', etiqueta: 'Amarillo-Naranja (8° Gup)' },
    { id: 'naranja', nombre: 'Cinturón Naranja', etiqueta: 'Naranja (7° Gup)' },
    { id: 'amarillo_verde', nombre: 'Cinturón Amarillo-Verde', etiqueta: 'Amarillo-Verde (7° Gup)' },
    { id: 'verde', nombre: 'Cinturón Verde', etiqueta: 'Verde (6° Gup)' },
    { id: 'verde_azul', nombre: 'Cinturón Verde-Azul', etiqueta: 'Verde-Azul (5° Gup)' },
    { id: 'azul', nombre: 'Cinturón Azul', etiqueta: 'Azul (4° Gup)' },
    { id: 'azul_rojo', nombre: 'Cinturón Azul-Rojo', etiqueta: 'Azul-Rojo (3° Gup)' },
    { id: 'rojo', nombre: 'Cinturón Rojo', etiqueta: 'Rojo (2° Gup)' },
    { id: 'rojo_negro', nombre: 'Cinturón Rojo-Negro', etiqueta: 'Rojo-Negro (1° Gup)' },
    { id: 'negro_1', nombre: 'Cinturón Negro 1er Dan', etiqueta: 'Negro 1er Dan' },
    { id: 'negro_2', nombre: 'Cinturón Negro 2do Dan', etiqueta: 'Negro 2do Dan' },
    { id: 'negro_3', nombre: 'Cinturón Negro 3er Dan', etiqueta: 'Negro 3er Dan' },
    { id: 'negro_4', nombre: 'Cinturón Negro 4to Dan', etiqueta: 'Negro 4to Dan' },
    { id: 'negro_5', nombre: 'Cinturón Negro 5to Dan', etiqueta: 'Negro 5to Dan' },
    { id: 'negro_6', nombre: 'Cinturón Negro 6to Dan', etiqueta: 'Negro 6to Dan' },
    { id: 'negro_7', nombre: 'Cinturón Negro 7mo Dan', etiqueta: 'Negro 7mo Dan' },
    { id: 'negro_8', nombre: 'Cinturón Negro 8vo Dan', etiqueta: 'Negro 8vo Dan' },
    { id: 'negro_9', nombre: 'Cinturón Negro 9no Dan', etiqueta: 'Negro 9no Dan' }
  ];

  // Se inicializa dinámicamente con el primer grado real de la lista (Blanco 10° Gup)
  const [gradoSeleccionado, setGradoSeleccionado] = useState(jerarquiaGrados[0].etiqueta);
  
  // Pestaña activa: 'recursos', 'quiz', 'examenReal'
  const [pestanaConfig, setPestanaConfig] = useState('recursos');

  // Estados para URLs de recursos
  const [videoUrl, setVideoUrl] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [tarjetasVisuales, setTarjetasVisuales] = useState([
    { id: 1, titulo: '', tipo: 'Video', url: '' },
    { id: 2, titulo: '', tipo: 'GIF / Secuencia', url: '' },
    { id: 3, titulo: '', tipo: 'Video Corto', url: '' },
    { id: 4, titulo: '', tipo: 'Imagen / Foto', url: '' },
    { id: 5, titulo: '', tipo: 'GIF / Secuencia', url: '' },
    { id: 6, titulo: '', tipo: 'Video Corto', url: '' }
  ]);

  // Estados para el Quiz Práctico (Suma 100%)
  const [preguntasQuiz, setPreguntasQuiz] = useState([
    {
      id: 1,
      tipo: 'opcion_multiple',
      enunciado: '',
      imagenUrl: '',
      opciones: ['', '', '', ''],
      correcta: '',
      puntos: 100
    }
  ]);

  // Estado para el Examen Real Escrito (Configuración + Preguntas que suman 100%)
  const [examenRealConfig, setExamenRealConfig] = useState({
    activo: false,
    titulo: 'Examen Teórico Oficial de Ascenso de Grado',
    fechaLimite: '',
    observaciones: ''
  });

  const [preguntasExamenReal, setPreguntasExamenReal] = useState([
    {
      id: 1,
      tipo: 'opcion_multiple',
      enunciado: '',
      imagenUrl: '',
      opciones: ['', '', '', ''],
      correcta: '',
      puntos: 100
    }
  ]);

  // Reportes de alumnos
  const [reportesAlumnos, setReportesAlumnos] = useState([]);
  const [filtroReporteGrado, setFiltroReporteGrado] = useState('todos');

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

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarConfiguracionGrado(jerarquiaGrados[0].etiqueta);
        await cargarReportesAulaVirtual();
      } else {
        navigate('/login');
      }
      setCargando(false);
    });
    return () => observador();
  }, [navigate]);

  const cargarConfiguracionGrado = async (grado) => {
    try {
      const docRef = doc(db, 'configuracion_aula', grado);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVideoUrl(data.videoUrl || '');
        setManualUrl(data.manualUrl || '');
        setTarjetasVisuales(data.tarjetasVisuales || [
          { id: 1, titulo: '', tipo: 'Video', url: '' },
          { id: 2, titulo: '', tipo: 'GIF / Secuencia', url: '' },
          { id: 3, titulo: '', tipo: 'Video Corto', url: '' },
          { id: 4, titulo: '', tipo: 'Imagen / Foto', url: '' },
          { id: 5, titulo: '', tipo: 'GIF / Secuencia', url: '' },
          { id: 6, titulo: '', tipo: 'Video Corto', url: '' }
        ]);
        setPreguntasQuiz(data.preguntasQuiz?.length > 0 ? data.preguntasQuiz : [{ id: Date.now(), tipo: 'opcion_multiple', enunciado: '', imagenUrl: '', opciones: ['', '', '', ''], correcta: '', puntos: 100 }]);
        setExamenRealConfig(data.examenRealConfig || { activo: false, titulo: 'Examen Teórico Oficial de Ascenso de Grado', fechaLimite: '', observaciones: '' });
        setPreguntasExamenReal(data.preguntasExamenReal?.length > 0 ? data.preguntasExamenReal : [{ id: Date.now(), tipo: 'opcion_multiple', enunciado: '', imagenUrl: '', opciones: ['', '', '', ''], correcta: '', puntos: 100 }]);
      } else {
        setVideoUrl('');
        setManualUrl('');
        setTarjetasVisuales([
          { id: 1, titulo: '', tipo: 'Video', url: '' },
          { id: 2, titulo: '', tipo: 'GIF / Secuencia', url: '' },
          { id: 3, titulo: '', tipo: 'Video Corto', url: '' },
          { id: 4, titulo: '', tipo: 'Imagen / Foto', url: '' },
          { id: 5, titulo: '', tipo: 'GIF / Secuencia', url: '' },
          { id: 6, titulo: '', tipo: 'Video Corto', url: '' }
        ]);
        setPreguntasQuiz([{ id: Date.now(), tipo: 'opcion_multiple', enunciado: '', imagenUrl: '', opciones: ['', '', '', ''], correcta: '', puntos: 100 }]);
        setExamenRealConfig({ activo: false, titulo: 'Examen Teórico Oficial de Ascenso de Grado', fechaLimite: '', observaciones: '' });
        setPreguntasExamenReal([{ id: Date.now(), tipo: 'opcion_multiple', enunciado: '', imagenUrl: '', opciones: ['', '', '', ''], correcta: '', puntos: 100 }]);
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    }
  };

  const cargarReportesAulaVirtual = async () => {
    try {
      const querySnap = await getDocs(collection(db, 'reportes_aula_virtual'));
      const reportesTemp = [];
      querySnap.forEach(d => reportesTemp.push({ id: d.id, ...d.data() }));
      reportesTemp.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setReportesAlumnos(reportesTemp);
    } catch (err) {
      console.error("Error al cargar reportes:", err);
    }
  };

  // Validaciones de Puntos Totales (Deben sumar exactamente 100%)
  const sumaTotalPuntosQuiz = preguntasQuiz.reduce((acc, curr) => acc + (Number(curr.puntos) || 0), 0);
  const sumaTotalPuntosExamenReal = preguntasExamenReal.reduce((acc, curr) => acc + (Number(curr.puntos) || 0), 0);

  const guardarConfiguracionEnFirestore = async (e) => {
    e.preventDefault();

    if (sumaTotalPuntosQuiz !== 100) {
      alert(`⚠️ ATENCIÓN: La suma de puntos del Quiz Práctico es de ${sumaTotalPuntosQuiz}%. Debe sumar exactamente 100%.`);
      return;
    }

    if (examenRealConfig.activo && sumaTotalPuntosExamenReal !== 100) {
      alert(`⚠️ ATENCIÓN: La suma de puntos del Examen Real Escrito es de ${sumaTotalPuntosExamenReal}%. Debe sumar exactamente 100% para poder habilitarlo.`);
      return;
    }

    try {
      const docRef = doc(db, 'configuracion_aula', gradoSeleccionado);
      await setDoc(docRef, {
        grado: gradoSeleccionado,
        videoUrl,
        manualUrl,
        tarjetasVisuales,
        preguntasQuiz,
        examenRealConfig,
        preguntasExamenReal,
        ultimaActualizacion: new Date().toISOString()
      }, { merge: true });

      alert(`✅ ¡Configuración y exámenes escritos para "${gradoSeleccionado}" guardados con éxito!`);
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("❌ Ocurrió un error al guardar los cambios.");
    }
  };

  if (cargando) {
    return <div style={{ background: '#0a192f', color: '#fff', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando panel de configuración...</div>;
  }

  const reportesFiltrados = filtroReporteGrado === 'todos' 
    ? reportesAlumnos 
    : reportesAlumnos.filter(r => r.grado === filtroReporteGrado);

  return (
    <div style={{ minHeight: '100vh', background: '#0a192f', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      
      {/* ENCABEZADO MASTER */}
      <header style={{ background: '#07111e', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '100px' }} />
          <span style={{ background: '#f39c12', color: '#000', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>DASHBOARD MASTER: CONFIGURACIÓN Y EXÁMENES</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#3498db', border: '1px solid #3498db', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          &larr; Volver al Panel General
        </button>
      </header>

      <main style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        
        {/* SELECTOR GLOBAL DE GRADO */}
        <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#3498db', fontWeight: 'bold', marginBottom: '8px' }}>Seleccionar Cinturón / Grado a Administrar:</label>
          <select 
            value={gradoSeleccionado} 
            onChange={async (e) => {
              const nuevoGrado = e.target.value;
              setGradoSeleccionado(nuevoGrado);
              await cargarConfiguracionGrado(nuevoGrado);
            }}
            style={{ width: '100%', padding: '12px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}
          >
            {jerarquiaGrados.map((g) => (
              <option key={g.id} value={g.etiqueta}>{g.etiqueta}</option>
            ))}
          </select>
        </div>

        {/* SUBPESTAÑAS DE CONFIGURACIÓN */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => setPestanaConfig('recursos')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaConfig === 'recursos' ? '#e63946' : 'rgba(255,255,255,0.05)', color: '#fff' }}
          >
            📁 1. Enlaces y Recursos (Google Drive)
          </button>
          <button 
            type="button"
            onClick={() => setPestanaConfig('quiz')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaConfig === 'quiz' ? '#e63946' : 'rgba(255,255,255,0.05)', color: '#fff' }}
          >
            ⚡ 2. Quiz Práctico ({sumaTotalPuntosQuiz}%)
          </button>
          <button 
            type="button"
            onClick={() => setPestanaConfig('examenReal')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: pestanaConfig === 'examenReal' ? '#e63946' : 'rgba(255,255,255,0.05)', color: '#fff' }}
          >
            🥋 3. Examen Real Escrito ({sumaTotalPuntosExamenReal}%)
          </button>
        </div>

        <form onSubmit={guardarConfiguracionEnFirestore}>
          
          {/* SECCIÓN 1: RECURSOS Y ENLACES */}
          {pestanaConfig === 'recursos' && (
            <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#f39c12', fontSize: '1.2rem' }}>📁 Enlaces y Recursos Didácticos</h3>
              <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '20px' }}>Pega los enlaces directos (URLs) de tus videos o manuales almacenados en la nube.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>🎥 URL del Video de la Forma Oficial</label>
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/file/d/..." 
                    value={videoUrl} 
                    onChange={(e) => setVideoUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '10px' }} 
                  />
                  {videoUrl && (
                    <div style={{ width: '100%', height: '200px', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <iframe 
                        src={convertirUrlEmbed(videoUrl)} 
                        title="Vista previa video oficial" 
                        style={{ width: '100%', height: '100%', border: 'none' }} 
                        allow="autoplay"
                      />
                    </div>
                  )}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>📄 URL del Manual Teórico (PDF)</label>
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/file/d/..." 
                    value={manualUrl} 
                    onChange={(e) => setManualUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }} 
                  />
                </div>
              </div>

              {/* LAS 6 TARJETAS VISUALES */}
              <h4 style={{ color: '#3498db', fontSize: '1.05rem', marginBottom: '15px' }}>🖼️ Tarjetas Visuales y Cápsulas Técnicas (6 Tarjetas)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                {tarjetasVisuales.map((tarjeta, idx) => (
                  <div key={tarjeta.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#f39c12', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Tarjeta #{tarjeta.id}</span>
                    <input 
                      type="text" 
                      placeholder="Título (Ej: Bloqueo Alto)" 
                      value={tarjeta.titulo}
                      onChange={(e) => {
                        const nuevas = [...tarjetasVisuales];
                        nuevas[idx].titulo = e.target.value;
                        setTarjetasVisuales(nuevas);
                      }}
                      style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        value={tarjeta.tipo}
                        onChange={(e) => {
                          const nuevas = [...tarjetasVisuales];
                          nuevas[idx].tipo = e.target.value;
                          setTarjetasVisuales(nuevas);
                        }}
                        style={{ width: '120px', padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem' }}
                      >
                        <option value="Video">Video</option>
                        <option value="Video Corto">Video Corto</option>
                        <option value="GIF / Secuencia">GIF</option>
                        <option value="Imagen / Foto">Imagen</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="URL directa de la imagen o video" 
                        value={tarjeta.url}
                        onChange={(e) => {
                          const nuevas = [...tarjetasVisuales];
                          nuevas[idx].url = e.target.value;
                          setTarjetasVisuales(nuevas);
                        }}
                        style={{ flex: 1, padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: QUIZ PRÁCTICO */}
          {pestanaConfig === 'quiz' && (
            <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#2ecc71', fontSize: '1.2rem' }}>⚡ Configuración del Quiz Práctico</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: sumaTotalPuntosQuiz === 100 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                    Suma total de puntos: {sumaTotalPuntosQuiz}% {sumaTotalPuntosQuiz !== 100 && '(Debe ser exactamente 100%)'}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setPreguntasQuiz([...preguntasQuiz, { id: Date.now(), tipo: 'opcion_multiple', enunciado: '', imagenUrl: '', opciones: ['', '', '', ''], correcta: '', puntos: 0 }])}
                  style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  + Agregar Pregunta
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {preguntasQuiz.map((preg, pIdx) => (
                  <div key={preg.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#f39c12', fontWeight: 'bold' }}>Pregunta #{pIdx + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => setPreguntasQuiz(preguntasQuiz.filter((item) => item.id !== preg.id))}
                        style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>Enunciado:</label>
                        <input 
                          type="text" 
                          placeholder="Escribe la pregunta..."
                          value={preg.enunciado}
                          onChange={(e) => {
                            const arr = [...preguntasQuiz];
                            arr[pIdx].enunciado = e.target.value;
                            setPreguntasQuiz(arr);
                          }}
                          style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>Tipo:</label>
                        <select 
                          value={preg.tipo}
                          onChange={(e) => {
                            const arr = [...preguntasQuiz];
                            arr[pIdx].tipo = e.target.value;
                            setPreguntasQuiz(arr);
                          }}
                          style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          <option value="opcion_multiple">Opción Múltiple</option>
                          <option value="desarrollo">Desarrollo / Abierta</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>Puntos (%):</label>
                        <input 
                          type="number" 
                          value={preg.puntos}
                          onChange={(e) => {
                            const arr = [...preguntasQuiz];
                            arr[pIdx].puntos = Number(e.target.value);
                            setPreguntasQuiz(arr);
                          }}
                          style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#3498db', marginBottom: '3px' }}>URL de Imagen Ilustrativa (Opcional):</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        value={preg.imagenUrl || ''}
                        onChange={(e) => {
                          const arr = [...preguntasQuiz];
                          arr[pIdx].imagenUrl = e.target.value;
                          setPreguntasQuiz(arr);
                        }}
                        style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem' }}
                      />
                    </div>

                    {preg.tipo !== 'desarrollo' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>Opciones de Respuesta:</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                          {preg.opciones.map((op, opIdx) => (
                            <input 
                              key={opIdx}
                              type="text" 
                              placeholder={`Opción ${opIdx + 1}`}
                              value={op}
                              onChange={(e) => {
                                const arr = [...preguntasQuiz];
                                arr[pIdx].opciones[opIdx] = e.target.value;
                                setPreguntasQuiz(arr);
                              }}
                              style={{ padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem' }}
                            />
                          ))}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#2ecc71', fontWeight: 'bold', marginBottom: '3px' }}>Respuesta Correcta Exacta:</label>
                          <input 
                            type="text" 
                            placeholder="Debe coincidir con una de las opciones"
                            value={preg.correcta}
                            onChange={(e) => {
                              const arr = [...preguntasQuiz];
                              arr[pIdx].correcta = e.target.value;
                              setPreguntasQuiz(arr);
                            }}
                            style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', margin: 0 }}>Esta pregunta requiere respuesta escrita de desarrollo por parte del alumno.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: EXAMEN REAL ESCRITO */}
          {pestanaConfig === 'examenReal' && (
            <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#e63946', fontSize: '1.2rem' }}>🥋 Módulo de Examen Real Escrito (Teórico de Ascenso)</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: sumaTotalPuntosExamenReal === 100 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                    Suma total de puntos del examen: {sumaTotalPuntosExamenReal}% {sumaTotalPuntosExamenReal !== 100 && '(Debe sumar exactamente 100%)'}
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={examenRealConfig.activo}
                    onChange={(e) => setExamenRealConfig({ ...examenRealConfig, activo: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#2ecc71' }}
                  />
                  <span style={{ fontWeight: 'bold', color: examenRealConfig.activo ? '#2ecc71' : '#aaa' }}>
                    {examenRealConfig.activo ? '● Examen Habilitado para Alumnos' : '○ Examen Deshabilitado'}
                  </span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Título del Examen:</label>
                  <input 
                    type="text" 
                    value={examenRealConfig.titulo}
                    onChange={(e) => setExamenRealConfig({ ...examenRealConfig, titulo: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Fecha Límite / Entrega:</label>
                  <input 
                    type="date" 
                    value={examenRealConfig.fechaLimite}
                    onChange={(e) => setExamenRealConfig({ ...examenRealConfig, fechaLimite: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Instrucciones / Observaciones:</label>
                <textarea 
                  rows="2"
                  placeholder="Ej: Lea detenidamente cada pregunta y responda con base en el manual teórico..."
                  value={examenRealConfig.observaciones}
                  onChange={(e) => setExamenRealConfig({ ...examenRealConfig, observaciones: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ color: '#3498db', fontSize: '1.05rem', margin: 0 }}>📝 Preguntas del Examen Teórico Real</h4>
                <button 
                  type="button" 
                  onClick={() => setPreguntasExamenReal([...preguntasExamenReal, { id: Date.now(), tipo: 'opcion_multiple', enunciado: '', imagenUrl: '', opciones: ['', '', '', ''], correcta: '', puntos: 0 }])}
                  style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  + Agregar Pregunta al Examen
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {preguntasExamenReal.map((preg, pIdx) => (
                  <div key={preg.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#e63946', fontWeight: 'bold' }}>Pregunta Oficial #{pIdx + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const filtradas = preguntasExamenReal.filter((item) => item.id !== preg.id);
                          setPreguntasExamenReal(filtradas);
                        }}
                        style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>Enunciado:</label>
                        <input 
                          type="text" 
                          placeholder="Escribe la pregunta del examen..."
                          value={preg.enunciado}
                          onChange={(e) => {
                            const arr = [...preguntasExamenReal];
                            arr[pIdx].enunciado = e.target.value;
                            setPreguntasExamenReal(arr);
                          }}
                          style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>Tipo:</label>
                        <select 
                          value={preg.tipo}
                          onChange={(e) => {
                            const arr = [...preguntasExamenReal];
                            arr[pIdx].tipo = e.target.value;
                            setPreguntasExamenReal(arr);
                          }}
                          style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          <option value="opcion_multiple">Opción Múltiple</option>
                          <option value="desarrollo">Desarrollo / Abierta</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>Puntos (%):</label>
                        <input 
                          type="number" 
                          value={preg.puntos}
                          onChange={(e) => {
                            const arr = [...preguntasExamenReal];
                            arr[pIdx].puntos = Number(e.target.value);
                            setPreguntasExamenReal(arr);
                          }}
                          style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#3498db', marginBottom: '3px' }}>URL de Imagen Ilustrativa (Opcional):</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        value={preg.imagenUrl || ''}
                        onChange={(e) => {
                          const arr = [...preguntasExamenReal];
                          arr[pIdx].imagenUrl = e.target.value;
                          setPreguntasExamenReal(arr);
                        }}
                        style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem' }}
                      />
                    </div>

                    {preg.tipo !== 'desarrollo' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>Opciones de Respuesta:</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                          {preg.opciones.map((op, opIdx) => (
                            <input 
                              key={opIdx}
                              type="text" 
                              placeholder={`Opción ${opIdx + 1}`}
                              value={op}
                              onChange={(e) => {
                                const arr = [...preguntasExamenReal];
                                arr[pIdx].opciones[opIdx] = e.target.value;
                                setPreguntasExamenReal(arr);
                              }}
                              style={{ padding: '6px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem' }}
                            />
                          ))}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#2ecc71', fontWeight: 'bold', marginBottom: '3px' }}>Respuesta Correcta Exacta:</label>
                          <input 
                            type="text" 
                            placeholder="Debe coincidir con una de las opciones"
                            value={preg.correcta}
                            onChange={(e) => {
                              const arr = [...preguntasExamenReal];
                              arr[pIdx].correcta = e.target.value;
                              setPreguntasExamenReal(arr);
                            }}
                            style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', margin: 0 }}>Esta pregunta requiere respuesta escrita de desarrollo por parte del alumno.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '35px' }}>
            <button type="submit" style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
              💾 Guardar Configuración Completa
            </button>
          </div>

        </form>

        {/* SECCIÓN 4: REPORTE DE ACTIVIDAD EN TIEMPO REAL */}
        <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.2rem' }}>📈 Informe de Prácticas y Calificaciones de Alumnos</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Monitoreo de actividad del aula virtual.</p>
            </div>
            <div>
              <select 
                value={filtroReporteGrado}
                onChange={(e) => setFiltroReporteGrado(e.target.value)}
                style={{ padding: '8px 12px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                <option value="todos">Filtrar por todos los grados</option>
                {jerarquiaGrados.map(g => (
                  <option key={g.id} value={g.etiqueta}>{g.etiqueta}</option>
                ))}
              </select>
            </div>
          </div>

          {reportesFiltrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '25px 0', fontSize: '0.9rem' }}>No hay reportes enviados por los alumnos todavía.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#3498db' }}>
                    <th style={{ padding: '12px' }}>Fecha y Hora</th>
                    <th style={{ padding: '12px' }}>Atleta</th>
                    <th style={{ padding: '12px' }}>Grado Evaluado</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Puntaje Obtenido</th>
                  </tr>
                </thead>
                <tbody>
                  {reportesFiltrados.map((rep) => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px', color: '#aaa', fontSize: '0.85rem' }}>{new Date(rep.fecha).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>{rep.atletaNombre}</td>
                      <td style={{ padding: '12px', color: '#f39c12' }}>{rep.grado}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: rep.puntaje >= 80 ? '#2ecc71' : '#e74c3c' }}>
                        {rep.puntaje} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}