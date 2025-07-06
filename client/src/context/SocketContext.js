import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { user } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  useEffect(() => {
    // 인증된 사용자만 소켓에 연결
    if (user) {
      const socketInstance = io(API_URL, {
        withCredentials: true, // 쿠키를 포함한 요청 설정
        autoConnect: true, // 자동 연결 설정
        reconnection: true, // 재연결 시도 설정
        reconnectionAttempts: 5, // 최대 재연결 시도 횟수
        reconnectionDelay: 1000, // 재연결 시도 간격 (밀리초)
      });

      // 소켓 연결 이벤트 처리
      socketInstance.on("connect", () => {
        console.log("소켓 연결됨");
        setConnected(true);
        setReconnecting(false);
      });

      socketInstance.on("disconnect", () => {
        console.log("소켓 연결 끊김");
        setConnected(false);
      });

      socketInstance.on("reconnect_attempt", (attemptNumber) => {
        console.log(`재연결 시도 ${attemptNumber}`);
        setReconnecting(true);
      });

      socketInstance.on("reconnect_failed", () => {
        console.log("재연결 실패");
        setReconnecting(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("연결 오류:", error.message);
      });

      // 온라인 상태 이벤트 리스너
      socketInstance.on("user_online", ({ userId }) => {
        setOnlineUsers((prev) => new Set([...prev, userId]));
      });

      socketInstance.on("user_offline", ({ userId }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // 초기 온라인 사용자 목록 수신
      socketInstance.on("online_users_list", ({ onlineUsers }) => {
        setOnlineUsers(new Set(onlineUsers));
      });

      setSocket(socketInstance);

      // 정리 함수
      return () => {
        socketInstance.disconnect();
      };
    } else {
      // 로그아웃 시 소켓 연결 해제
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user, API_URL]);

  // 컨텍스트 값
  const value = {
    socket,
    connected,
    reconnecting,
    onlineUsers,
    isUserOnline: (userId) => onlineUsers.has(userId),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
