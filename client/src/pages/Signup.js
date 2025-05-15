import React, { useState, Suspense, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
  </div>
);

// 회원가입 폼 스켈레톤
const SignupFormSkeleton = () => (
  <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-xl p-8 border border-indigo-100 animate-pulse">
    <div className="flex flex-col items-center">
      <div className="w-40 h-12 bg-gray-200 rounded"></div>
      <div className="w-32 h-4 mt-2 bg-gray-100 rounded"></div>
    </div>
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="w-full h-10 bg-gray-200 rounded-t-md"></div>
        <div className="w-full h-10 bg-gray-200"></div>
        <div className="w-full h-10 bg-gray-200 rounded-b-md"></div>
      </div>
      <div className="w-full h-10 bg-blue-200 rounded-md"></div>

      <div className="flex items-center justify-between">
        <div className="w-48 h-4 bg-indigo-100 rounded"></div>
      </div>
    </div>
  </div>
);

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { signup, error } = useAuth();
  const navigate = useNavigate();

  // 페이지 로딩 시뮬레이션 (실제로는 필요 없을 수 있음)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signup(formData);
    setIsLoading(false);

    if (result.success) {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-sky-100 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<SignupFormSkeleton />}>
        {isPageLoading ? (
          <SignupFormSkeleton />
        ) : (
          <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-xl p-8 border border-indigo-100">
            <div>
              <h1 className="mt-2 text-center text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 font-pacifico transform hover:scale-105 transition-all duration-300">
                Netless
              </h1>
              <p className="mt-2 text-center text-sm text-gray-600 font-quicksand">
                새로운 연결을 시작하세요
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="이메일"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="username" className="sr-only">
                    사용자 이름
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="사용자 이름"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-md"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">가입 중...</span>
                    </span>
                  ) : (
                    "회원가입"
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
                  >
                    이미 계정이 있으신가요? 로그인
                  </Link>
                </div>
              </div>
            </form>
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default Signup;
