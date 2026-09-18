import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

export default function Pagos() {
  const [usuario, setUsuario] = useState(null);
  const [listaAtletas, setListaAtletas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Periodo seleccionado (Mes actual por defecto)
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'pendiente', 'pagado', 'exonerado', 'mora'
  const navigate = useNavigate();

  // Fecha actual para evaluar la regla del día 15
  const fechaHoy = new Date();
  const anioActual = fechaHoy.getFullYear();
  const mesActualNum = fechaHoy.getMonth() + 1; // 1-12
  const diaHoy = fechaHoy.getDate();

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarAtletasYPagos();
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [navigate]);

  const cargarAtletasYPagos = async () => {
    setCargando(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'atletas'));
      const atletas = [];
      querySnapshot.forEach((docSnap) => {
        atletas.push({ id: docSnap.id, ...docSnap.data() });
      });
      setListaAtletas(atletas);
    } catch (error) {
      console.error("Error al cargar atletas para pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  // Evaluar estado real del mes considerando la regla del inicio en agosto y el corte del día 15
  const evaluarEstadoMesParaPeriodo = (atleta, periodoStr) => {
    const esBecado = atleta.financiera?.tipoAlumno === 'Becado';
    if (esBecado) return 'exonerado';

    // REGLA: Ignorar cualquier mes anterior a agosto del año en curso o años pasados
    const [anioSel, mesSel] = periodoStr.split('-').map(Number);
    if (anioSel < 2026 || (anioSel === 2026 && mesSel < 8)) {
      // Si el sistema arranca en agosto, los meses previos se consideran cerrados o no aplican
      return 'exonerado';
    }

    const historial = atleta.historialPagos || {};
    const estadoGuardado = historial[periodoStr] || 'pendiente';

    if (estadoGuardado === 'pendiente') {
      const esMesAnterior = anioSel < anioActual || (anioSel === anioActual && mesSel < mesActualNum);
      const esMesEnCursoPasado15 = anioSel === anioActual && mesSel === mesActualNum && diaHoy > 15;

      if (esMesAnterior || esMesEnCursoPasado15) {
        return 'mora';
      }
    }

    return estadoGuardado;
  };

  // Cambiar el estado de pago para el mes seleccionado actualmente
  const cambiarEstadoPago = async (idAtleta, nuevoEstado) => {
    try {
      const atletaRef = doc(db, 'atletas', idAtleta);
      const atletaActual = listaAtletas.find(a => a.id === idAtleta);
      
      const historialPagosActual = atletaActual.historialPagos || {};
      const nuevoHistorial = {
        ...historialPagosActual,
        [mesSeleccionado]: nuevoEstado === 'mora' ? 'pendiente' : nuevoEstado
      };

      await updateDoc(atletaRef, { historialPagos: nuevoHistorial });

      setListaAtletas(prev => prev.map(a => {
        if (a.id === idAtleta) {
          return { ...a, historialPagos: nuevoHistorial };
        }
        return a;
      }));
    } catch (error) {
      console.error("Error al actualizar estado de pago:", error);
      alert("❌ Ocurrió un error al actualizar el pago.");
    }
  };

  const enviarRecordatorioCorreo = (atleta) => {
    const emailTutor = atleta.tutorEmail || '';
    if (!emailTutor) {
      alert("⚠️ Este atleta no tiene un correo de tutor registrado.");
      return;
    }
    
    const cuotaMensual = parseFloat(atleta.financiera?.cuotaMensual) || 0;

    const asunto = encodeURIComponent(`Aviso de Mensualidad Pendiente (${mesSeleccionado}) - Escuela DAEJI`);
    const cuerpo = encodeURIComponent(`Estimado tutor(a),\n\nLe recordamos de la Escuela de Taekwondo DAEJI que registra una mensualidad pendiente correspondiente al periodo: [ ${mesSeleccionado} ] del atleta ${atleta.nombre1} ${atleta.apellido1}.\nMonto pendiente: ₡${cuotaMensual.toLocaleString()}.\n\nAgradecemos regularizar su situación a la brevedad.\n\nAtentamente,\nAdministración DAEJI`);
    window.location.href = `mailto:${emailTutor}?subject=${asunto}&body=${cuerpo}`;
  };

  // Lista base excluyendo a los inactivos
  const atletasActivosFinanciera = listaAtletas.filter(atleta => atleta.estado !== 'Inactivo');

  // CÁLCULOS DE KPIs FINANCIEROS PARA EL MES SELECCIONADO
  let totalProyectado = 0;
  let totalRecaudado = 0;
  let totalPendienteOMora = 0;

  atletasActivosFinanciera.forEach(atleta => {
    if (atleta.financiera?.tipoAlumno !== 'Becado') {
      const cuota = parseFloat(atleta.financiera?.cuotaMensual) || 0;
      totalProyectado += cuota;

      const estadoMes = evaluarEstadoMesParaPeriodo(atleta, mesSeleccionado);

      if (estadoMes === 'pagado') {
        totalRecaudado += cuota;
      } else if (estadoMes === 'pendiente' || estadoMes === 'mora') {
        totalPendienteOMora += cuota;
      }
    }
  });

  const porcentajeEficiencia = totalProyectado > 0 ? Math.round((totalRecaudado / totalProyectado) * 100) : 0;

  // FILTRAR LISTA
  const atletasFiltrados = atletasActivosFinanciera.filter(atleta => {
    const estadoMesSeleccionado = evaluarEstadoMesParaPeriodo(atleta, mesSeleccionado);

    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'pendiente') return estadoMesSeleccionado === 'pendiente' || estadoMesSeleccionado === 'mora';
    return estadoMesSeleccionado === filtroEstado;
  });

  if (!usuario || cargando) {
    return <div className="contenedor-principal" style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Cargando módulo financiero...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a192f', color: '#fff', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      
      <header style={{ background: '#07111e', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '100px' }} />
          <span style={{ background: '#2ecc71', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>MÓDULO FINANCIERO</span>
        </div>
        <button className="btn-secundario" onClick={() => navigate('/dashboard')} style={{ fontSize: '0.85rem' }}>
          &larr; Volver al Panel
        </button>
      </header>

      <main style={{ maxWidth: '1150px', margin: '30px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.6rem' }}>💰 Control de Pagos y Mensualidades</h2>
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Gestión directa por periodo y corte automático (Día 15)</p>
          </div>

          <div style={{ background: 'rgba(7, 17, 30, 0.9)', padding: '10px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>Periodo a Gestionar (Mes):</label>
            <input 
              type="month" 
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              style={{ padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}
            />
          </div>
        </div>

        {/* TARJETAS DE KPIS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          
          <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Proyectado ({mesSeleccionado})</p>
            <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3498db' }}>₡{totalProyectado.toLocaleString()}</h3>
          </div>

          <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Recaudado Real</p>
            <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#2ecc71' }}>₡{totalRecaudado.toLocaleString()}</h3>
          </div>

          <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Pendiente / En Mora</p>
            <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#e74c3c' }}>₡{totalPendienteOMora.toLocaleString()}</h3>
          </div>

          <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Eficiencia de Cobro</p>
            <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#f1c40f' }}>{porcentajeEficiencia}%</h3>
          </div>

        </div>

        {/* BARRA DE FILTROS */}
        <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '15px 20px', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>Filtrar vista:</span>
            <button 
              onClick={() => setFiltroEstado('todos')}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', background: filtroEstado === 'todos' ? '#3498db' : 'rgba(255,255,255,0.05)', color: filtroEstado === 'todos' ? '#fff' : '#aaa' }}
            >
              Todos ({atletasActivosFinanciera.length})
            </button>
            <button 
              onClick={() => setFiltroEstado('pendiente')}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', background: filtroEstado === 'pendiente' ? '#e74c3c' : 'rgba(255,255,255,0.05)', color: filtroEstado === 'pendiente' ? '#fff' : '#aaa' }}
            >
              ⚠️ Pendientes / Mora ({mesSeleccionado})
            </button>
            <button 
              onClick={() => setFiltroEstado('pagado')}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', background: filtroEstado === 'pagado' ? '#2ecc71' : 'rgba(255,255,255,0.05)', color: filtroEstado === 'pagado' ? '#fff' : '#aaa' }}
            >
              ✅ Pagados
            </button>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>Mostrando {atletasFiltrados.length} registros</span>
        </div>

        {/* TABLA DE ATLETAS SIMPLIFICADA Y LIMPIA */}
        <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#3498db' }}>
                <th style={{ padding: '12px' }}>Atleta</th>
                <th style={{ padding: '12px' }}>Tipo / Cuota</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado del Mes ({mesSeleccionado})</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {atletasFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No hay atletas activos que coincidan con este filtro para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                atletasFiltrados.map((atleta) => {
                  const estadoMes = evaluarEstadoMesParaPeriodo(atleta, mesSeleccionado);
                  const esBecado = atleta.financiera?.tipoAlumno === 'Becado';

                  return (
                    <tr key={atleta.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>
                        {atleta.nombre1} {atleta.apellido1} {atleta.apellido2}
                        <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'normal' }}>Cédula: {atleta.cedula}</div>
                      </td>

                      <td style={{ padding: '12px' }}>
                        <span style={{ background: esBecado ? 'rgba(46, 204, 113, 0.15)' : 'rgba(52, 152, 219, 0.15)', color: esBecado ? '#2ecc71' : '#3498db', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {atleta.financiera?.tipoAlumno || 'Regular'}
                        </span>
                        <div style={{ fontSize: '0.8rem', color: '#2ecc71', fontWeight: 'bold', marginTop: '4px' }}>
                          ₡{atleta.financiera?.cuotaMensual || '0'}
                        </div>
                      </td>

                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <select 
                          value={estadoMes}
                          onChange={(e) => cambiarEstadoPago(atleta.id, e.target.value)}
                          style={{ 
                            padding: '8px 14px', 
                            borderRadius: '6px', 
                            fontWeight: 'bold',
                            background: estadoMes === 'pagado' ? 'rgba(46, 204, 113, 0.2)' : estadoMes === 'exonerado' ? 'rgba(52, 152, 219, 0.2)' : estadoMes === 'mora' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(243, 156, 18, 0.2)',
                            color: estadoMes === 'pagado' ? '#2ecc71' : estadoMes === 'exonerado' ? '#3498db' : estadoMes === 'mora' ? '#ff4d4d' : '#f39c12',
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="pendiente" style={{background: '#07111e', color: '#f39c12'}}>Pendiente (Al día)</option>
                          <option value="mora" style={{background: '#07111e', color: '#ff4d4d'}}>⚠️ En Mora (&gt; Día 15)</option>
                          <option value="pagado" style={{background: '#07111e', color: '#2ecc71'}}>✅ Pagado</option>
                          <option value="exonerado" style={{background: '#07111e', color: '#3498db'}}>Exonerado / Becado</option>
                        </select>
                      </td>

                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => enviarRecordatorioCorreo(atleta)}
                          style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                          title="Enviar correo de recordatorio de cobro"
                        >
                          ✉️ Enviar Recordatorio
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}