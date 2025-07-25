import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 로그인 함수
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "로그인에 실패했습니다.");
      }

      const data = await response.json();
      setUser(data.user);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // 회원가입 함수
  const signup = async (userData) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "회원가입에 실패했습니다.");
      }

      const data = await response.json();

      // 회원가입 성공 시 사용자 정보 설정
      if (data.user) {
        setUser(data.user);
      }

      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "로그아웃에 실패했습니다.");
      }

      setUser(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // 사용자 정보 업데이트 함수 추가
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/check`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("인증 확인 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    updateUser, // 업데이트 함수 추가
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
