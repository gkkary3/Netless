import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  getConversations,
  searchUsers,
  deleteConversation,
} from "../services/messageService";
import Header from "../components/Header";
import { toast } from "react-toastify";

// 대화 목록 스켈레톤 로더
const ConversationSkeleton = () => (
  <div className="flex items-center p-3 mb-2 space-x-3 bg-white rounded-lg shadow animate-pulse">
    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
    <div className="flex-1 space-y-2">
      <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
      <div className="w-2/3 h-3 bg-gray-100 rounded"></div>
    </div>
    <div className="w-4 h-4 bg-gray-100 rounded-full"></div>
  </div>
);

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const { user } = useAuth();
  const { socket, connected, isUserOnline } = useSocket();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 대화 목록 불러오기
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
      setError(null);
    } catch (err) {
      setError("대화 목록을 불러오는데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 친구 목록 불러오기
  const fetchFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      // user-friends 엔드포인트로 변경 (실제 친구 목록을 가져오는 API)
      const response = await fetch(`${API_URL}/friends/user-friends`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("친구 목록 데이터:", data);

        if (data.success && data.friends && data.friends.length > 0) {
          // 친구 ID 목록을 받아옴
          const friendIds = data.friends;

          // 친구 ID를 이용해 실제 사용자 정보를 가져옴
          const allUsersResponse = await fetch(`${API_URL}/friends`, {
            credentials: "include",
          });

          if (allUsersResponse.ok) {
            const allUsersData = await allUsersResponse.json();
            console.log("모든 사용자 데이터:", allUsersData);

            if (allUsersData.success && allUsersData.users) {
              // 친구 ID에 해당하는 사용자만 필터링
              const friendUsers = allUsersData.users.filter((user) =>
                friendIds.includes(user._id)
              );

              setFriendsList(
                friendUsers.map((f) => ({
                  _id: f._id,
                  username: f.username,
                  email: f.email,
                  profileImage: f.profileImage,
                  isFriend: true,
                  hasValidProfileImage:
                    f.profileImage &&
                    typeof f.profileImage === "string" &&
                    f.profileImage.trim() !== "",
                }))
              );
            }
          }
        } else {
          setFriendsList([]);
        }
      }
    } catch (err) {
      console.error("친구 목록 불러오기 오류:", err);
      setFriendsList([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [API_URL]);

  // 초기 로딩
  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, [fetchConversations, fetchFriends]);

  // Socket.io 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) return;

    // 새 메시지 수신 시
    const handleReceiveMessage = (message) => {
      setConversations((prevConversations) => {
        const conversationId = message.conversationId;
        const existingConversationIndex = prevConversations.findIndex(
          (conv) => conv.conversationId === conversationId
        );

        if (existingConversationIndex >= 0) {
          // 기존 대화 업데이트
          const updatedConversations = [...prevConversations];
          const conversation = {
            ...updatedConversations[existingConversationIndex],
          };

          // 현재 접속한 사용자가 수신자인 경우에만 안 읽은 메시지 카운트 증가
          if (message.receiver._id === user._id) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }

          conversation.lastMessage = message.content;
          conversation.lastMessageDate = message.createdAt;

          // 대화 목록에서 제거하고 맨 위에 추가
          updatedConversations.splice(existingConversationIndex, 1);
          return [conversation, ...updatedConversations];
        } else {
          // 새 대화 추가
          const otherUser =
            message.sender._id === user._id ? message.receiver : message.sender;
          const newConversation = {
            conversationId,
            otherUser: {
              _id: otherUser._id,
              username: otherUser.username,
              profileImage: otherUser.profileImage,
            },
            lastMessage: message.content,
            lastMessageDate: message.createdAt,
            unreadCount: message.sender._id === user._id ? 0 : 1,
          };
          return [newConversation, ...prevConversations];
        }
      });
    };

    // 대화가 읽음 처리되었을 때
    const handleConversationRead = ({ conversationId, readBy }) => {
      if (readBy !== user._id) {
        setConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            if (conv.conversationId === conversationId) {
              return { ...conv, unreadCount: 0 };
            }
            return conv;
          });
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("conversation_read", handleConversationRead);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_read", handleConversationRead);
    };
  }, [socket, user]);

  // 사용자 검색
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);

      // 로컬에서 친구 목록을 검색하여 필터링하도록 변경
      if (friendsList.length > 0) {
        const filteredFriends = friendsList.filter(
          (friend) =>
            friend.username.toLowerCase().includes(query.toLowerCase()) ||
            (friend.email &&
              friend.email.toLowerCase().includes(query.toLowerCase()))
        );

        console.log("친구 목록에서 검색 결과:", filteredFriends);
        setSearchResults(filteredFriends);
      } else {
        // 친구 목록이 없는 경우에는 서버에서 친구만 검색해오도록 조정
        const results = await searchUsers(query + "?onlyFriends=true");
        console.log("서버 검색 결과:", results);

        const processedResults = results.map((user) => {
          const hasProfileImage =
            user.profileImage &&
            typeof user.profileImage === "string" &&
            user.profileImage.trim() !== "";

          return {
            ...user,
            hasValidProfileImage: hasProfileImage,
            isFriend: true,
          };
        });

        setSearchResults(processedResults);
      }
    } catch (err) {
      toast.error("사용자 검색에 실패했습니다.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // 대화 시작하기 토글
  const toggleNewMessage = () => {
    setShowNewMessage(!showNewMessage);
    if (!showNewMessage) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // 대화 삭제 처리
  const handleDeleteConversation = async (e, conversationId) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("정말로 이 대화를 삭제하시겠습니까?")) {
      setDeletingConversationId(conversationId);

      try {
        await deleteConversation(conversationId);
        setConversations((prevConversations) =>
          prevConversations.filter(
            (conv) => conv.conversationId !== conversationId
          )
        );
        toast.success("대화가 삭제되었습니다.");
      } catch (err) {
        toast.error("대화 삭제에 실패했습니다.");
        console.error(err);
      } finally {
        setDeletingConversationId(null);
      }
    }
  };

  // 사용자 또는 친구 항목 렌더링
  const renderUserItem = (user) => (
    <Link
      key={user._id}
      to={`/messages/${user._id}`}
      className="flex items-center p-2 space-x-3 transition-colors rounded-md hover:bg-gray-50"
    >
      <div className="relative flex-shrink-0">
        {user.hasValidProfileImage ? (
          <img
            src={`${API_URL}/assets/profiles/${user.profileImage}`}
            alt={user.username}
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
            user.hasValidProfileImage ? "hidden" : "flex"
          }`}
        >
          <span className="text-sm font-semibold text-gray-600">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        {user.isFriend && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
        )}
        {/* 온라인 상태 표시 */}
        {isUserOnline(user._id) && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>
        )}
      </div>
      <div>
        <p className="font-medium text-gray-800">{user.username}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="container max-w-2xl px-4 mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">메시지</h1>
          <button
            onClick={toggleNewMessage}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showNewMessage ? "닫기" : "새 메시지"}
          </button>
        </div>

        {showNewMessage && (
          <div className="p-4 mb-6 bg-white rounded-lg shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-700">
              새 메시지 보내기
            </h2>
            <div className="mb-4">
              <label
                htmlFor="search"
                className="block mb-1 text-sm font-medium text-gray-600"
              >
                대화 상대 검색
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="이름 또는 이메일로 검색..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isSearching ? (
              <div className="p-4 text-center">
                <div className="inline-block w-6 h-6 border-2 border-gray-300 rounded-full animate-spin border-t-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 검색어가 있으면 검색 결과 표시, 없으면 친구 목록 표시 */}
                {searchQuery.trim().length >= 2 ? (
                  searchResults.length > 0 ? (
                    searchResults.map(renderUserItem)
                  ) : (
                    <p className="p-2 text-sm text-gray-500">
                      검색 결과가 없습니다.
                    </p>
                  )
                ) : (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">
                      친구 목록
                    </h3>
                    <div className="max-h-60 overflow-y-auto">
                      {loadingFriends ? (
                        <div className="p-4 text-center">
                          <div className="inline-block w-6 h-6 border-2 border-gray-300 rounded-full animate-spin border-t-blue-600"></div>
                        </div>
                      ) : friendsList.length > 0 ? (
                        friendsList.map(renderUserItem)
                      ) : (
                        <p className="p-2 text-sm text-gray-500">
                          아직 친구가 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-700">대화 목록</h2>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-100 border-b">
              {error}
            </div>
          )}

          <div className="divide-y">
            {loading ? (
              // 로딩 상태 표시
              <div className="p-4">
                <ConversationSkeleton />
                <ConversationSkeleton />
                <ConversationSkeleton />
              </div>
            ) : conversations.length > 0 ? (
              // 대화 목록 표시
              conversations.map((conversation) => (
                <div key={conversation.conversationId} className="relative">
                  <Link
                    to={`/messages/${conversation.otherUser._id}`}
                    className="flex items-center p-4 space-x-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="relative flex-shrink-0">
                      {conversation.otherUser.profileImage ? (
                        <img
                          src={`${API_URL}/assets/profiles/${conversation.otherUser.profileImage}`}
                          alt={conversation.otherUser.username}
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = "none";
                            e.target.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`items-center justify-center w-12 h-12 bg-gray-200 rounded-full ${
                          conversation.otherUser.profileImage
                            ? "hidden"
                            : "flex"
                        }`}
                      >
                        <span className="text-lg font-semibold text-gray-600">
                          {conversation.otherUser.username
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      {/* 온라인 상태 표시 */}
                      {isUserOnline(conversation.otherUser._id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between pr-8">
                        <p className="font-medium text-gray-800 truncate">
                          {conversation.otherUser.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            conversation.lastMessageDate
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-500 rounded-full">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={(e) =>
                      handleDeleteConversation(e, conversation.conversationId)
                    }
                    className="absolute right-4 top-5 p-1 text-gray-500 hover:text-red-500 transition-colors"
                    disabled={
                      deletingConversationId === conversation.conversationId
                    }
                  >
                    {deletingConversationId === conversation.conversationId ? (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin border-t-gray-500"></div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))
            ) : (
              // 대화 없음 표시
              <div className="p-8 text-center">
                <p className="text-gray-500">아직 대화가 없습니다.</p>
                <button
                  onClick={toggleNewMessage}
                  className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  새 대화 시작하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
