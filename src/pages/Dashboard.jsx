import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import logoDaeji from '../assets/logo-letras.png';

// Importamos las vistas independientes del Tutor
import TutorInicio from '../tutor/TutorInicio';
import TutorAtletas from '../tutor/TutorAtletas';
import TutorDatos from '../tutor/TutorDatos';
import TutorSeguridad from '../tutor/TutorSeguridad';

export default function Dashboard() {
  const [usuario, setUsuario] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('inicio');
  const [menuAbiertoMovil, setMenuAbiertoMovil] = useState(false);
  
  const [misAlumnos, setMisAlumnos] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(true);
  const [atletzasConAtrasos, setAtletasConAtrasos] = useState([]);

  const [permisosTutor, setPermisosTutor] = useState({
    asistencias: false,
    pagos: false,
    expedientes: true,
    evaluaciones: false,
    competencias: false,
    gestionAtletas: false,
    eventos: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    const observador = onAuthStateChanged(auth, async (usuarioActual) => {
      if (usuarioActual) {
        setUsuario(usuarioActual);
        await cargarPermisosYAlumnos(usuarioActual.email);
      } else {
        navigate('/login');
      }
    });
    return () => observador();
  }, [navigate]);

  const cargarPermisosYAlumnos = async (emailTutor) => {
    try {
      const idDoc = emailTutor.replace(/[@.]/g, '_');
      const docPermisosRef = doc(db, 'roles_usuarios', idDoc);
      const docPermisosSnap = await getDoc(docPermisosRef);

      if (docPermisosSnap.exists() && docPermisosSnap.data().permisos) {
        setPermisosTutor(docPermisosSnap.data().permisos);
      }

      const q = query(collection(db, 'atletas'), where('tutorEmail', '==', emailTutor));
      const querySnapshot = await getDocs(q);
      const lista = [];
      const mesActual = new Date().toISOString().slice(0, 7);
      const atrasados = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        lista.push({ id: docSnap.id, ...data });

        const estadoMes = data.historialPagos?.[mesActual] || 'pendiente';
        if (estadoMes === 'pendiente' && data.financiera?.tipoAlumno !== 'Becado') {
          atrasados.push(data);
        }
      });

      setMisAlumnos(lista);
      setAtletasConAtrasos(atrasados);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargandoAlumnos(false);
    }
  };

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    navigate('/');
  };

  const cambiarSeccion = (seccion) => {
    setSeccionActiva(seccion);
    setMenuAbiertoMovil(false);
  };

  if (!usuario) return <div className="contenedor-principal">Cargando...</div>;

  return (
    <div className="tutor-container" translate="no">
      
      {/* 1. ESTILOS CSS - MOBILE FIRST (Conectados a variables globales) */}
      <style>{`
        * { box-sizing: border-box; }
        .tutor-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-principal, #0a192f);
          color: var(--texto-principal, #fff);
          font-family: sans-serif;
        }

        .mobile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-secundario, #07111e);
          padding: 15px 20px;
          border-bottom: 1px solid var(--borde-color, rgba(255,255,255,0.08));
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .sidebar {
          position: fixed;
          top: 0; left: 0;
          width: 260px; height: 100vh;
          background: var(--bg-secundario, #07111e);
          border-right: 1px solid var(--borde-color, rgba(255,255,255,0.08));
          z-index: 100;
          transition: transform 0.3s ease;
          display: flex; flex-direction: column;
          padding: 20px; overflow-y: auto;
        }
        
        .sidebar.closed-mobile { transform: translateX(-100%); }

        .mobile-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 90; opacity: 0; visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .mobile-overlay.active { opacity: 1; visibility: visible; }

        .main-content {
          flex: 1; padding: 20px; width: 100%; max-width: 100vw; overflow-x: auto;
        }

        .btn-volver {
          background: transparent; border: none; color: #3498db;
          font-size: 1rem; font-weight: bold; display: flex; align-items: center; gap: 6px; cursor: pointer;
        }

        @media (min-width: 800px) {
          .tutor-container { flex-direction: row; }
          .mobile-header { display: none; }
          .sidebar.closed-mobile { transform: translateX(0); }
          .main-content { margin-left: 260px; padding: 40px; }
          .mobile-overlay { display: none; }
          .btn-cerrar-menu { display: none; }
        }
      `}</style>

      {/* 2. BARRA SUPERIOR PARA CELULARES */}
      <div className="mobile-header">
        {seccionActiva !== 'inicio' ? (
          <button key="btn-volver" onClick={() => cambiarSeccion('inicio')} className="btn-volver">
            <span style={{ fontSize: '1.2rem' }}>⬅</span> <span>Volver</span>
          </button>
        ) : (
          <button 
            key="btn-menu" onClick={() => setMenuAbiertoMovil(true)} 
            style={{ background: '#121212', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <span>☰</span>
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '85px' }} />
        </div>
      </div>

      {/* 3. CAPA OSCURA PARA EL MENÚ EN CELULARES */}
      <div 
        className={`mobile-overlay ${menuAbiertoMovil ? 'active' : ''}`} 
        onClick={() => setMenuAbiertoMovil(false)}
      ></div>

      {/* 4. BARRA LATERAL (DRAWER) */}
      <aside className={`sidebar ${!menuAbiertoMovil ? 'closed-mobile' : ''}`}>
        <div className="btn-cerrar-menu" style={{ textAlign: 'right', marginBottom: '10px' }}>
          <button onClick={() => setMenuAbiertoMovil(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <img src={logoDaeji} alt="Logo DAEJI" style={{ width: '110px', marginBottom: '10px' }} />
          <span style={{ background: 'var(--color-primario, #e63946)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', width: 'fit-content', margin: '0 auto' }}>PORTAL DE TUTOR</span>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          <button 
            onClick={() => cambiarSeccion('inicio')} 
            style={{ 
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', 
              background: seccionActiva === 'inicio' ? 'var(--color-primario, #e63946)' : 'transparent', 
              color: seccionActiva === 'inicio' ? '#fff' : '#aaa' 
            }}
          >
            <span>🏠 Inicio y Alertas</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('atletas')} 
            style={{ 
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', 
              background: seccionActiva === 'atletas' ? 'var(--color-primario, #e63946)' : 'transparent', 
              color: seccionActiva === 'atletas' ? '#fff' : '#aaa' 
            }}
          >
            <span>🥋 Mis Atletas ({misAlumnos.length})</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('datos')} 
            style={{ 
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', 
              background: seccionActiva === 'datos' ? 'var(--color-primario, #e63946)' : 'transparent', 
              color: seccionActiva === 'datos' ? '#fff' : '#aaa' 
            }}
          >
            <span>✏️ Modificar Mis Datos</span>
          </button>
          <button 
            onClick={() => cambiarSeccion('seguridad')} 
            style={{ 
              padding: '12px 15px', borderRadius: '8px', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', 
              background: seccionActiva === 'seguridad' ? 'var(--color-primario, #e63946)' : 'transparent', 
              color: seccionActiva === 'seguridad' ? '#fff' : '#aaa' 
            }}
          >
            <span>🔒 Seguridad</span>
          </button>
        </nav>
        
        <div style={{ borderTop: '1px solid var(--borde-color, rgba(255,255,255,0.08))', paddingTop: '15px' }}>
          <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.email}</p>
          <button onClick={manejarCerrarSesion} className="btn-secundario" style={{ width: '100%', fontSize: '0.85rem' }}>
            <span>CERRAR SESIÓN</span>
          </button>
        </div>
      </aside>

      {/* 5. CONTENIDO PRINCIPAL */}
      <main className="main-content">
        {seccionActiva === 'inicio' && (
          <TutorInicio 
            key="inicio"
            atletzasConAtrasos={atletzasConAtrasos}
            permisosTutor={permisosTutor}
            navigate={navigate}
          />
        )}
        {seccionActiva === 'atletas' && (
          <TutorAtletas 
            key="atletas"
            misAlumnos={misAlumnos}
            cargandoAlumnos={cargandoAlumnos}
            usuarioEmail={usuario.email}
            onAtletaRegistrado={() => cargarPermisosYAlumnos(usuario.email)}
            navigate={navigate}
          />
        )}
        {seccionActiva === 'datos' && (
          <TutorDatos 
            key="datos"
            misAlumnos={misAlumnos}
            onDatosActualizados={() => cargarPermisosYAlumnos(usuario.email)}
          />
        )}
        {seccionActiva === 'seguridad' && (
          <TutorSeguridad key="seguridad" />
        )}
      </main>
    </div>
  );
}