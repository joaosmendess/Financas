import { Navigate, Route, Routes } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { Ajustes } from './features/ajustes/Ajustes'
import { Lancamentos } from './features/lancamentos/Lancamentos'
import { Metas } from './features/metas/Metas'
import { QuemMeDeve } from './features/quem-me-deve/QuemMeDeve'
import { VisaoGeral } from './features/visao-geral/VisaoGeral'
import { Shell } from './layout/Shell'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route index element={<VisaoGeral />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="quem-me-deve" element={<QuemMeDeve />} />
        <Route path="metas" element={<Metas />} />
        <Route path="ajustes" element={<Ajustes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
