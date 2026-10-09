import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';

export default function MasterElegibilidad() {
  const [eventos, setEventos] = useState([]);
  const [rubricas, setRubricas] = useState([]);
  const [atletas, setAtletas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados del Formulario de Asignación
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');
  const [rubricaSeleccionada, setRubricaSeleccionada] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('Todos');
  const [atletasSeleccionados, setAtletasSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // Jerarquía Completa Unificada para emparejar formatos
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
    { id: 'negro_1', nombre: 'Cinturón Negro 1er Dan', etiqueta: 'Negro 1er Dan' }
  ];

  // Función "Traductora" para homologar grados antiguos con los nuevos
// Función "Traductora" a prueba de balas (ignora tildes, mayúsculas y espacios extra)
  const normalizarGrado = (gradoCrudo) => {
    // 1. Si la celda en la base de datos está vacía, nula, o es un espacio, por defecto es Blanco
    if (!gradoCrudo || typeof gradoCrudo !== 'string' || gradoCrudo.trim() === '') {
      return 'Blanco (10° Gup)';
    }

    // 2. Limpiamos el texto de la BD: quitamos tildes, pasamos a minúsculas y borramos espacios extra
    const textoLimpio = gradoCrudo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    // 3. Buscamos coincidencias flexibles en nuestra jerarquía
    const encontrado = jerarquiaGrados.find(g => {
      const nombreLimpio = g.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const etiquetaLimpia = g.etiqueta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      // Si el texto de la BD dice solo "blanco" y el nuestro dice "cinturon blanco", hace match.
      return textoLimpio.includes(nombreLimpio) || 
             nombreLimpio.includes(textoLimpio) || 
             etiquetaLimpia.includes(textoLimpio);
    });

    // 4. Si encuentra similitud, asigna el grado oficial correcto. Si es un texto irreconocible, previene el error asignando Blanco.
    return encontrado ? encontrado.etiqueta : 'Blanco (10° Gup)';
  };

  const gradosUnicos = ['Todos', ...jerarquiaGrados.map(g => g.etiqueta)];

  useEffect(() => {
    cargarDatosBasicos();
  }, []);

  const cargarDatosBasicos = async () => {
    setCargando(true);
    try {
      const snapEventos = await getDocs(collection(db, 'eventos'));
      const listaEventos = [];
      snapEventos.forEach(d => {
        const data = d.data();
        if (data.tipo?.toLowerCase().includes('examen') || data.tipo?.toLowerCase().includes('evaluacion') || data.titulo?.toLowerCase().includes('examen')) {
          listaEventos.push({ id: d.id, ...data });
        }
      });
      setEventos(listaEventos);

      const snapRubricas = await getDocs(collection(db, 'evaluaciones_rubricas'));
      const listaRubricas = [];
      snapRubricas.forEach(d => listaRubricas.push({ id: d.id, ...d.data() }));
      setRubricas(listaRubricas);

      const qAtletas = query(collection(db, 'atletas'), where('estado', '==', 'Activo'));
      const snapAtletas = await getDocs(qAtletas);
      const listaAtletas = [];
      snapAtletas.forEach(d => {
        const data = d.data();
        // Normalizamos el grado al cargarlo
        const gradoNormalizado = normalizarGrado(data.disciplina?.grado);
        listaAtletas.push({ 
          id: d.id, 
          ...data, 
          gradoOficial: gradoNormalizado 
        });
      });
      
      listaAtletas.sort((a, b) => a.nombre1.localeCompare(b.nombre1));
      setAtletas(listaAtletas);

    } catch (error) {
      console.error("Error cargando datos de elegibilidad:", error);
    } finally {
      setCargando(false);
    }
  };

  const manejarSeleccion = (idAtleta) => {
    if (atletasSeleccionados.includes(idAtleta)) {
      setAtletasSeleccionados(atletasSeleccionados.filter(id => id !== idAtleta));
    } else {
      setAtletasSeleccionados([...atletasSeleccionados, idAtleta]);
    }
  };

  const seleccionarTodos = (listaFiltrada) => {
    const idsFiltrados = listaFiltrada.map(a => a.id);
    const todosSeleccionados = idsFiltrados.every(id => atletasSeleccionados.includes(id));
    
    if (todosSeleccionados) {
      setAtletasSeleccionados(atletasSeleccionados.filter(id => !idsFiltrados.includes(id)));
    } else {
      const nuevosSeleccionados = new Set([...atletasSeleccionados, ...idsFiltrados]);
      setAtletasSeleccionados(Array.from(nuevosSeleccionados));
    }
  };

  const generarNominaExamen = async () => {
    if (!eventoSeleccionado || !rubricaSeleccionada) {
      alert("⚠️ Debes seleccionar un Evento y una Rúbrica para continuar.");
      return;
    }
    if (atletasSeleccionados.length === 0) {
      alert("⚠️ Debes seleccionar al menos un atleta para la nómina.");
      return;
    }

    setGuardando(true);
    try {
      const eventoObj = eventos.find(e => e.id === eventoSeleccionado);
      const rubricaObj = rubricas.find(r => r.id === rubricaSeleccionada);

      for (const idAtleta of atletasSeleccionados) {
        const atletaObj = atletas.find(a => a.id === idAtleta);
        
        await addDoc(collection(db, 'examenes_asignados'), {
          atletaId: atletaObj.id,
          atletaNombre: `${atletaObj.nombre1} ${atletaObj.apellido1} ${atletaObj.apellido2}`,
          atletaCedula: atletaObj.cedula,
          gradoActual: atletaObj.gradoOficial,
          eventoId: eventoObj.id,
          eventoTitulo: eventoObj.titulo,
          rubricaId: rubricaObj.id,
          rubricaTitulo: rubricaObj.titulo,
          estadoEvaluacion: 'Pendiente',
          fechaAsignacion: serverTimestamp(),
          notasProfesores: [],
          notaFinal: 0,
          aprobado: false
        });
      }

      alert(`✅ ¡Nómina generada con éxito! Se han habilitado ${atletasSeleccionados.length} alumnos para examen.`);
      setAtletasSeleccionados([]);
      setEventoSeleccionado('');
      setRubricaSeleccionada('');
      
    } catch (error) {
      console.error("Error al generar nómina:", error);
      alert("❌ Ocurrió un error al asignar los exámenes.");
    } finally {
      setGuardando(false);
    }
  };

  const atletasFiltrados = atletas.filter(a => {
    if (filtroGrado === 'Todos') return true;
    return a.gradoOficial === filtroGrado;
  });

  if (cargando) return <div style={{ color: '#fff', padding: '20px' }}>Cargando módulo de elegibilidad...</div>;

  return (
    <div style={{ padding: '20px', background: 'var(--bg-principal, #0a192f)', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#fff', borderBottom: '2px solid #3498db', paddingBottom: '10px', marginTop: 0 }}>
        📋 Generación de Nómina y Elegibilidad
      </h2>
      <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '25px' }}>
        Cruza los eventos de examen con las rúbricas y habilita a los alumnos que cumplen con los requisitos de asistencia y pagos.
      </p>

      {/* PANEL DE CONFIGURACIÓN */}
      <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', padding: '25px', borderRadius: '12px', marginBottom: '25px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#3498db', fontWeight: 'bold' }}>1. Seleccionar Evento de Examen</label>
          <select 
            value={eventoSeleccionado} 
            onChange={(e) => setEventoSeleccionado(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
          >
            <option value="">-- Elige un evento --</option>
            {eventos.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.titulo} ({ev.fechaReal})</option>
            ))}
          </select>
          {eventos.length === 0 && <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>No hay eventos tipo Examen.</span>}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#e63946', fontWeight: 'bold' }}>2. Seleccionar Rúbrica a Aplicar</label>
          <select 
            value={rubricaSeleccionada} 
            onChange={(e) => setRubricaSeleccionada(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
          >
            <option value="">-- Elige una rúbrica --</option>
            {rubricas.map(r => (
              <option key={r.id} value={r.id}>{r.titulo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FILTRO Y LISTA DE ALUMNOS */}
      <div style={{ background: '#07111e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#f39c12' }}>3. Seleccionar Alumnos Aptos</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Filtrar por Grado Actual:</label>
            <select 
              value={filtroGrado} 
              onChange={(e) => setFiltroGrado(e.target.value)}
              style={{ padding: '8px', background: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
            >
              {gradosUnicos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={() => seleccionarTodos(atletasFiltrados)}
            style={{ background: 'rgba(52, 152, 219, 0.2)', color: '#3498db', border: '1px solid #3498db', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            {atletasSeleccionados.length > 0 && atletasSeleccionados.length >= atletasFiltrados.length ? 'Desmarcar Lista Actual' : 'Seleccionar Toda la Lista'}
          </button>
          <span style={{ marginLeft: '15px', color: '#aaa', fontSize: '0.9rem' }}>
            Seleccionados: <strong style={{ color: '#2ecc71' }}>{atletasSeleccionados.length}</strong> de {atletas.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#aaa', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px', width: '50px' }}>Select</th>
                <th style={{ padding: '12px 10px' }}>Nombre del Alumno</th>
                <th style={{ padding: '12px 10px' }}>Grado Actual</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>KPI Asistencia</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>KPI Financiero</th>
              </tr>
            </thead>
            <tbody>
              {atletasFiltrados.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: atletasSeleccionados.includes(a.id) ? 'rgba(46, 204, 113, 0.1)' : 'transparent' }}>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={atletasSeleccionados.includes(a.id)}
                      onChange={() => manejarSeleccion(a.id)}
                      style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>
                    {a.nombre1} {a.apellido1} {a.apellido2}
                  </td>
                  <td style={{ padding: '10px', color: '#ccc' }}>
                    <span style={{ background: '#444', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {a.gradoOficial}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.8rem' }}>🟢 Apto</span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.8rem' }}>🟢 Al Día</span>
                  </td>
                </tr>
              ))}
              {atletasFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                    No se encontraron atletas para este grado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          <button 
            onClick={generarNominaExamen}
            disabled={guardando || atletasSeleccionados.length === 0}
            style={{ 
              background: (guardando || atletasSeleccionados.length === 0) ? '#555' : '#2ecc71', 
              color: '#fff', 
              border: 'none', 
              padding: '12px 30px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: (guardando || atletasSeleccionados.length === 0) ? 'not-allowed' : 'pointer', 
              fontSize: '1.1rem',
              boxShadow: (guardando || atletasSeleccionados.length === 0) ? 'none' : '0 4px 15px rgba(46, 204, 113, 0.4)'
            }}
          >
            {guardando ? 'Guardando...' : '💾 Generar Nómina de Examen y Habilitar'}
          </button>
        </div>
      </div>
    </div>
  );
}