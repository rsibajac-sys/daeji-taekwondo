import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ExpedienteEvaluaciones({ atletaId }) {
  const [examenes, setExamenes] = useState([]);
  const [rubricas, setRubricas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [examenExpandido, setExamenExpandido] = useState(null);

  useEffect(() => {
    if (atletaId) {
      cargarHistorial();
    }
  }, [atletaId]);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      // 1. Traemos TODOS los exámenes asignados a este atleta (Evita el bloqueo de índices compuestos de Firebase)
      const qExamenes = query(
        collection(db, 'examenes_asignados'), 
        where('atletaId', '==', atletaId)
      );
      const snapExamenes = await getDocs(qExamenes);
      const listaExamenes = [];
      
      snapExamenes.forEach(d => {
        const data = d.data();
        // 2. Filtramos internamente con JavaScript para mostrar SOLO los completados (aprobados o reprobados)
        if (data.estadoEvaluacion === 'Completado') {
          listaExamenes.push({ id: d.id, ...data });
        }
      });
      
      // 3. Ordenamos por fecha (los más recientes primero)
      listaExamenes.sort((a, b) => {
        const fechaA = new Date(a.fechaDecision || a.fechaAprobacion || 0);
        const fechaB = new Date(b.fechaDecision || b.fechaAprobacion || 0);
        return fechaB - fechaA;
      });
      
      setExamenes(listaExamenes);

      // 4. Cargar las rúbricas para poder traducir los detalles visuales
      const snapRubricas = await getDocs(collection(db, 'evaluaciones_rubricas'));
      const dictRubricas = {};
      snapRubricas.forEach(d => {
        dictRubricas[d.id] = d.data();
      });
      setRubricas(dictRubricas);

    } catch (error) {
      console.error("Error al cargar historial de exámenes:", error);
    } finally {
      setCargando(false);
    }
  };

  // Función matemática para sacar el promedio exacto de un concepto principal entre varios jueces
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

  // Función matemática para sacar el promedio exacto de un sub-concepto específico entre varios jueces
  const calcularPromedioSubConcepto = (idConcepto, idSubConcepto, notasProfesores) => {
    if (!notasProfesores || notasProfesores.length === 0) return 0;
    let sumaSub = 0;
    const claveBuscada = `${idConcepto}_${idSubConcepto}`;
    
    notasProfesores.forEach(juez => {
      if (juez.detalle && juez.detalle[claveBuscada] !== undefined) {
        sumaSub += Number(juez.detalle[claveBuscada]);
      }
    });
    return (sumaSub / notasProfesores.length);
  };

  const toggleExpandir = (idExamen) => {
    if (examenExpandido === idExamen) {
      setExamenExpandido(null);
    } else {
      setExamenExpandido(idExamen);
    }
  };

  if (cargando) return <div style={{ color: '#3498db', padding: '20px', textAlign: 'center' }}>Cargando historial académico...</div>;

  if (examenes.length === 0) return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed #444', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#888' }}>
      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🥋</span>
      No hay registros de exámenes finalizados para este alumno.
    </div>
  );

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ color: '#fff', borderBottom: '2px solid #3498db', paddingBottom: '10px', marginBottom: '20px' }}>
        📊 Historial de Exámenes y Evaluaciones
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {examenes.map(examen => {
          const aprobado = examen.aprobado;
          const expandido = examenExpandido === examen.id;
          const rubricaUsada = rubricas[examen.rubricaId];
          const fechaFormateada = examen.fechaDecision || examen.fechaAprobacion 
            ? new Date(examen.fechaDecision || examen.fechaAprobacion).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' }) 
            : 'Fecha no registrada';

          return (
            <div key={examen.id} style={{ background: '#07111e', border: `1px solid ${aprobado ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`, borderRadius: '12px', overflow: 'hidden' }}>
              
              {/* ENCABEZADO DEL EXAMEN (Siempre visible) */}
              <div 
                onClick={() => toggleExpandir(examen.id)}
                style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandido ? 'rgba(255,255,255,0.02)' : 'transparent' }}
              >
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.1rem' }}>{examen.eventoTitulo}</h4>
                  <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Postulación desde: {examen.gradoActual} • {fechaFormateada}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 'bold', color: aprobado ? '#2ecc71' : '#e74c3c' }}>
                      {examen.notaFinal} <span style={{ fontSize: '0.9rem', color: '#888' }}>/ 100</span>
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: aprobado ? '#2ecc71' : '#e74c3c', textTransform: 'uppercase' }}>
                      {aprobado ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </div>
                  <span style={{ color: '#aaa', transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                </div>
              </div>

              {/* DETALLES DEL EXAMEN (Se muestra al hacer clic) */}
              {expandido && (
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0a192f' }}>
                  
                  {examen.puntosExtraAplicados > 0 && (
                    <div style={{ background: 'rgba(243, 156, 18, 0.1)', border: '1px solid rgba(243, 156, 18, 0.3)', padding: '10px', borderRadius: '8px', color: '#f39c12', marginBottom: '15px', fontSize: '0.9rem' }}>
                      ⭐ <strong>Puntos Adicionales:</strong> Se aplicaron +{examen.puntosExtraAplicados} puntos a la nota base por méritos/actitud.
                    </div>
                  )}

                  <h5 style={{ color: '#3498db', marginTop: 0, marginBottom: '15px' }}>Desglose de Calificaciones</h5>
                  
                  {rubricaUsada ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {rubricaUsada.conceptos.map(c => {
                        const valorObtenido = calcularPromedioConcepto(c.id, examen.notasProfesores);
                        const porcentajeRendimiento = (valorObtenido / c.valor) * 100;
                        let colorBarra = '#2ecc71';
                        if (porcentajeRendimiento < 70) colorBarra = '#e74c3c';
                        else if (porcentajeRendimiento < 85) colorBarra = '#f39c12';

                        return (
                          <div key={c.id} style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #222' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ color: '#ccc', fontWeight: 'bold' }}>{c.nombre}</span>
                              <span style={{ color: '#fff', fontWeight: 'bold' }}>{valorObtenido.toFixed(1)} / {c.valor} pts</span>
                            </div>
                            
                            {/* Barra de progreso visual */}
                            <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                              <div style={{ width: `${porcentajeRendimiento}%`, height: '100%', background: colorBarra, transition: 'width 0.5s ease-in-out' }}></div>
                            </div>

                            {/* DESGLOSE DE SUB-CONCEPTOS */}
                            {c.subConceptos && c.subConceptos.length > 0 && (
                              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #333', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                                {c.subConceptos.map(sub => {
                                  const valSub = calcularPromedioSubConcepto(c.id, sub.id, examen.notasProfesores);
                                  return (
                                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa' }}>
                                      <span>• {sub.nombre}</span>
                                      <span style={{ color: '#ddd', fontWeight: '500' }}>{valSub.toFixed(1)} / {sub.valor} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>Detalles de la rúbrica no disponibles.</p>
                  )}

                  <div style={{ marginTop: '20px', borderTop: '1px dashed #444', paddingTop: '15px' }}>
                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Tribunal Evaluador: </span>
                    <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
                      {examen.notasProfesores ? examen.notasProfesores.map(n => n.juez).join(', ') : 'No registrado'}
                    </span>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}