import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

import '../App.css'; 

import logoDaeji from '../assets/logo-letras.png';
import videoIntro from '../assets/intro.mp4';
import imgMision from '../assets/bienvenida/mision.png';
import imgvision from '../assets/bienvenida/vision.jpeg'; 

// fotos atletas
import fotoZoe from '../assets/atletas/zoe.jpeg';
import fotonene from '../assets/atletas/kenneth.jpeg';
import fotodonovan from '../assets/atletas/donovan.jpeg';
import fotoedder from '../assets/atletas/edder.jpeg';

export default function Home() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      offset: 50, 
    });
  }, []);

  const scrollToContacto = () => {
    const contactoSection = document.getElementById('seccion-contacto');
    if (contactoSection) contactoSection.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHorarios = () => {
    const horariosSection = document.getElementById('seccion-horarios');
    if (horariosSection) horariosSection.scrollIntoView({ behavior: 'smooth' });
  };

  /* ========================================================================
     BASE DE DATOS DE ATLETAS (TUS TEXTOS ACTUALIZADOS)
     ======================================================================== */
  
  const atletasInternacionales = [
    { 
      id: 1, 
      nombre: 'Zoe Sibaja', 
      categoria: '-63 kg',
      logroPrincipal: '🥇 Campeona Centroamericana', 
      eventoPrincipal: 'CODICADER HONDURAS 2026',
      otrosLogros: [
        'Medalla de Bronce - JDN Nicoya 2024',
        '5to Lugar - JDN Limón 2025',
        'Seleccionada Nacional',
      ],
      imagen: fotoZoe
    },
    { 
      id: 2, 
      nombre: 'Donovan Ramírez',
      categoria: '+78 kg', 
      logroPrincipal: '🥈 Subcampeón Centroamericano', 
      eventoPrincipal: 'CODICADER HONDURAS 2026',
      otrosLogros: [
        'Campeón Absoluto 2025 categoría +78 kg',
        'Campeón JDN NICOYA 2024',
        'Cuarto lugar JDN Limón 2026',
        'Seleccionado Nacional',
      ],
      imagen: fotodonovan
    }
  ];

  const atletasNacionales = [
    { 
      id: 3, 
      nombre: 'Kenneth Alfaro', 
      categoria: 'Sub 21 -54 kg',
      logroPrincipal: 'Campeón JDN Limón 2026', 
      eventoPrincipal: 'Juegos Deportivos Nacionales',
      otrosLogros: [
        'Campeón Absoluto 2025 categoria -48 kg',
        'Sub Campeón JDN Nicoya 2024',
        'Seleccionado Nacional',
      ],
      imagen: fotonene
    },
    { 
      id: 4, 
      nombre: 'Edder Ramírez', 
      categoria: 'Sub 21 + 86 kg',
      logroPrincipal: 'Tercer Lugar JDN Limón 2026', 
      eventoPrincipal: 'Juegos Deportivos Nacionales',
      otrosLogros: [
        'Atleta en Desarrollo Élite',
      ],
      imagen: fotoedder 
    }
  ];

  return (
    <div className="contenedor-principal daeji-home-wrapper">
      
      <header className={`daeji-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="logo-container">
          <img src={logoDaeji} alt="Logo DAEJI" className="daeji-logo" />
        </div>
        <div>
          <button className="daeji-btn-acceso" onClick={() => navigate('/login')}>
            🔒 ACCESO AUTORIZADO
          </button>
        </div>
      </header>
      
      <main className="daeji-hero">
        <div className="daeji-overlay"></div>
        <video src={videoIntro} autoPlay loop muted playsInline className="daeji-video-bg"></video>
        
        <div className="daeji-hero-content" data-aos="fade-up">
          <img src={logoDaeji} alt="DAEJI" className="daeji-logo-hero" />
          <h1 className="daeji-title">DISCIPLINA, RESPETO Y SUPERACIÓN</h1>
          <p className="daeji-subtitle">Escuela de Taekwondo y Formación Deportiva Integral</p>
          
          <div className="daeji-hero-buttons">
            <button className="daeji-btn-primary" onClick={scrollToContacto}>SOLICITAR PREINSCRIPCIÓN</button>
            <button className="daeji-btn-outline" onClick={scrollToHorarios}>CONOCER HORARIOS</button>
          </div>
        </div>
      </main>

      <section className="daeji-section daeji-dark" id="quienes-somos">
        <div className="daeji-container">
          <div className="daeji-center-text" data-aos="fade-up">
            <h2 className="daeji-h2">NUESTRA ESENCIA</h2>
            <div className="daeji-line"></div>
            <p className="daeji-p">
              Fundada en 2017, la <strong>Escuela de Taekwondo DAEJI</strong>, bajo la dirección técnica de <strong>Jaime Roberto Sibaja Campos</strong>, se enfoca en la pedagogía deportiva, el acondicionamiento físico y la formación integral a través del arte marcial.
            </p>
          </div>
          
          <div className="daeji-grid-2 daeji-mt-4">
            <div className="daeji-card-glass" data-aos="fade-right">
              <img src={imgMision} alt="Misión" className="daeji-card-img" loading="lazy" />
              <div className="daeji-card-body">
                <h3>Nuestra Misión</h3>
                <p>Formar atletas y ciudadanos ejemplares mediante la disciplina y marcialidad del Taekwondo, promoviendo el respeto y la superación personal en cada entrenamiento.</p>
              </div>
            </div>
            
            <div className="daeji-card-glass" data-aos="fade-left">
              <img src={imgvision} alt="Visión" className="daeji-card-img" loading="lazy" />
              <div className="daeji-card-body">
                <h3>Nuestra Visión</h3>
                <p>Ser la escuela líder y referente en desarrollo deportivo y marcial dentro de nuestro cantón, brindando excelencia en cada etapa de aprendizaje de nuestros estudiantes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="daeji-section daeji-values">
        <div className="daeji-container">
          <div className="daeji-grid-4">
            <div className="daeji-value-item" data-aos="fade-up">
              <span className="daeji-icon">🥋</span>
              <h4>DISCIPLINA</h4>
              <p>El pilar de todo logro.</p>
            </div>
            <div className="daeji-value-item" data-aos="fade-up" data-aos-delay="100">
              <span className="daeji-icon">🤝</span>
              <h4>RESPETO</h4>
              <p>Hacia el dojang y uno mismo.</p>
            </div>
            <div className="daeji-value-item" data-aos="fade-up" data-aos-delay="200">
              <span className="daeji-icon">🛡️</span>
              <h4>LEALTAD</h4>
              <p>Compromiso con el equipo.</p>
            </div>
            <div className="daeji-value-item" data-aos="fade-up" data-aos-delay="300">
              <span className="daeji-icon">📈</span>
              <h4>SUPERACIÓN</h4>
              <p>Mejorar 1% todos los días.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="daeji-section daeji-dark" id="seccion-horarios">
        <div className="daeji-container">
          <h2 className="daeji-h2 daeji-center-text" data-aos="fade-up">PROGRAMAS Y HORARIOS</h2>
          <div className="daeji-line daeji-center-box" data-aos="fade-up"></div>
          
          <div className="daeji-grid-2 daeji-mt-4">
            {/* ETAPAS DE DESARROLLO */}
            <div className="daeji-panel" data-aos="fade-right">
              <h3 className="daeji-h3-blue">ETAPAS DE DESARROLLO</h3>
              <ul className="daeji-list">
                <li><strong>👶 PEEWEE:</strong> Coordinación y disciplina inicial.</li>
                <li><strong>👦 INFANTILES:</strong> Fundamentos técnicos y valores.</li>
                <li><strong>🧑 JUVENILES/MAYORES:</strong> Desarrollo avanzado y combate.</li>
                <li><strong>🥋 ÉLITE:</strong> Preparación competitiva (Kyorugui / Poomsae).</li>
              </ul>
            </div>

            {/* AGENDA DE ENTRENAMIENTO (Sede Principal) */}
            <div className="daeji-panel" data-aos="fade-left">
              <h3 className="daeji-h3-blue">AGENDA DE ENTRENAMIENTO</h3>
              <div className="daeji-alert-red">📍 Sede: Salón Comunal Garabito, León XIII, Tibás.</div>
              
              <div className="daeji-schedule">
                <h4>Lunes a Jueves</h4>
                <div className="daeji-row"><span>Peewee</span> <span>Lunes y Jueves 6:00 PM</span></div>
                <div className="daeji-row"><span>Infantiles</span> <span>Martes y Miércoles 6:00 PM</span></div>
                <div className="daeji-row"><span>Juveniles y Mayores</span> <span>Lunes y Miércoles 7:00 PM</span></div>
                
                <h4 style={{marginTop: '15px'}}>Martes y Jueves</h4>
                <div className="daeji-row daeji-highlight">
                  <span>Élite (Kyorugui / Poomsae)</span> 
                  <span>7:00 PM - 9:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* NUEVA SEDE PRÓXIMAMENTE */}
          <div className="daeji-mt-4" style={{maxWidth: '600px', margin: '30px auto 0'}}>
            <div className="daeji-panel" data-aos="fade-up" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <h3 className="daeji-h3-blue">PRÓXIMA APERTURA</h3>
              <div className="daeji-alert-red" style={{ background: 'rgba(52, 152, 219, 0.15)', color: '#3498db' }}>
                📍 PROXIMAMENTE EN LA PEREGRINA
              </div>
              
              <div style={{ padding: '20px 10px' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🏗️</span>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>¡Muy pronto más información!</h4>
                <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                  Estamos expandiendo nuestros espacios de formación deportiva y marcial. Mantente atento a nuestras redes y anuncios oficiales.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECCIÓN ATLETAS DESTACADOS */}
      <section className="daeji-section daeji-dark">
        <div className="daeji-container">
          
          <div className="daeji-center-text" data-aos="fade-up">
            <span className="daeji-badge">EL SALTO INTERNACIONAL</span>
            <h2 className="daeji-h2" style={{marginBottom: '5px'}}>ATLETAS ÉLITE INTERNACIONALES</h2>
            <p className="daeji-p">Representación centroamericana forjada en nuestro dojang.</p>
          </div>

          {/* ATLETAS INTERNACIONALES */}
          <div className="daeji-grid-2 daeji-mt-4">
            {atletasInternacionales.map((atleta, index) => (
              <div className="daeji-flip-card daeji-flip-uniforme" data-aos="fade-up" data-aos-delay={index * 100} key={atleta.id}>
                <div className="daeji-flip-card-inner">
                  
                  {/* FRENTE */}
                  <div className="daeji-flip-card-front">
                    <div className="daeji-atleta-photo-contenedor">
                      {atleta.imagen ? (
                        <img src={atleta.imagen} alt={atleta.nombre} className="daeji-atleta-img" />
                      ) : ( '🥋' )}
                    </div>
                    <div className="daeji-atleta-info">
                      <span className="daeji-categoria-tag">{atleta.categoria}</span>
                      <h4 style={{fontSize: '1.4rem'}}>{atleta.nombre}</h4>
                      <p className="daeji-logro-principal">{atleta.logroPrincipal}</p>
                      <span className="daeji-evento">{atleta.eventoPrincipal}</span>
                      <div className="daeji-hint-flip">Ver palmarés ↻</div>
                    </div>
                  </div>

                  {/* DORSO */}
                  <div className="daeji-flip-card-back">
                    <h4>{atleta.nombre}</h4>
                    <div className="daeji-line" style={{margin: '10px auto', width: '30px'}}></div>
                    <p style={{color: '#f1c40f', fontWeight: 'bold', marginBottom: '15px'}}>{atleta.logroPrincipal}</p>
                    <ul className="daeji-palmares-list">
                      {atleta.otrosLogros.map((logro, i) => (
                        <li key={i}>✓ {logro}</li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* ATLETAS DESTACADOS EVENTOS NACIONALES */}
          <div className="daeji-center-text daeji-mt-4" data-aos="fade-up" style={{marginTop: '60px'}}>
            <span className="daeji-badge" style={{background: '#e63946'}}>PROCESO Y DESARROLLO</span>
            <h2 className="daeji-h2" style={{fontSize: '1.4rem', marginBottom: '5px'}}>ÉLITE LOGROS NACIONALES</h2>
          </div>

          <div className="daeji-grid-2 daeji-mt-4" style={{maxWidth: '800px', margin: '30px auto 0'}}>
            {atletasNacionales.map((atleta, index) => (
              <div className="daeji-flip-card daeji-flip-uniforme" data-aos="fade-up" data-aos-delay={index * 100} key={atleta.id}>
                <div className="daeji-flip-card-inner">
                  
                  {/* FRENTE */}
                  <div className="daeji-flip-card-front">
                    <div className="daeji-atleta-photo-contenedor">
                      {atleta.imagen ? (
                        <img src={atleta.imagen} alt={atleta.nombre} className="daeji-atleta-img" />
                      ) : ( '🥋' )}
                    </div>
                    <div className="daeji-atleta-info">
                      <span className="daeji-categoria-tag" style={{background: '#3498db'}}>{atleta.categoria}</span>
                      <h4 style={{fontSize: '1.4rem'}}>{atleta.nombre}</h4>
                      <p className="daeji-logro-principal" style={{color: '#3498db'}}>{atleta.logroPrincipal}</p>
                      <span className="daeji-evento">{atleta.eventoPrincipal}</span>
                      <div className="daeji-hint-flip">Ver palmarés ↻</div>
                    </div>
                  </div>

                  {/* DORSO */}
                  <div className="daeji-flip-card-back">
                    <h4>{atleta.nombre}</h4>
                    <div className="daeji-line" style={{margin: '10px auto', width: '30px'}}></div>
                    <p style={{color: '#3498db', fontWeight: 'bold', marginBottom: '15px'}}>{atleta.logroPrincipal}</p>
                    <ul className="daeji-palmares-list">
                      {atleta.otrosLogros.map((logro, i) => (
                        <li key={i}>✓ {logro}</li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="daeji-section daeji-cta" id="seccion-contacto">
        <div className="daeji-container daeji-center-text" data-aos="zoom-in">
          <h2 className="daeji-h2" style={{fontSize: '2rem'}}>TU CAMINO PUEDE COMENZAR HOY.</h2>
          <p className="daeji-p">Únete a la familia DAEJI y descubre de lo que eres capaz.</p>
          
          <div className="daeji-grid-3 daeji-mt-4">
            <div className="daeji-contact-box">
              <span className="daeji-icon-small">📍</span>
              <strong>Dirección</strong>
              <p>Salón Comunal Garabito<br/>León XIII, Tibás</p>
            </div>
            <div className="daeji-contact-box">
              <span className="daeji-icon-small">✉️</span>
              <strong>Escuela DAEJI</strong>
              <p>Solicita tu clase de prueba al 7122-7890</p>
            </div>
            <div className="daeji-contact-box">
              <span className="daeji-icon-small">🏛️</span>
              <strong>Asociación ASOTKDT</strong>
              <p>asotkdtibas@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="daeji-footer">
        <p><strong>Escuela de Taekwondo DAEJI</strong></p>
        <p style={{color: '#888', fontSize: '0.85rem'}}>Asociación Deportiva de Taekwondo de Tibás (ADTT)</p>
      </footer>
      
    </div>
  );
}