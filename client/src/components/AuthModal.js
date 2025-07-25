import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const AuthModal = ({ isOpen, onClose }) => {
  const [showSignup, setShowSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  // 회원가입 관련 추가 상태
  const [passwordError, setPasswordError] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(""); // "pending", "code_sent", "success", "fail"
  const [timer, setTimer] = useState(0);
  const [timerId, setTimerId] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: "",
        password: "",
        username: "",
        confirmPassword: "",
      });
      setShowSignup(false);
      setPasswordError("");
      setEmail("");
      setVerificationCode("");
      setIsEmailVerified(false);
      setVerificationStatus("");
      setTimer(0);
      if (timerId) {
        clearInterval(timerId);
        setTimerId(null);
      }
    }
  }, [isOpen]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [timerId]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 비밀번호 유효성 검증
  const validatePassword = (password) => {
    const errors = [];

    // 길이 검증 (8글자 이상 20글자 미만)
    if (
      password.length < 8 ||
      password.length >= 20 ||
      !/[A-Z]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push(
        "비밀번호는 8글자 이상 20글자 미만, 대문자와 특수문자를 하나 이상 포함해야 합니다."
      );
    }

    return errors;
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    try {
      setVerificationStatus("pending");
      const res = await fetch(`${API_URL}/auth/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setVerificationStatus("code_sent");
        setTimer(300); // 5분(300초)
        // 타이머 시작
        if (timerId) clearInterval(timerId);
        const id = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(id);
              setVerificationStatus("");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerId(id);
        toast.success("인증번호가 발송되었습니다.");
      } else {
        setVerificationStatus("fail");
        toast.error(data.error || "인증번호 발송 실패");
      }
    } catch (err) {
      setVerificationStatus("fail");
      toast.error("인증번호 발송 중 오류 발생");
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailVerified(true);
        setVerificationStatus("success");
        if (timerId) clearInterval(timerId);
        toast.success("이메일 인증이 완료되었습니다!");
      } else {
        setVerificationStatus("fail");
        toast.error(data.error || "인증 실패");
      }
    } catch (err) {
      setVerificationStatus("fail");
      toast.error("인증 중 오류 발생");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      toast.success("로그인 성공!");
      onClose();
      // OAuth처럼 환경변수 사용
      const clientUrl =
        process.env.REACT_APP_CLIENT_URL || "http://localhost:3000";
      window.location.href = `${clientUrl}/posts`;
    } else {
      toast.error(result.error || "로그인에 실패했습니다.");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 비밀번호 유효성 검증
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      setPasswordError(passwordErrors.join(" "));
      return;
    }

    if (!isEmailVerified) {
      toast.error("이메일 인증을 완료해주세요.");
      return;
    }

    setPasswordError("");
    setLoading(true);

    const result = await signup(formData);
    setLoading(false);

    if (result.success) {
      toast.success("회원가입 성공!");
      onClose();
    }
  };

  // 소셜 로그인 처리 함수
  const handleSocialLogin = (provider) => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  // 로딩 스피너 컴포넌트
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center">
      <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      className="flex fixed inset-0 z-50 justify-center items-center px-4 py-12 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="p-8 space-y-8 w-full max-w-md bg-white rounded-xl border border-indigo-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!showSignup ? (
          // 로그인 폼
          <>
            <div className="flex justify-between items-center">
              <div className="flex-1 text-center">
                <h1 className="mt-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 transform font-pacifico hover:scale-105">
                  Netless
                </h1>
                <p className="mt-2 text-sm text-center text-gray-600 font-quicksand">
                  경계 없는 소통의 시작
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 rounded-full transition-colors hover:text-gray-600 hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="email" className="sr-only">
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none rounded-t-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="이메일"
                    value={formData.email}
                    onChange={handleInputChange}
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
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none rounded-b-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex relative justify-center px-4 py-2 w-full text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md border border-transparent shadow-md transition-all duration-200 group hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">로그인 중...</span>
                    </span>
                  ) : (
                    "로그인"
                  )}
                </button>
              </div>

              {/* 소셜 로그인 버튼 */}
              <div className="mt-6">
                <div className="relative">
                  <div className="flex absolute inset-0 items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="flex relative justify-center text-sm">
                    <span className="px-2 text-gray-500 bg-white">
                      소셜 계정으로 로그인
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin("google")}
                      className="inline-flex justify-center px-4 py-2 w-full text-sm font-medium text-gray-600 bg-white rounded-md border border-gray-300 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                    >
                      <svg
                        className="mr-2 w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                      </svg>
                      Google
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin("kakao")}
                      className="inline-flex justify-center px-4 py-2 w-full text-sm font-medium text-gray-800 bg-yellow-300 rounded-md border border-gray-300 shadow-sm transition-colors duration-200 hover:bg-yellow-400"
                    >
                      <svg
                        className="mr-2 w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 3C7.0375 3 3 6.15643 3 10.0455C3 12.5652 4.67125 14.7389 7.1025 15.9031C6.93 16.5061 6.3525 18.5516 6.27 18.8531C6.27 18.8531 6.25125 19.0414 6.3675 19.1121C6.48375 19.1828 6.6525 19.1121 6.6525 19.1121C7.0725 19.0414 9.4575 17.3711 10.0312 16.952C10.6575 17.0473 11.31 17.0914 12 17.0914C16.9625 17.0914 21 13.9345 21 10.0455C21 6.15643 16.9625 3 12 3Z" />
                      </svg>
                      카카오
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setShowSignup(true)}
                    className="font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
                  >
                    회원가입
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          // 회원가입 폼
          <>
            <div className="flex justify-between items-center">
              <div className="flex-1 text-center">
                <h1 className="mt-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 transform font-pacifico hover:scale-105">
                  Netless
                </h1>
                <p className="mt-2 text-sm text-center text-gray-600 font-quicksand">
                  새로운 연결을 시작하세요
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 rounded-full transition-colors hover:text-gray-600 hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSignup}>
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="signup-email" className="sr-only">
                    이메일
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        className="px-3 py-2 pr-24 w-full rounded border"
                        placeholder="이메일을 입력하세요"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }));
                        }}
                        disabled={isEmailVerified}
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={
                          !email ||
                          isEmailVerified ||
                          verificationStatus === "pending"
                        }
                        className="absolute right-2 top-1/2 px-2 py-1 text-sm text-white bg-blue-500 rounded shadow transition-all -translate-y-1/2 hover:bg-blue-600 disabled:bg-gray-300"
                        style={{ minWidth: 80 }}
                      >
                        인증번호 요청
                      </button>
                    </div>
                  </div>
                </div>
                {verificationStatus === "code_sent" && !isEmailVerified && (
                  <div className="flex items-center mt-2 space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="px-3 py-2 pr-20 w-full rounded border"
                        placeholder="인증번호 입력"
                      />
                      <span className="absolute right-3 top-1/2 text-xs text-gray-500 -translate-y-1/2 select-none">
                        {Math.floor(timer / 60)}:
                        {(timer % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="px-2 py-1 text-sm text-white bg-green-500 rounded shadow transition-all hover:bg-green-600"
                      style={{ minWidth: 60 }}
                    >
                      인증 확인
                    </button>
                  </div>
                )}
                {isEmailVerified && (
                  <div className="mt-2 text-sm text-green-600">
                    이메일 인증 완료!
                  </div>
                )}
                <div>
                  <label htmlFor="signup-password" className="sr-only">
                    비밀번호
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="signup-confirmPassword" className="sr-only">
                    비밀번호 확인
                  </label>
                  <input
                    id="signup-confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호 확인"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="signup-username" className="sr-only">
                    사용자 이름
                  </label>
                  <input
                    id="signup-username"
                    name="username"
                    type="text"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none rounded-b-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="사용자 이름"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {passwordError && (
                <div className="text-sm text-center text-red-500">
                  {passwordError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || !isEmailVerified}
                  className="flex relative justify-center px-4 py-2 w-full text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md border border-transparent shadow-md transition-all duration-200 group hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">가입 중...</span>
                    </span>
                  ) : (
                    "회원가입"
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setShowSignup(false)}
                    className="font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
                  >
                    이미 계정이 있으신가요? 로그인
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
