import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, arrayUnion } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function PanelEvaluador() {
  const [paso, setPaso] = useState(1); // 1: Login Juez, 2: Lista Alumnos, 3: Calificando
  const [cargando, setCargando] = useState(false);

  // Estados del Juez
  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');
  const [nombreJuez, setNombreJuez] = useState('');

  // Estados de Evaluación
  const [atletas, setAtletas] = useState([]);
  const [atletaActual, setAtletaActual] = useState(null);
  const [rubricaActual, setRubricaActual] = useState(null);
  const [calificaciones, setCalificaciones] = useState({}); // { "idConcepto_idSubconcepto": valor }

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    const snap = await getDocs(collection(db, 'eventos'));
    const lista = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.tipo?.toLowerCase().includes('examen') || data.titulo?.toLowerCase().includes('examen')) {
        lista.push({ id: d.id, ...data });
      }
    });
    setEventos(lista);
  };

  const iniciarSesionJuez = async (e) => {
    e.preventDefault();
    if (!eventoSeleccionado || !nombreJuez.trim()) {
      alert("Por favor selecciona un evento e ingresa tu nombre.");
      return;
    }
    setCargando(true);
    try {
      // Cargar alumnos asignados a este evento
      const q = query(collection(db, 'examenes_asignados'), where('eventoId', '==', eventoSeleccionado));
      const snap = await getDocs(q);
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setAtletas(lista);
      setPaso(2);
    } catch (error) {
      console.error("Error al cargar atletas:", error);
    } finally {
      setCargando(false);
    }
  };

  const abrirEvaluacion = async (atleta) => {
    setCargando(true);
    try {
      // Traer la estructura de la rúbrica que el Master le asignó a este alumno
      const docRubrica = await getDocs(query(collection(db, 'evaluaciones_rubricas'), where('__name__', '==', atleta.rubricaId)));
      if (!docRubrica.empty) {
        setRubricaActual({ id: docRubrica.docs[0].id, ...docRubrica.docs[0].data() });
        setAtletaActual(atleta);
        setCalificaciones({}); // Reiniciamos los inputs
        setPaso(3);
      } else {
        alert("No se encontró la rúbrica asignada.");
      }
    } catch (error) {
      console.error("Error cargando rúbrica:", error);
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioNota = (idConcepto, idSub, valorMax, valorIngresado) => {
    let nota = Number(valorIngresado);
    if (nota < 0) nota = 0;
    if (nota > valorMax) nota = valorMax; // Evitar que el juez ponga más nota de la permitida
    setCalificaciones({ ...calificaciones, [`${idConcepto}_${idSub}`]: nota });
  };

  const calcularTotal = () => {
    return Object.values(calificaciones).reduce((acc, curr) => acc + curr, 0);
  };

  const enviarEvaluacion = async () => {
    if (window.confirm(`¿Estás seguro de enviar la calificación de ${calcularTotal()} puntos para ${atletaActual.atletaNombre}?`)) {
      setCargando(true);
      try {
        const docRef = doc(db, 'examenes_asignados', atletaActual.id);
        
        // Estructuramos la firma del juez
        const evaluacionDelJuez = {
          juez: nombreJuez,
          notaTotal: calcularTotal(),
          detalle: calificaciones,
          fecha: new Date().toISOString()
        };

        // arrayUnion agrega esta calificación al arreglo sin borrar las de otros jueces
        await updateDoc(docRef, {
          notasProfesores: arrayUnion(evaluacionDelJuez),
          estadoEvaluacion: 'En Progreso'
        });

        alert("✅ Evaluación enviada correctamente.");
        
        // Actualizar la lista local para marcarlo como evaluado
        setAtletas(atletas.map(a => a.id === atletaActual.id ? { ...a, notasProfesores: [...(a.notasProfesores || []), evaluacionDelJuez] } : a));
        setPaso(2);
      } catch (error) {
        console.error("Error al guardar evaluación:", error);
        alert("Error al enviar los datos.");
      } finally {
        setCargando(false);
      }
    }
  };

  // Verifica si este juez ya evaluó a un atleta específico
  const yaEvaluadoPorMi = (atleta) => {
    if (!atleta.notasProfesores) return false;
    return atleta.notasProfesores.some(n => n.juez.toLowerCase() === nombreJuez.toLowerCase());
  };

  return (
    <div style={{ background: '#0a192f', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '20px' }}>
      
      {/* HEADER TIPO APP */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img src={logoDaeji} alt="Logo" style={{ width: '120px' }} />
        <h2 style={{ margin: '10px 0 0 0', color: '#3498db' }}>Panel de Evaluación</h2>
      </div>

      {cargando && <div style={{ textAlign: 'center', color: '#f39c12', marginBottom: '20px' }}>Cargando datos...</div>}

      {/* PANTALLA 1: LOGIN DEL JUEZ */}
      {paso === 1 && (
        <form onSubmit={iniciarSesionJuez} style={{ maxWidth: '400px', margin: '0 auto', background: '#07111e', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Nombre del Evaluador (Juez)</label>
            <input 
              type="text" required value={nombreJuez} onChange={(e) => setNombreJuez(e.target.value)}
              placeholder="Ej: Sabonim Carlos Rojas"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#121212', color: '#fff', fontSize: '1rem' }}
            />
          </div>
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Evento Activo</label>
            <select 
              required value={eventoSeleccionado} onChange={(e) => setEventoSeleccionado(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#121212', color: '#fff', fontSize: '1rem' }}
            >
              <option value="">-- Selecciona el Examen --</option>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
            </select>
          </div>
          <button type="submit" style={{ width: '100%', background: '#e63946', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Ingresar al Panel
          </button>
        </form>
      )}

      {/* PANTALLA 2: LISTA DE ATLETAS DEL EVENTO */}
      {paso === 2 && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Alumnos en Nómina</h3>
            <span style={{ fontSize: '0.85rem', color: '#3498db' }}>Juez: {nombreJuez}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {atletas.map(a => {
              const completado = yaEvaluadoPorMi(a);
              return (
                <div key={a.id} onClick={() => !completado && abrirEvaluacion(a)} style={{ background: completado ? 'rgba(46, 204, 113, 0.1)' : '#07111e', border: `1px solid ${completado ? '#2ecc71' : '#333'}`, padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: completado ? 'default' : 'pointer', opacity: completado ? 0.7 : 1 }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: completado ? '#2ecc71' : '#fff' }}>{a.atletaNombre}</h4>
                    <span style={{ background: '#222', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#aaa' }}>{a.gradoActual}</span>
                  </div>
                  <div>
                    {completado ? <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>✓ Calificado</span> : <span style={{ color: '#e63946', fontWeight: 'bold', fontSize: '1.2rem' }}>&rarr;</span>}
                  </div>
                </div>
              );
            })}
            {atletas.length === 0 && <p style={{ textAlign: 'center', color: '#aaa' }}>No hay atletas asignados a este evento aún.</p>}
          </div>
          <button onClick={() => setPaso(1)} style={{ marginTop: '30px', background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%' }}>Salir</button>
        </div>
      )}

      {/* PANTALLA 3: FORMULARIO DE EVALUACIÓN (LA RÚBRICA) */}
      {paso === 3 && atletaActual && rubricaActual && (
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#07111e', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
          
          <div style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
            <button onClick={() => setPaso(2)} style={{ background: 'transparent', color: '#3498db', border: 'none', cursor: 'pointer', marginBottom: '15px', fontSize: '1rem' }}>&larr; Volver a la lista</button>
            <h3 style={{ margin: '0 0 5px 0', color: '#f39c12' }}>{atletaActual.atletaNombre}</h3>
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>{atletaActual.gradoActual} • Rúbrica: {rubricaActual.titulo}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#aaa' }}>Nota Acumulada:</span>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: calcularTotal() >= 70 ? '#2ecc71' : '#e74c3c' }}>{calcularTotal()} <span style={{ fontSize: '1rem', color: '#888' }}>/ 100</span></span>
          </div>

          {/* RENDERIZADO DINÁMICO DE LA RÚBRICA */}
          {rubricaActual.conceptos.map(concepto => (
            <div key={concepto.id} style={{ marginBottom: '25px' }}>
              <h4 style={{ background: '#1a1a1a', padding: '10px', borderRadius: '6px', margin: '0 0 15px 0', color: '#3498db', borderLeft: '3px solid #3498db' }}>
                {concepto.nombre} (Máx: {concepto.valor} pts)
              </h4>
              
              {concepto.subConceptos && concepto.subConceptos.length > 0 ? (
                concepto.subConceptos.map(sub => (
                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', borderBottom: '1px solid #222' }}>
                    <span style={{ color: '#ccc', fontSize: '0.9rem', flex: 1 }}>{sub.nombre} (0 - {sub.valor})</span>
                    <input 
                      type="number" 
                      min="0" max={sub.valor}
                      value={calificaciones[`${concepto.id}_${sub.id}`] || ''}
                      onChange={(e) => manejarCambioNota(concepto.id, sub.id, sub.valor, e.target.value)}
                      style={{ width: '70px', padding: '8px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444', textAlign: 'center', fontSize: '1.1rem' }}
                    />
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px' }}>
                  <span style={{ color: '#ccc', fontSize: '0.9rem', flex: 1 }}>Calificación General (0 - {concepto.valor})</span>
                  <input 
                    type="number" 
                    min="0" max={concepto.valor}
                    value={calificaciones[`${concepto.id}_general`] || ''}
                    onChange={(e) => manejarCambioNota(concepto.id, 'general', concepto.valor, e.target.value)}
                    style={{ width: '70px', padding: '8px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444', textAlign: 'center', fontSize: '1.1rem' }}
                  />
                </div>
              )}
            </div>
          ))}

          <button onClick={enviarEvaluacion} style={{ width: '100%', background: '#2ecc71', color: '#fff', border: 'none', padding: '18px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)' }}>
            Firmar y Enviar Calificación
          </button>
        </div>
      )}
    </div>
  );
}