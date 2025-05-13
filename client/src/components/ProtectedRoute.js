import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 인증이 필요한 라우트를 위한 컴포넌트
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 로딩 중일 때는 로딩 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        로딩 중...
      </div>
    );
  }

  // 인증되지 않은 사용자는 로그인 페이지로 리디렉션
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 인증된 사용자는 자식 컴포넌트 렌더링
  return <Outlet />;
};

export default ProtectedRoute;
