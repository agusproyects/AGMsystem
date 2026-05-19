import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { AuthGate } from '@/components/layout/AuthGate.jsx'
import { Auth } from '@/pages/Auth.jsx'
import { Dashboard } from '@/pages/Dashboard.jsx'
import { Ventas } from '@/pages/Ventas.jsx'
import { Compras } from '@/pages/Compras.jsx'
import { Productos } from '@/pages/Productos.jsx'
import { Clientes } from '@/pages/Clientes.jsx'
import { Proveedores } from '@/pages/Proveedores.jsx'
import { Caja } from '@/pages/Caja.jsx'
import { Reportes } from '@/pages/Reportes.jsx'
import { Ajustes } from '@/pages/Ajustes.jsx'

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<AppLayout />}>
          <Route index           element={<Dashboard />} />
          <Route path="ventas"   element={<Ventas />} />
          <Route path="compras"  element={<Compras />} />
          <Route path="productos" element={<Productos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="caja"     element={<Caja />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="ajustes"  element={<Ajustes />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}
