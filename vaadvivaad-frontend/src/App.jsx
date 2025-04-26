import { Routes, Route } from "react-router-dom";
import Landing from "./Pages/Landing";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Page404 from "./Pages/Page404";
import Dashboard from "./Pages/Dashboard";

import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import authStore from "./store/authStore"; // Zustand state for user authentication
import CasePage from "./Pages/CasePage";
import Contact from "./Pages/Contact";
function App() {
  const { role } = authStore((state) => state);

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="contact" element={<Contact/>}/>
      </Route>

      {/* Protected Routes */}
      <Route>
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/casePage"
          element={
            <ProtectedRoute>
              <CasePage/>
            </ProtectedRoute>
          }
        />
        
      </Route>

      {/* Catch-All Route */}
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
}

export default App;
