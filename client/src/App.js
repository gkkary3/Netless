import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Posts from "./pages/Posts";
import MyFeed from "./pages/MyFeed";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 보호된 라우트 - 인증된 사용자만 접근 가능 */}
          <Route element={<ProtectedRoute />}>
            <Route path="/posts" element={<Posts />} />
            <Route path="/my-feed" element={<MyFeed />} />
            <Route path="/feed/:userId" element={<MyFeed />} />
          </Route>

          {/* 공개 라우트 - 인증되지 않은 사용자만 접근 가능 */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* 기본 리디렉션 */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>

        {/* 토스트 알림 컨테이너 */}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
