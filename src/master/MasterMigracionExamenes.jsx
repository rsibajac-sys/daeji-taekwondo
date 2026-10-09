import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import Papa from 'papaparse';

export default function MasterMigracionExamenes() {
  const [rubricas, setRubricas] = useState([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState('');

  useEffect(() => {
    cargarRubricasDisponibles();
  }, []);

  const cargarRubricasDisponibles = async () => {
    try {
      const snap = await getDocs(collection(db, 'evaluaciones_rubricas'));
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setRubricas(lista);
    } catch (error) {
      console.error("Error cargando rúbricas:", error);
    }
  };

  // Plantilla CSV que incluye la columna para inyectar los sub-conceptos exactos
  const descargarPlantillaExamenesCSV = () => {
    const encabezados = [
      "cedulaAtleta", "eventoTitulo", "nombreRubrica", "gradoActual", "notaFinal", "aprobado", "fechaDecision", "notasSubConceptos"
    ];
    // Ejemplo: idConcepto_idSubConcepto:nota separados por coma
    const ejemploFila = [
      "101110111", "Examen Histórico", rubricas[0]?.titulo || "Examen Básico", "Blanco (10° Gup)", "85", "SI", "2025-12-15", "poomsae_postura:20,kyorugi_velocidad:18"
    ];
    
    const contenidoCSV = [encabezados.join(","), ejemploFila.join(",")].join("\n");
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.setAttribute("href", url);
    enlace.setAttribute("download", "plantilla_migracion_detallada_daeji.csv");
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  const iniciarMigracionExamenes = () => {
    if (!archivoSeleccionado) {
      alert("⚠️ Por favor selecciona primero un archivo CSV lleno.");
      return;
    }

    setProcesando(true);
    setProgreso("Leyendo archivo CSV detallado...");

    Papa.parse(archivoSeleccionado, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const filas = results.data;
        let examenesRegistrados = 0;
        let totalOmitidos = 0;

        for (let i = 0; i < filas.length; i++) {
          const fila = filas[i];
          setProgreso(`Procesando examen ${i + 1} de ${filas.length}...`);

          try {
            const cedula = fila.cedulaAtleta ? fila.cedulaAtleta.trim() : '';
            if (!cedula) {
              totalOmitidos++;
              continue;
            }

            // 1. Buscar al alumno por cédula
            const qAtleta = query(collection(db, 'atletas'), where('cedula', '==', cedula));
            const resultadoAtleta = await getDocs(qAtleta);

            if (resultadoAtleta.empty) {
              console.warn(`Atleta con cédula ${cedula} no encontrado. Omitido.`);
              totalOmitidos++;
              continue;
            }

            const docAtleta = resultadoAtleta.docs[0];
            const dataAtleta = docAtleta.data();
            const atletaId = docAtleta.id;
            const atletaNombre = `${dataAtleta.nombre1 || ''} ${dataAtleta.apellido1 || ''}`.trim();

            // 2. Buscar rúbrica
            const nombreRubricaBusqueda = (fila.nombreRubrica || '').trim().toLowerCase();
            const rubricaEncontrada = rubricas.find(r => r.titulo?.toLowerCase() === nombreRubricaBusqueda) || rubricas[0];
            const rubricaId = rubricaEncontrada ? rubricaEncontrada.id : 'default_rubrica';
            const notaGlobal = Number(fila.notaFinal) || 0;

            // 3. Procesar las notas de los sub-conceptos que vienen del CSV (ej: "poomsae_postura:20, kyorugi_velocidad:18")
            const detalleJuezMigracion = {};
            if (fila.notasSubConceptos && fila.notasSubConceptos.trim() !== '') {
              const pares = fila.notasSubConceptos.split(',');
              pares.forEach(par => {
                const [clave, valor] = par.split(':');
                if (clave && valor) {
                  detalleJuezMigracion[clave.trim()] = Number(valor.trim());
                }
              });
            }

            // 4. Estructura exacta compatible con el ExpedienteEvaluaciones.jsx
            const examenHistorico = {
              atletaId: atletaId,
              atletaNombre: atletaNombre,
              atletaCedula: cedula,
              gradoActual: fila.gradoActual || dataAtleta.disciplina?.grado || 'Blanco (10° Gup)',
              eventoId: 'migracion_historica_detallada',
              eventoTitulo: fila.eventoTitulo || 'Examen Histórico Detallado',
              rubricaId: rubricaId,
              rubricaTitulo: rubricaEncontrada?.titulo || 'Rúbrica Histórica',
              estadoEvaluacion: 'Completado',
              aprobado: fila.aprobado?.toUpperCase() === 'SI' || fila.aprobado === 'true' || notaGlobal >= 70,
              notaFinal: notaGlobal,
              puntosExtraAplicados: 0,
              fechaDecision: fila.fechaDecision ? new Date(fila.fechaDecision).toISOString() : new Date().toISOString(),
              notasProfesores: [
                {
                  juez: 'Tribunal Histórico (Migración Detallada)',
                  notaTotal: notaGlobal,
                  detalle: detalleJuezMigracion, // Aquí entran directamente los sub-conceptos del CSV
                  fecha: new Date().toISOString()
                }
              ]
            };

            await addDoc(collection(db, 'examenes_asignados'), examenHistorico);
            examenesRegistrados++;

          } catch (error) {
            console.error(`Error procesando examen ${i + 1}:`, error);
            totalOmitidos++;
          }
        }

        setProcesando(false);
        setProgreso('');
        alert(`🎉 ¡Migración detallada completada!\n\nExámenes cargados: ${examenesRegistrados}\nOmitidos: ${totalOmitidos}`);
      },
      error: () => {
        setProcesando5(false);
        setProgreso('');
        alert("❌ Error al leer el archivo CSV.");
      }
    });
  };

  return (
    <div style={{ padding: '20px', background: 'var(--bg-principal, #0a192f)', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#fff', borderBottom: '2px solid #e63946', paddingBottom: '10px', marginTop: 0 }}>
        📂 Migración Masiva Detallada de Exámenes
      </h2>
      <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '25px' }}>
        Sube el historial indicando de forma explícita las notas de los sub-conceptos en formato <code>idConcepto_idSubConcepto:nota</code> separados por coma.
      </p>

      {/* GUÍA DE IDs PARA LOS SUB-CONCEPTOS */}
      <div style={{ background: '#07111e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#f39c12' }}>💡 ¿Cómo redactar los sub-conceptos en el Excel?</h4>
        <p style={{ margin: '0 0 10px 0', color: '#ccc', fontSize: '0.9rem' }}>
          En la columna <code>notasSubConceptos</code> de tu CSV puedes escribir las notas combinando el ID del concepto y del sub-concepto de tu rúbrica. Por ejemplo:
        </p>
        <code style={{ background: '#111', padding: '8px 12px', borderRadius: '6px', color: '#2ecc71', display: 'block', fontSize: '0.85rem', width: 'fit-content', border: '1px solid #333' }}>
          poomsae_postura:18, kyorugi_combate:22, etiqueta_saludo:10
        </code>
        <p style={{ margin: '10px 0 0 0', color: '#888', fontSize: '0.8rem' }}>
          De esta forma, cuando el alumno despliegue su expediente, verá exactamente la nota que pusiste en cada sub-criterio.
        </p>
      </div>

      {/* ACCIONES */}
      <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', padding: '25px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        <div style={{ background: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #222', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📥</span>
          <h4 style={{ color: '#fff', margin: '0 0 10px 0' }}>Paso 1: Descargar Plantilla</h4>
          <button 
            onClick={descargarPlantillaExamenesCSV}
            style={{ background: '#3498db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
          >
            Descargar Plantilla CSV Detallada
          </button>
        </div>

        <div style={{ background: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #222', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📤</span>
          <h4 style={{ color: '#fff', margin: '0 0 10px 0' }}>Paso 2: Subir Archivo Lleno</h4>
          <input 
            type="file" accept=".csv" 
            onChange={(e) => setArchivoSeleccionado(e.target.files[0])}
            style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '15px', width: '100%' }}
          />
          <button 
            onClick={iniciarMigracionExamenes}
            disabled={procesando || !archivoSeleccionado}
            style={{ 
              background: (procesando || !archivoSeleccionado) ? '#555' : '#2ecc71', 
              color: '#fff', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: (procesando || !archivoSeleccionado) ? 'not-allowed' : 'pointer',
              width: '100%' 
            }}
          >
            {procesando ? 'Procesando...' : '🚀 Ejecutar Migración Detallada'}
          </button>
        </div>

      </div>

      {procesando && (
        <div style={{ marginTop: '20px', textAlign: 'center', background: '#07111e', padding: '15px', borderRadius: '8px', border: '1px solid #f39c12', color: '#f39c12', fontWeight: 'bold' }}>
          ⏳ {progreso}
        </div>
      )}
    </div>
  );
}