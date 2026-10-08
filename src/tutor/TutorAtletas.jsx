import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { provinciasCR } from '../data/ubicacionesCR';

export default function TutorAtletas({ misAlumnos, cargandoAlumnos, usuarioEmail, onAtletaRegistrado, navigate }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados del Formulario
  const [cedula, setCedula] = useState('');
  const [nombre1, setNombre1] = useState('');
  const [apellido1, setApellido1] = useState('');
  const [apellido2, setApellido2] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [genero, setGenero] = useState('Masculino');
  const [foto, setFoto] = useState('');
  const [vistaPreviaFoto, setVistaPreviaFoto] = useState('');

  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('');
  const [cantonesDisponibles, setCantonesDisponibles] = useState([]);
  const [cantonSeleccionado, setCantonSeleccionado] = useState('');
  const [distritosDisponibles, setDistritosDisponibles] = useState([]);
  const [distritoSeleccionado, setDistritoSeleccionado] = useState('');
  const [otrasSenas, setOtrasSenas] = useState('');
  
  const [tipoSangre, setTipoSangre] = useState('');
  const [padecimientos, setPadecimientos] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [telefonoEmergencia, setTelefonoEmergencia] = useState('');
  const [parentescoEmergencia, setParentescoEmergencia] = useState('');

  const [grado, setGrado] = useState('Cinturón Blanco');
  const [otraAcademia, setOtraAcademia] = useState('No');
  const [nombreAcademiaAnterior, setNombreAcademiaAnterior] = useState('');
  const [profesorAnterior, setProfesorAnterior] = useState('');
  const [tiempoAcademiaAnterior, setTiempoAcademiaAnterior] = useState('');
  const [fechaIngresoDaeji, setFechaIngresoDaeji] = useState('');
  const [cargandoHacienda, setCargandoHacienda] = useState(false);

  const manejarCambioProvincia = (e) => {
    const provinciaId = e.target.value;
    setProvinciaSeleccionada(provinciaId);
    setCantonSeleccionado(''); setDistritoSeleccionado(''); setDistritosDisponibles([]);
    const provinciaEncontrada = provinciasCR.find(p => p.id === provinciaId);
    setCantonesDisponibles(provinciaEncontrada ? provinciaEncontrada.cantones : []);
  };

  const manejarCambioCanton = (e) => {
    const cantonId = e.target.value;
    setCantonSeleccionado(cantonId);
    setDistritoSeleccionado('');
    const cantonEncontrado = cantonesDisponibles.find(c => c.id === cantonId);
    setDistritosDisponibles(cantonEncontrado ? cantonEncontrado.distritos : []);
  };

  const manejarCambioFoto = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      const lector = new FileReader();
      lector.onload = (ev) => {
        const img = new Image();
        img.src = ev.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width: w, height: h } = img;
          const max = 300;
          if (w > h) { if (w > max) { h *= max / w; w = max; } } 
          else { if (h > max) { w *= max / h; h = max; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const comprimida = canvas.toDataURL('image/jpeg', 0.7);
          setFoto(comprimida);
          setVistaPreviaFoto(comprimida);
        };
      };
      lector.readAsDataURL(archivo);
    }
  };

  const buscarCedulaHacienda = async (e) => {
    const val = e.target.value;
    setCedula(val);
    if (val.length >= 9) {
      setCargandoHacienda(true);
      try {
        const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${val}`);
        const datos = await res.json();
        if (datos?.nombre) {
          const partes = datos.nombre.trim().split(' ');
          if (partes.length >= 3) {
            setApellido2(partes.pop()); setApellido1(partes.pop()); setNombre1(partes.join(' '));
          } else {
            setNombre1(datos.nombre);
          }
        }
      } catch (err) { console.log("Ingreso manual"); }
      finally { setCargandoHacienda(false); }
    }
  };

  const guardarExpediente = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      const q = query(collection(db, 'atletas'), where('cedula', '==', cedula));
      const res = await getDocs(q);
      if (!res.empty) {
        alert("⚠️ Ya existe un atleta registrado con este número de cédula.");
        setGuardando(false);
        return;
      }
      const nuevoAtleta = {
        cedula, nombre1, apellido1, apellido2, fechaNacimiento, telefono, genero, foto: foto || '',
        direccion: { provincia: provinciaSeleccionada, canton: cantonSeleccionado, distrito: distritoSeleccionado, otrasSenas },
        medico: { tipoSangre, padecimientos, lesiones },
        emergencia: { contacto: contactoEmergencia, telefono: telefonoEmergencia, parentesco: parentescoEmergencia },
        disciplina: { 
          grado, otraAcademia, fechaIngresoDaeji,
          nombreAcademiaAnterior: otraAcademia === 'Si' ? nombreAcademiaAnterior : '',
          profesorAnterior: otraAcademia === 'Si' ? profesorAnterior : '',
          tiempoAcademiaAnterior: otraAcademia === 'Si' ? tiempoAcademiaAnterior : ''
        },
        tutorEmail: usuarioEmail, fechaRegistro: new Date()
      };
      await addDoc(collection(db, 'atletas'), nuevoAtleta);
      alert("¡Atleta registrado exitosamente!");
      setMostrarFormulario(false);
      onAtletaRegistrado(); // Recargar datos
    } catch (err) {
      console.error(err); alert("Error al guardar el expediente.");
    } finally {
      setGuardando(false);
    }
  };

  if (!mostrarFormulario) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.4rem' }}>Mis Atletas Registrados</h3>
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Selecciona un atleta para ver su expediente completo</p>
          </div>
          <button className="btn-principal" onClick={() => setMostrarFormulario(true)} style={{ background: '#e63946', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}>
            + Registrar Nuevo Alumno
          </button>
        </div>

        {cargandoAlumnos ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Cargando tus atletas...</p>
        ) : misAlumnos.length === 0 ? (
          <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', textAlign: 'center', padding: '50px 20px' }}>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>Aún no tienes atletas registrados en tu cuenta.</p>
            <button className="btn-secundario" onClick={() => setMostrarFormulario(true)}>Registrar mi primer alumno ahora</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {misAlumnos.map((alumno) => (
              <div 
                key={alumno.id} 
                onClick={() => navigate(`/expediente/${alumno.id}`)}
                style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '22px', cursor: 'pointer', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  {alumno.foto ? (
                    <img src={alumno.foto} alt="Atleta" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e63946' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', background: '#e63946', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem', color: '#fff' }}>
                      {alumno.nombre1 ? alumno.nombre1.charAt(0) : 'A'}
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem' }}>{alumno.nombre1} {alumno.apellido1}</h4>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(230,57,70,0.15)', color: '#e63946', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{alumno.disciplina?.grado || 'Sin Grado'}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '15px' }}>
                  <p style={{ margin: 0 }}>Cédula: <strong style={{ color: '#fff' }}>{alumno.cedula}</strong></p>
                  <p style={{ margin: 0 }}>Cuota: <strong style={{ color: '#2ecc71' }}>₡{alumno.financiera?.cuotaMensual || '0'}</strong> ({alumno.financiera?.tipoAlumno || 'Regular'})</p>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#2ecc71', fontWeight: 'bold' }}>● {alumno.estado || 'Activo'}</span>
                  <span style={{ fontSize: '0.85rem', color: '#3498db', fontWeight: 'bold' }}>Ver Expediente &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(7, 17, 30, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', maxWidth: '750px', margin: '0 auto', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '1.3rem' }}>Registrar Nuevo Expediente de Atleta</h3>
        <button onClick={() => setMostrarFormulario(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
          ✕ Cancelar
        </button>
      </div>
      
      <form onSubmit={guardarExpediente} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h4 style={{ color: '#3498db', margin: '0 0 12px 0', fontSize: '1rem' }}>1. Datos Personales y Residencia</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Cédula de Identidad {cargandoHacienda && <span style={{color: '#e63946'}}>(Consultando...)</span>}</label>
              <input type="text" required value={cedula} onChange={buscarCedulaHacienda} placeholder="Ej: 101110111" style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fotografía del Atleta</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input type="file" accept="image/*" onChange={manejarCambioFoto} style={{ width: '100%', padding: '8px', background: '#121212', borderRadius: '8px', border: '1px solid #333', color: '#fff', fontSize: '0.85rem' }} />
                {vistaPreviaFoto && <img src={vistaPreviaFoto} alt="Vista" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2ecc71' }} />}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nombre</label>
              <input type="text" required value={nombre1} onChange={(e) => setNombre1(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Primer Apellido</label>
                <input type="text" required value={apellido1} onChange={(e) => setApellido1(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Segundo Apellido</label>
                <input type="text" required value={apellido2} onChange={(e) => setApellido2(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha de Nacimiento</label>
                <input type="date" required value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Género</label>
                <select value={genero} onChange={(e) => setGenero(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Teléfono de contacto</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Provincia</label>
                <select value={provinciaSeleccionada} onChange={manejarCambioProvincia} required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                  <option value="">Seleccione...</option>
                  {provinciasCR.map((prov) => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Cantón</label>
                <select value={cantonSeleccionado} onChange={manejarCambioCanton} required disabled={!provinciaSeleccionada} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                  <option value="">Seleccione...</option>
                  {cantonesDisponibles.map((cant) => <option key={cant.id} value={cant.nombre}>{cant.nombre}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Distrito</label>
                <select value={distritoSeleccionado} onChange={(e) => setDistritoSeleccionado(e.target.value)} required disabled={!cantonSeleccionado} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                  <option value="">Seleccione...</option>
                  {distritosDisponibles.map((dist, idx) => <option key={idx} value={dist}>{dist}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Otras Señas</label>
                <input type="text" value={otrasSenas} onChange={(e) => setOtrasSenas(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ color: '#3498db', margin: '15px 0 12px 0', fontSize: '1rem' }}>2. Información Médica</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Tipo de Sangre</label>
              <input type="text" value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Padecimientos o Alergias</label>
              <input type="text" value={padecimientos} onChange={(e) => setPadecimientos(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Lesiones Previas</label>
              <input type="text" value={lesiones} onChange={(e) => setLesiones(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ color: '#3498db', margin: '15px 0 12px 0', fontSize: '1rem' }}>3. Contacto en Caso de Emergencia</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Nombre del Contacto</label>
              <input type="text" required value={contactoEmergencia} onChange={(e) => setContactoEmergencia(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Teléfono de Emergencia</label>
                <input type="tel" required value={telefonoEmergencia} onChange={(e) => setTelefonoEmergencia(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Parentesco</label>
                <input type="text" required value={parentescoEmergencia} onChange={(e) => setParentescoEmergencia(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ color: '#3498db', margin: '15px 0 12px 0', fontSize: '1rem' }}>4. Datos Académicos y Disciplina</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Grado / Cinturón Actual</label>
              <select value={grado} onChange={(e) => setGrado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                <option value="Cinturón Blanco">Cinturón Blanco (10° Gup)</option>
                <option value="Cinturón Blanco-Amarillo">Cinturón Blanco - Amarillo (9° Gup)</option>
                <option value="Cinturón Amarillo">Cinturón Amarillo (8° Gup)</option>
                <option value="Cinturón Naranja">Cinturón Naranja (7° Gup)</option>
                <option value="Cinturón Verde">Cinturón Verde (6° Gup)</option>
                <option value="Cinturón Verde-Azul">Cinturón Verde - Azul (5° Gup)</option>
                <option value="Cinturón Azul">Cinturón Azul (4° Gup)</option>
                <option value="Cinturón Azul-Rojo">Cinturón Azul - Rojo (3° Gup)</option>
                <option value="Cinturón Rojo">Cinturón Rojo (2° Gup)</option>
                <option value="Cinturón Rojo-Negro">Cinturón Rojo - Negro (1° Gup)</option>
                <option value="Cinturón Negro 1er Dan">Cinturón Negro (1er Dan)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>¿Ha pertenecido a otra academia?</label>
              <select value={otraAcademia} onChange={(e) => setOtraAcademia(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#121212', color: '#fff', border: '1px solid #333' }}>
                <option value="No">No</option>
                <option value="Si">Sí</option>
              </select>
            </div>

            {otraAcademia === 'Si' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Academia anterior</label>
                  <input type="text" value={nombreAcademiaAnterior} onChange={(e) => setNombreAcademiaAnterior(e.target.value)} style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Profesor anterior</label>
                  <input type="text" value={profesorAnterior} onChange={(e) => setProfesorAnterior(e.target.value)} style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '3px' }}>Tiempo de permanencia</label>
                  <input type="text" value={tiempoAcademiaAnterior} onChange={(e) => setTiempoAcademiaAnterior(e.target.value)} style={{ width: '100%', padding: '8px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Fecha de ingreso a DAEJI</label>
              <input type="date" required value={fechaIngresoDaeji} onChange={(e) => setFechaIngresoDaeji(e.target.value)} style={{ width: '100%', padding: '10px', background: '#121212', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={() => setMostrarFormulario(false)} style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar Atleta'}
          </button>
        </div>
      </form>
    </div>
  );
}