import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function MasterConceptos() {
  const [rubricas, setRubricas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('lista'); // 'lista' o 'formulario'
  
  // Jerarquía copiada del Expediente para unificar criterios
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

  // Estado del formulario
  const estadoInicialRubrica = {
    titulo: '',
    gradosDestino: [],
    permitirPuntosExtra: false,
    maxPuntosExtra: 5,
    conceptos: []
  };
  const [rubricaActual, setRubricaActual] = useState(estadoInicialRubrica);
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    cargarRubricas();
  }, []);

  const cargarRubricas = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, 'evaluaciones_rubricas'));
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setRubricas(lista);
    } catch (error) {
      console.error("Error cargando rúbricas:", error);
    } finally {
      setCargando(false);
    }
  };

  // --- LÓGICA DEL FORMULARIO (CEREBRO DINÁMICO) ---

  const calcularTotalConceptos = () => {
    return rubricaActual.conceptos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  };

  const agregarConcepto = () => {
    setRubricaActual({
      ...rubricaActual,
      conceptos: [...rubricaActual.conceptos, { id: Date.now().toString(), nombre: '', valor: 0, subConceptos: [] }]
    });
  };

  const actualizarConcepto = (index, campo, valor) => {
    const nuevos = [...rubricaActual.conceptos];
    nuevos[index][campo] = valor;
    setRubricaActual({ ...rubricaActual, conceptos: nuevos });
  };

  const eliminarConcepto = (index) => {
    const nuevos = rubricaActual.conceptos.filter((_, i) => i !== index);
    setRubricaActual({ ...rubricaActual, conceptos: nuevos });
  };

  const agregarSubConcepto = (indexConcepto) => {
    const nuevos = [...rubricaActual.conceptos];
    nuevos[indexConcepto].subConceptos.push({ id: Date.now().toString(), nombre: '', valor: 0 });
    setRubricaActual({ ...rubricaActual, conceptos: nuevos });
  };

  const actualizarSubConcepto = (indexConcepto, indexSub, campo, valor) => {
    const nuevos = [...rubricaActual.conceptos];
    nuevos[indexConcepto].subConceptos[indexSub][campo] = valor;
    setRubricaActual({ ...rubricaActual, conceptos: nuevos });
  };

  const eliminarSubConcepto = (indexConcepto, indexSub) => {
    const nuevos = [...rubricaActual.conceptos];
    nuevos[indexConcepto].subConceptos = nuevos[indexConcepto].subConceptos.filter((_, i) => i !== indexSub);
    setRubricaActual({ ...rubricaActual, conceptos: nuevos });
  };

  const toggleGrado = (etiqueta) => {
    let nuevosGrados = [...rubricaActual.gradosDestino];
    if (nuevosGrados.includes(etiqueta)) {
      nuevosGrados = nuevosGrados.filter(g => g !== etiqueta);
    } else {
      nuevosGrados.push(etiqueta);
    }
    setRubricaActual({ ...rubricaActual, gradosDestino: nuevosGrados });
  };

  const guardarRubrica = async () => {
    const total = calcularTotalConceptos();
    if (total !== 100) {
      alert(`⚠️ La suma de los conceptos principales debe ser exactamente 100. Actualmente es ${total}.`);
      return;
    }

    if (rubricaActual.gradosDestino.length === 0) {
      alert("⚠️ Debes asignar esta rúbrica a por lo menos un grado.");
      return;
    }

    // Validación de subconceptos
    for (let c of rubricaActual.conceptos) {
      if (c.subConceptos.length > 0) {
        const sumaSub = c.subConceptos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        if (sumaSub !== Number(c.valor)) {
          alert(`⚠️ Error en "${c.nombre}": El valor del concepto es ${c.valor}, pero sus sub-conceptos suman ${sumaSub}. Deben ser iguales.`);
          return;
        }
      }
    }

    try {
      if (editandoId) {
        await updateDoc(doc(db, 'evaluaciones_rubricas', editandoId), rubricaActual);
        alert("✅ Rúbrica actualizada.");
      } else {
        await addDoc(collection(db, 'evaluaciones_rubricas'), rubricaActual);
        alert("✅ Rúbrica creada con éxito.");
      }
      setVista('lista');
      cargarRubricas();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("❌ Error al guardar la rúbrica.");
    }
  };

  const totalGlobal = calcularTotalConceptos();

  return (
    <div style={{ padding: '20px', background: 'var(--bg-principal, #0a192f)', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#fff', borderBottom: '2px solid #e63946', paddingBottom: '10px' }}>
        ⚙️ Configuración de Rúbricas de Evaluación
      </h2>

      {vista === 'lista' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ color: '#aaa' }}>Crea plantillas dinámicas para los diferentes niveles de grados.</p>
            <button 
              onClick={() => { setRubricaActual(estadoInicialRubrica); setEditandoId(null); setVista('formulario'); }}
              style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Nueva Rúbrica
            </button>
          </div>

          {cargando ? <p>Cargando rúbricas...</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {rubricas.map(r => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#3498db' }}>{r.titulo}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '0 0 15px 0' }}>
                    Aplicable a: {r.gradosDestino.length} grados
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => { setRubricaActual(r); setEditandoId(r.id); setVista('formulario'); }}
                      style={{ background: '#f39c12', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', flex: 1 }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={async () => {
                        if(window.confirm('¿Seguro que deseas eliminar esta rúbrica?')) {
                          await deleteDoc(doc(db, 'evaluaciones_rubricas', r.id));
                          cargarRubricas();
                        }
                      }}
                      style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {rubricas.length === 0 && <p style={{ color: '#888' }}>No hay rúbricas configuradas.</p>}
            </div>
          )}
        </div>
      ) : (
        /* VISTA DE FORMULARIO DE RÚBRICA */
        <div style={{ background: '#07111e', padding: '30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>{editandoId ? 'Editar Rúbrica' : 'Crear Nueva Rúbrica'}</h3>
            <button onClick={() => setVista('lista')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Volver</button>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Título de la Rúbrica (Ej: "Examen Cintas de Color")</label>
            <input 
              type="text" value={rubricaActual.titulo} onChange={(e) => setRubricaActual({...rubricaActual, titulo: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff' }} placeholder="Ej: Rúbrica Principiantes"
            />
          </div>

          <div style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#3498db', fontWeight: 'bold' }}>Grados a los que aplica esta rúbrica:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jerarquiaGrados.map(g => (
                <button 
                  key={g.id} type="button" onClick={() => toggleGrado(g.etiqueta)}
                  style={{ 
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid #444', cursor: 'pointer', fontSize: '0.8rem',
                    background: rubricaActual.gradosDestino.includes(g.etiqueta) ? '#e63946' : 'transparent',
                    color: rubricaActual.gradosDestino.includes(g.etiqueta) ? '#fff' : '#aaa'
                  }}
                >
                  {g.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#2ecc71' }}>
              <input type="checkbox" checked={rubricaActual.permitirPuntosExtra} onChange={(e) => setRubricaActual({...rubricaActual, permitirPuntosExtra: e.target.checked})} style={{ transform: 'scale(1.3)' }} />
              Habilitar Bonificación (Puntos Extra)
            </label>
            {rubricaActual.permitirPuntosExtra && (
              <div>
                <span style={{ fontSize: '0.85rem', color: '#aaa', marginRight: '10px' }}>Puntos máximos a otorgar:</span>
                <input type="number" value={rubricaActual.maxPuntosExtra} onChange={(e) => setRubricaActual({...rubricaActual, maxPuntosExtra: e.target.value})} style={{ width: '60px', padding: '5px', borderRadius: '4px', background: '#121212', color: '#fff', border: '1px solid #444' }} />
              </div>
            )}
          </div>

          {/* ÁREA DE CONCEPTOS */}
          <div style={{ borderTop: '2px dashed #444', paddingTop: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#f39c12' }}>Estructura de Evaluación (Base 100)</h3>
              <div style={{ background: totalGlobal === 100 ? '#2ecc71' : '#e74c3c', color: '#fff', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                Total Actual: {totalGlobal}%
              </div>
            </div>

            {rubricaActual.conceptos.map((concepto, cIdx) => (
              <div key={concepto.id} style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Concepto Principal</label>
                    <input type="text" value={concepto.nombre} onChange={(e) => actualizarConcepto(cIdx, 'nombre', e.target.value)} placeholder="Ej: Fundamentos / Poomsae" style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor (%)</label>
                    <input type="number" value={concepto.valor} onChange={(e) => actualizarConcepto(cIdx, 'valor', Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                  </div>
                  <button onClick={() => eliminarConcepto(cIdx)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                </div>

                {/* SUBCONCEPTOS */}
                <div style={{ marginLeft: '20px', borderLeft: '2px solid #444', paddingLeft: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>Sub-conceptos (Opcional - Deben sumar {concepto.valor || 0})</span>
                    <button onClick={() => agregarSubConcepto(cIdx)} style={{ background: 'transparent', color: '#3498db', border: '1px solid #3498db', padding: '3px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>+ Agregar Sub</button>
                  </div>
                  
                  {concepto.subConceptos.map((sub, sIdx) => (
                    <div key={sub.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#555' }}>└</span>
                      <input type="text" value={sub.nombre} onChange={(e) => actualizarSubConcepto(cIdx, sIdx, 'nombre', e.target.value)} placeholder="Ej: Altura de pateo" style={{ flex: 1, padding: '6px', background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: '4px', fontSize: '0.85rem' }} />
                      <input type="number" value={sub.valor} onChange={(e) => actualizarSubConcepto(cIdx, sIdx, 'valor', Number(e.target.value))} placeholder="Valor" style={{ width: '70px', padding: '6px', background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: '4px', fontSize: '0.85rem' }} />
                      <button onClick={() => eliminarSubConcepto(cIdx, sIdx)} style={{ background: 'transparent', color: '#e74c3c', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={agregarConcepto} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px dashed #666', padding: '12px', width: '100%', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Agregar Nuevo Concepto Principal
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' }}>
            <button onClick={guardarRubrica} style={{ background: totalGlobal === 100 ? '#e63946' : '#555', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: totalGlobal === 100 ? 'pointer' : 'not-allowed', fontSize: '1.1rem' }} disabled={totalGlobal !== 100}>
              💾 Guardar Rúbrica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}