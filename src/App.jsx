import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Registro from './pages/Registro';
import Login from './pages/Login';
import Recuperar from './pages/Recuperar';
// 1. Importamos el Dashboard
import Dashboard from './pages/Dashboard';
import Expediente from './pages/Expediente';
import MasterDashboard from './pages/MasterDashboard';
import Asistencia from './pages/Asistencia';
import Pagos from './pages/Pagos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        {/* 2. Agregamos la ruta */}
        <Route path="/dashboard" element={<Dashboard />} />
        {/* 2. Ruta dinámica para el expediente con el ID único del alumno */}
        <Route path="/expediente/:id" element={<Expediente />} />
        <Route path="/master" element={<MasterDashboard />} />
        <Route path="/asistencia" element={<Asistencia />} />
        <Route path="/pagos" element={<Pagos />} /> {/* <-- 2. DEFINIR LA RUTA */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;