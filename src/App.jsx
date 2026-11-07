import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAuth } from './components/Skeleton';
import Landing from './pages/Landing';
import NewRequest from './pages/NewRequest';
import MyRequests from './pages/MyRequests';
import RequestDetail from './pages/RequestDetail';
import Certificate from './pages/Certificate';
import LabQueue from './pages/LabQueue';
import Dashboard from './pages/Dashboard';
import TestCatalog from './pages/TestCatalog';
import NotFound from './pages/NotFound';
import { LoginPage, SignupPage } from './pages/AuthPages';

const LAB = ['analyst', 'supervisor'];
const guard = (el, roles) => <RequireAuth roles={roles}>{el}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="new" element={guard(<NewRequest />)} />
        <Route path="requests" element={guard(<MyRequests />)} />
        <Route path="requests/:id" element={guard(<RequestDetail />)} />
        <Route path="requests/:id/coa" element={guard(<Certificate />)} />
        <Route path="lab" element={guard(<LabQueue />, LAB)} />
        <Route path="dashboard" element={guard(<Dashboard />, LAB)} />
        <Route path="catalog" element={guard(<TestCatalog />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
