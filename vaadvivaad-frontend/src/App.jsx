import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Landing from "./Pages/Landing";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Page404 from "./Pages/Page404";
const Dashboard = lazy(() => import("./Pages/Dashboard"));

import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import useAuthStore from "./store/authStore";
import { useSession } from "./hooks/useSession";
const Case = lazy(() => import("./Pages/Case"));
const Contact = lazy(() => import("./Pages/Contact"));
const CaseDetails = lazy(() => import("./Pages/CaseDetails"));
import PublicRoute from "./components/PublicRoute";
const Terms = lazy(() => import("./Pages/Terms"));
const Privacy = lazy(() => import("./Pages/Privacy"));

// ... existing imports

function App() {
  // One server-side session check per load; routes wait on it.
  useSession();
  const { role } = useAuthStore((state) => state);

  return (
    <>
    <ToastContainer position="top-right" theme="colored" autoClose={3500} newestOnTop />
    <Suspense fallback={<div className="min-h-screen" />}>
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />

        <Route
          path="login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        <Route path="contact" element={<Contact />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
      </Route>

      {/* Protected Routes */}
      <Route>
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/case"
          element={
            <ProtectedRoute>
              <Case />
            </ProtectedRoute>
          }
        />

        <Route
          path="/case/:id"
          element={
            <ProtectedRoute>
              <CaseDetails />
            </ProtectedRoute>
          }
        />

      </Route>

      {/* Catch-All Route */}
      <Route path="*" element={<Page404 />} />
    </Routes>
    </Suspense>
    </>
  );
}

export default App;
