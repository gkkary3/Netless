import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  getMessagesWith,
  sendMessage,
  getUserInfo,
} from "../services/messageService";
import Header from "../components/Header";
import { toast } from "react-toastify";

// 메시지 날짜 포맷팅 함수
const formatMessageTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// 메시지 그룹화 (날짜별)
const groupMessagesByDate = (messages) => {
  const groups = {};

  messages.forEach((message) => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });

  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages,
  }));
};

// 메시지 스켈레톤 로더
const MessageSkeleton = ({ isOwnMessage }) => (
  <div
    className={`flex mb-4 ${isOwnMessage ? "justify-end" : "justify-start"}`}
  >
    {!isOwnMessage && (
      <div className="w-8 h-8 mr-2 bg-gray-200 rounded-full"></div>
    )}
    <div
      className={`px-4 py-2 rounded-lg ${
        isOwnMessage ? "bg-blue-100" : "bg-gray-100"
      } animate-pulse`}
    >
      <div className="w-20 h-4 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const MessageDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const messageEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 메시지 스크롤 처리
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 사용자 정보 불러오기
  const fetchUserInfo = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingUser(true);
      const userData = await getUserInfo(userId);

      if (userData && userData.user) {
        setOtherUser(userData.user);
      }
    } catch (err) {
      console.error("사용자 정보를 불러오는데 실패했습니다:", err);
    } finally {
      setLoadingUser(false);
    }
  }, [userId]);

  // 메시지 불러오기
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMessagesWith(userId);
      setMessages(data);

      // 상대방 정보 설정
      if (data.length > 0) {
        const message = data[0];
        setOtherUser(
          message.sender._id === user._id ? message.receiver : message.sender
        );
      } else {
        // 메시지가 없을 경우 상대방 정보를 직접 가져옴
        await fetchUserInfo();
      }

      setError(null);
    } catch (err) {
      setError("메시지를 불러오는데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, user._id, fetchUserInfo]);

  // 초기 로딩
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // 메시지 불러온 후 스크롤 아래로 이동
  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [loading, messages.length]);

  // Socket.io 이벤트 리스너 설정
  useEffect(() => {
    if (!socket || !userId) return;

    // 새 메시지 수신 시
    const handleReceiveMessage = (message) => {
      // 현재 대화 상대와의 메시지인지 확인
      const isRelevantMessage =
        (message.sender._id === userId && message.receiver._id === user._id) ||
        (message.sender._id === user._id && message.receiver._id === userId);

      if (isRelevantMessage) {
        setMessages((prevMessages) => [...prevMessages, message]);

        // 상대방이 보낸 메시지이면 읽음 처리
        if (message.sender._id === userId) {
          socket.emit("mark_conversation_as_read", {
            conversationId: message.conversationId,
            senderId: userId,
          });
        }
      }
    };

    // 메시지 전송 성공 시
    const handleMessageSent = (message) => {
      // 현재 대화 상대와의 메시지인지 확인
      if (message.receiver._id === userId) {
        setMessages((prevMessages) => [...prevMessages, message]);
        setIsSending(false);
        setNewMessage("");
      }
    };

    // 메시지 전송 오류 시
    const handleMessageError = (error) => {
      toast.error(error.error || "메시지 전송에 실패했습니다.");
      setIsSending(false);
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_error", handleMessageError);

    // 이 대화의 모든 메시지를 읽음으로 표시
    if (messages.length > 0) {
      const conversationId = messages[0].conversationId;
      socket.emit("mark_conversation_as_read", {
        conversationId,
        senderId: userId,
      });
    }

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_error", handleMessageError);
    };
  }, [socket, userId, user._id, messages]);

  // 메시지 전송 처리
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;
    if (isSending) return;

    setIsSending(true);

    try {
      if (socket && connected) {
        // Socket.io로 메시지 전송
        socket.emit("send_message", {
          receiverId: userId,
          content: newMessage,
          conversationId:
            messages.length > 0
              ? messages[0].conversationId
              : `${user._id}_${userId}`.split("_").sort().join("_"),
        });
      } else {
        // 소켓 연결이 없을 경우 REST API 사용
        const sentMessage = await sendMessage(userId, newMessage);
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessage("");
      }
    } catch (err) {
      toast.error("메시지 전송에 실패했습니다.");
      console.error(err);
      setIsSending(false);
    }
  };

  // 그룹화된 메시지
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="container max-w-2xl px-4 mx-auto py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-[calc(100vh-180px)]">
          {/* 헤더 */}
          <div className="p-4 border-b flex items-center space-x-3 bg-white">
            <button
              onClick={() => navigate("/messages")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {otherUser ? (
              <Link
                to={`/feed/${otherUser._id}`}
                className="flex items-center space-x-3 flex-1"
              >
                {otherUser.profileImage ? (
                  <img
                    src={`${API_URL}/assets/profiles/${otherUser.profileImage}`}
                    alt={otherUser.username}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      e.target.nextElementSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`items-center justify-center w-10 h-10 bg-gray-200 rounded-full ${
                    otherUser.profileImage ? "hidden" : "flex"
                  }`}
                >
                  <span className="text-md font-semibold text-gray-600">
                    {otherUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {otherUser.username}
                  </p>
                  {connected && (
                    <p className="text-xs text-green-600">온라인</p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="animate-pulse flex space-x-3 flex-1">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            )}
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 p-4 overflow-y-auto" ref={messageContainerRef}>
            {error && (
              <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              // 로딩 상태 표시
              <div>
                <MessageSkeleton isOwnMessage={false} />
                <MessageSkeleton isOwnMessage={true} />
                <MessageSkeleton isOwnMessage={false} />
                <MessageSkeleton isOwnMessage={true} />
              </div>
            ) : messages.length > 0 ? (
              // 메시지 표시
              <div>
                {groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-6">
                    <div className="flex justify-center mb-4">
                      <span className="px-3 py-1 text-xs bg-gray-200 rounded-full text-gray-600">
                        {group.date}
                      </span>
                    </div>

                    {group.messages.map((message) => {
                      const isOwnMessage = message.sender._id === user._id;

                      return (
                        <div
                          key={message._id}
                          className={`flex mb-4 ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isOwnMessage && (
                            <>
                              {message.sender.profileImage ? (
                                <img
                                  src={`${API_URL}/assets/profiles/${message.sender.profileImage}`}
                                  alt={message.sender.username}
                                  className="w-8 h-8 rounded-full mr-2"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = "none";
                                    e.target.nextElementSibling.style.display =
                                      "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`items-center justify-center w-8 h-8 bg-gray-200 rounded-full mr-2 ${
                                  message.sender.profileImage
                                    ? "hidden"
                                    : "flex"
                                }`}
                              >
                                <span className="text-xs font-semibold text-gray-600">
                                  {message.sender.username
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                            </>
                          )}

                          <div>
                            <div
                              className={`px-4 py-2 rounded-lg ${
                                isOwnMessage
                                  ? "bg-blue-500 text-white rounded-br-none"
                                  : "bg-gray-200 text-gray-800 rounded-bl-none"
                              }`}
                            >
                              {message.content}
                            </div>
                            <div
                              className={`text-xs text-gray-500 mt-1 ${
                                isOwnMessage ? "text-right" : "text-left"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                              {isOwnMessage && (
                                <span className="ml-1">
                                  {message.read ? "읽음" : "안읽음"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
            ) : (
              // 메시지 없음 표시
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>아직 대화가 없습니다.</p>
                <p className="mt-2 text-sm">첫 메시지를 보내보세요!</p>
              </div>
            )}
          </div>

          {/* 메시지 입력 영역 */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className={`px-4 py-2 text-white rounded-full ${
                  isSending || !newMessage.trim()
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessageDetail;
