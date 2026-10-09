import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, updateDoc, doc, query, where, writeBatch } from 'firebase/firestore';

export default function MasterResultados() {
  const [eventos, setEventos] = useState([]);
  const [rubricas, setRubricas] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados del Modal de Análisis
  const [modalAbierto, setModalAbierto] = useState(false);
  const [evaluacionActual, setEvaluacionActual] = useState(null);
  const [puntosExtra, setPuntosExtra] = useState(0);

  const jerarquiaGrados = [
    { id: 'blanco', etiqueta: 'Blanco (10° Gup)' },
    { id: 'blanco_amarillo', etiqueta: 'Blanco-Amarillo (9° Gup)' },
    { id: 'amarillo', etiqueta: 'Amarillo (8° Gup)' },
    { id: 'amarillo_naranja', etiqueta: 'Amarillo-Naranja (8° Gup)' },
    { id: 'naranja', etiqueta: 'Naranja (7° Gup)' },
    { id: 'amarillo_verde', etiqueta: 'Amarillo-Verde (7° Gup)' },
    { id: 'verde', etiqueta: 'Verde (6° Gup)' },
    { id: 'verde_azul', etiqueta: 'Verde-Azul (5° Gup)' },
    { id: 'azul', etiqueta: 'Azul (4° Gup)' },
    { id: 'azul_rojo', etiqueta: 'Azul-Rojo (3° Gup)' },
    { id: 'rojo', etiqueta: 'Rojo (2° Gup)' },
    { id: 'rojo_negro', etiqueta: 'Rojo-Negro (1° Gup)' },
    { id: 'negro_1', etiqueta: 'Negro 1er Dan' }
  ];

  useEffect(() => {
    cargarDatosBasicos();
  }, []);

  useEffect(() => {
    if (eventoSeleccionado) {
      cargarEvaluaciones();
    } else {
      setEvaluaciones([]);
    }
  }, [eventoSeleccionado]);

  const cargarDatosBasicos = async () => {
    // Cargar eventos
    const snapEventos = await getDocs(collection(db, 'eventos'));
    const listaEventos = [];
    snapEventos.forEach(d => {
      const data = d.data();
      if (data.tipo?.toLowerCase().includes('examen') || data.titulo?.toLowerCase().includes('examen')) {
        listaEventos.push({ id: d.id, ...data });
      }
    });
    setEventos(listaEventos);

    // Cargar rúbricas para poder traducir los detalles de las notas
    const snapRubricas = await getDocs(collection(db, 'evaluaciones_rubricas'));
    const listaRubricas = [];
    snapRubricas.forEach(d => listaRubricas.push({ id: d.id, ...d.data() }));
    setRubricas(listaRubricas);
  };

  const cargarEvaluaciones = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'examenes_asignados'), where('eventoId', '==', eventoSeleccionado));
      const snap = await getDocs(q);
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setEvaluaciones(lista);
    } catch (error) {
      console.error("Error al cargar evaluaciones:", error);
    } finally {
      setCargando(false);
    }
  };

  // Calcula el promedio TOTAL de lo que enviaron todos los jueces
  const calcularPromedioBase = (notas) => {
    if (!notas || notas.length === 0) return 0;
    const suma = notas.reduce((acc, curr) => acc + curr.notaTotal, 0);
    return Math.round(suma / notas.length);
  };

  const obtenerSiguienteGrado = (gradoActual) => {
    const index = jerarquiaGrados.findIndex(g => g.etiqueta === gradoActual);
    if (index >= 0 && index < jerarquiaGrados.length - 1) {
      return jerarquiaGrados[index + 1].etiqueta;
    }
    return gradoActual;
  };

  const abrirAnalisis = (evaluacion) => {
    setEvaluacionActual(evaluacion);
    setPuntosExtra(0); // Reiniciamos los puntos extra al abrir
    setModalAbierto(true);
  };

  // Función clave: Calcula el promedio específico de UN concepto basado en lo que pusieron los jueces
  const calcularPromedioConcepto = (idConcepto, notasProfesores) => {
    if (!notasProfesores || notasProfesores.length === 0) return 0;
    let sumaConcepto = 0;
    notasProfesores.forEach(juez => {
      if (juez.detalle) {
        Object.keys(juez.detalle).forEach(key => {
          if (key.startsWith(idConcepto + '_')) {
            sumaConcepto += Number(juez.detalle[key]);
          }
        });
      }
    });
    return (sumaConcepto / notasProfesores.length);
  };

  const tomarDecisionFinal = async (esAprobado) => {
    const notaFinalCalculada = calcularPromedioBase(evaluacionActual.notasProfesores) + Number(puntosExtra);
    const accionTexto = esAprobado ? 'APROBAR y PROMOVER' : 'REPROBAR';
    
    if (!window.confirm(`¿Estás seguro de ${accionTexto} a ${evaluacionActual.atletaNombre} con una nota final de ${notaFinalCalculada}?`)) {
      return;
    }

    setCargando(true);
    try {
      const batch = writeBatch(db);
      const refExamen = doc(db, 'examenes_asignados', evaluacionActual.id);
      
      // 1. Siempre actualizamos la boleta de examen
      batch.update(refExamen, {
        estadoEvaluacion: 'Completado',
        aprobado: esAprobado,
        notaFinal: notaFinalCalculada,
        puntosExtraAplicados: Number(puntosExtra),
        fechaDecision: new Date().toISOString()
      });

      // 2. Solo si aprueba, le subimos el grado en su expediente
      let nuevoGrado = evaluacionActual.gradoActual;
      if (esAprobado) {
        nuevoGrado = obtenerSiguienteGrado(evaluacionActual.gradoActual);
        const refAtleta = doc(db, 'atletas', evaluacionActual.atletaId);
        batch.update(refAtleta, {
          'disciplina.grado': nuevoGrado
        });
      }

      await batch.commit();

      alert(esAprobado ? `✅ ¡Atleta promovido a ${nuevoGrado} con éxito!` : `⚠️ Atleta reprobado. Conserva el grado ${nuevoGrado}.`);
      setModalAbierto(false);
      cargarEvaluaciones();
    } catch (error) {
      console.error("Error en la decisión:", error);
      alert("❌ Ocurrió un error al procesar el examen.");
    } finally {
      setCargando(false);
    }
  };

  // Renderizado del Modal de Análisis
  const renderDetalles = () => {
    if (!evaluacionActual) return null;
    const rubrica = rubricas.find(r => r.id === evaluacionActual.rubricaId);
    const promedioBase = calcularPromedioBase(evaluacionActual.notasProfesores);
    const notaFinal = promedioBase + Number(puntosExtra);
    const siguienteGrado = obtenerSiguienteGrado(evaluacionActual.gradoActual);

    // Encontrar el concepto más bajo para resaltarlo
    let porcentajeMasBajo = 100;
    let idConceptoMasBajo = null;

    if (rubrica) {
      rubrica.conceptos.forEach(c => {
        const prom = calcularPromedioConcepto(c.id, evaluacionActual.notasProfesores);
        const porcentaje = (prom / c.valor) * 100;
        if (porcentaje < porcentajeMasBajo) {
          porcentajeMasBajo = porcentaje;
          idConceptoMasBajo = c.id;
        }
      });
    }

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ background: '#07111e', width: '100%', maxWidth: '600px', borderRadius: '12px', border: '1px solid #444', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          
          <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#3498db' }}>Análisis de Evaluación</h3>
            <button onClick={() => setModalAbierto(false)} style={{ background: 'transparent', color: '#aaa', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 5px 0', color: '#fff' }}>{evaluacionActual.atletaNombre}</h2>
            <p style={{ margin: '0 0 20px 0', color: '#aaa', fontSize: '0.9rem' }}>Grado Actual: {evaluacionActual.gradoActual} &rarr; Postula a: {siguienteGrado}</p>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1, background: '#111', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
                <span style={{ color: '#aaa', fontSize: '0.85rem', display: 'block' }}>Promedio de Jueces</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: promedioBase >= 70 ? '#2ecc71' : '#e74c3c' }}>{promedioBase}</span>
              </div>
              <div style={{ flex: 1, background: 'rgba(243, 156, 18, 0.1)', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(243, 156, 18, 0.3)' }}>
                <span style={{ color: '#f39c12', fontSize: '0.85rem', display: 'block' }}>Puntos Adicionales</span>
                <input 
                  type="number" min="0" max="100" value={puntosExtra} onChange={(e) => setPuntosExtra(e.target.value)}
                  style={{ width: '60px', background: 'transparent', color: '#fff', border: 'none', borderBottom: '2px solid #f39c12', textAlign: 'center', fontSize: '1.8rem', fontWeight: 'bold', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, background: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                <span style={{ color: '#2ecc71', fontSize: '0.85rem', display: 'block' }}>NOTA FINAL</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2ecc71' }}>{notaFinal}</span>
              </div>
            </div>

            <h4 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Desglose por Conceptos</h4>
            {rubrica ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rubrica.conceptos.map(c => {
                  const valorObtenido = calcularPromedioConcepto(c.id, evaluacionActual.notasProfesores);
                  const esElMasBajo = c.id === idConceptoMasBajo;
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: esElMasBajo ? 'rgba(231, 76, 60, 0.1)' : '#1a1a1a', borderRadius: '6px', border: esElMasBajo ? '1px solid #e74c3c' : '1px solid #333' }}>
                      <span style={{ color: esElMasBajo ? '#e74c3c' : '#ccc' }}>
                        {esElMasBajo && '⚠️ '} {c.nombre}
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{valorObtenido.toFixed(1)} / {c.valor} pts</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#aaa' }}>No se pudo cargar la estructura de la rúbrica.</p>
            )}
          </div>

          <div style={{ padding: '20px', background: '#111', borderTop: '1px solid #333', display: 'flex', gap: '15px' }}>
            <button onClick={() => tomarDecisionFinal(false)} style={{ flex: 1, background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              🔴 Reprobar
            </button>
            <button onClick={() => tomarDecisionFinal(true)} style={{ flex: 2, background: '#2ecc71', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)' }}>
              🟢 Aprobar y Promover a {siguienteGrado}
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', background: 'var(--bg-principal, #0a192f)', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#fff', borderBottom: '2px solid #2ecc71', paddingBottom: '10px', marginTop: 0 }}>
        🏆 Resultados y Promociones
      </h2>
      <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '25px' }}>
        Analiza las calificaciones de los jueces, otorga puntos extra y decide si el alumno aprueba o reprueba.
      </p>

      {/* FILTRO DE EVENTO */}
      <div style={{ background: '#07111e', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#3498db', fontWeight: 'bold' }}>Seleccionar Evento para Revisar:</label>
        <select 
          value={eventoSeleccionado} 
          onChange={(e) => setEventoSeleccionado(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
        >
          <option value="">-- Elige un evento --</option>
          {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
        </select>
      </div>

      {cargando && <div style={{ color: '#f39c12', marginBottom: '20px' }}>Actualizando datos...</div>}

      {/* TABLA PRINCIPAL */}
      {eventoSeleccionado && (
        <div style={{ background: '#07111e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#aaa', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px' }}>Alumno</th>
                <th style={{ padding: '12px 10px' }}>Grado Actual</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>Evaluadores</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>Promedio Base</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map(ev => {
                const promedio = calcularPromedioBase(ev.notasProfesores);
                const cantJueces = ev.notasProfesores ? ev.notasProfesores.length : 0;
                const completado = ev.estadoEvaluacion === 'Completado';

                return (
                  <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: completado ? 'rgba(46, 204, 113, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{ev.atletaNombre}</td>
                    <td style={{ padding: '12px 10px', color: '#ccc' }}>
                      <span style={{ background: '#222', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{ev.gradoActual}</span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {cantJueces > 0 ? (
                        <span style={{ color: '#3498db', fontWeight: 'bold' }}>{cantJueces} Juez(ces)</span>
                      ) : (
                        <span style={{ color: '#aaa' }}>Sin notas aún</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {cantJueces > 0 ? (
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{promedio}</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {completado ? (
                        <span style={{ color: ev.aprobado ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                          {ev.aprobado ? `✓ Aprobado (${ev.notaFinal} pts)` : `✕ Reprobado (${ev.notaFinal} pts)`}
                        </span>
                      ) : (
                        <button 
                          onClick={() => abrirAnalisis(ev)}
                          disabled={cantJueces === 0}
                          style={{ 
                            background: cantJueces === 0 ? '#444' : '#3498db', 
                            color: '#fff', 
                            border: 'none', 
                            padding: '8px 15px', 
                            borderRadius: '6px', 
                            cursor: cantJueces === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          🔍 Analizar y Calificar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {evaluaciones.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                    No hay alumnos asignados a este evento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RENDERIZAR EL MODAL SI ESTÁ ABIERTO */}
      {modalAbierto && renderDetalles()}
    </div>
  );
}