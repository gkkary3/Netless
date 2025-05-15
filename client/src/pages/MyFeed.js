import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import PostItem from "../components/PostItem";
import Header from "../components/Header";
import { toast } from "react-toastify";

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
  </div>
);

// 프로필 스켈레톤 컴포넌트
const ProfileSkeleton = () => (
  <div className="p-6 bg-white rounded-lg shadow animate-pulse">
    <div className="flex flex-col items-center">
      <div className="self-end w-16 h-6 mb-2 bg-gray-200 rounded-full"></div>
      <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
      <div className="w-40 h-6 mt-3 bg-gray-200 rounded"></div>
      <div className="w-32 h-4 mt-2 bg-gray-200 rounded"></div>
      <div className="w-full h-16 px-1 py-2 mt-2 bg-gray-100 border-t border-b border-gray-100"></div>
      <div className="flex justify-center mt-4 space-x-2">
        <div className="w-24 h-8 bg-gray-200 rounded-full"></div>
        <div className="w-24 h-8 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  </div>
);

// 게시물 스켈레톤 컴포넌트
const PostsSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-4 bg-white rounded-lg shadow animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="h-24 mt-3 bg-gray-100 rounded"></div>
        <div className="flex mt-3 space-x-3">
          <div className="w-20 h-6 bg-gray-200 rounded"></div>
          <div className="w-20 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

// 친구 목록 스켈레톤 컴포넌트
const FriendsListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="flex items-center justify-between py-3 animate-pulse"
      >
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 bg-gray-200 rounded-full"></div>
          <div>
            <div className="w-32 h-5 bg-gray-200 rounded"></div>
            <div className="w-24 h-3 mt-1 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
      </div>
    ))}
  </div>
);

const MyFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [friendInfo, setFriendInfo] = useState({
    friends: [],
    friendRequests: [],
  });
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [possibleFriends, setPossibleFriends] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();

  // 현재 보고 있는 유저 ID (자신 또는 다른 사용자)
  const targetUserId = userId || user?._id;

  // 자신의 피드인지 확인
  const isOwnFeed = !userId || userId === user?._id;

  // API 기본 URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 프로필 및 게시물 정보 가져오기
  const fetchData = async () => {
    setLoading(true);
    try {
      // 사용자 정보 가져오기
      if (!isOwnFeed) {
        const userResponse = await fetch(`${API_URL}/profile/${targetUserId}`, {
          credentials: "include",
        });

        if (!userResponse.ok) {
          throw new Error("사용자 정보를 불러오는데 실패했습니다.");
        }

        const userData = await userResponse.json();
        setProfileUser(userData.user);

        // 해당 사용자의 친구 정보 가져오기
        if (userData.user) {
          try {
            const friendsResponse = await fetch(
              `${API_URL}/friends/list/${targetUserId}`,
              {
                credentials: "include",
              }
            );

            if (friendsResponse.ok) {
              const friendsData = await friendsResponse.json();
              setProfileUser((prev) => ({
                ...prev,
                friendsCount: friendsData.friends
                  ? friendsData.friends.length
                  : 0,
                friends: friendsData.friends || [],
              }));
            }
          } catch (err) {
            console.error("친구 정보 가져오기 오류:", err);
          }
        }
      }

      // 게시물 가져오기
      const postsResponse = await fetch(`${API_URL}/posts`, {
        credentials: "include",
      });

      if (!postsResponse.ok) {
        throw new Error("게시물을 불러오는데 실패했습니다.");
      }

      const postsData = await postsResponse.json();

      // 현재 보고 있는 사용자의 게시물만 필터링
      const filteredPosts = postsData.filter(
        (post) => post.author.id === targetUserId
      );
      setPosts(filteredPosts);

      // 자신의 피드일 경우에만 친구 정보 가져오기
      if (isOwnFeed) {
        await fetchFriendsInfo();
      } else {
        // 다른 사용자의 피드를 볼 때는 친구 관계 확인
        await checkFriendship();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 친구 정보 가져오기
  const fetchFriendsInfo = async () => {
    try {
      const friendsResponse = await fetch(`${API_URL}/friends/user-friends`, {
        credentials: "include",
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriendInfo({
          friends: friendsData.friends || [],
          friendRequests: friendsData.friendRequests || [],
        });

        // 알 수도 있는 사람(친구 추천) 목록 가져오기
        if (isOwnFeed) {
          fetchSuggestedPeople(
            friendsData.friends || [],
            friendsData.friendRequests || []
          );
        }
      }
    } catch (err) {
      console.error("친구 정보 로딩 에러:", err);
    }
  };

  // 알 수도 있는 사람 목록 가져오기 (친구도 아니고 친구 요청도 아닌 유저 중 랜덤 5명)
  const fetchSuggestedPeople = async (friends, friendRequests) => {
    setLoadingSuggestions(true);
    try {
      // 모든 사용자 목록 가져오기
      const response = await fetch(`${API_URL}/friends`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const allUsers = data.users || [];

        // 자신, 친구, 친구 요청 중인 사용자 제외하고 필터링
        const filtered = allUsers.filter(
          (person) =>
            person._id !== user._id &&
            !friends.includes(person._id) &&
            !friendRequests.includes(person._id)
        );

        // 랜덤으로 최대 5명 선택
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());

        setSuggestedPeople(shuffled.slice(0, Math.min(5, shuffled.length)));
      }
    } catch (err) {
      console.error("친구 추천 목록 로딩 에러:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // 친구 관계 확인 (다른 사용자 피드 볼 때)
  const checkFriendship = async () => {
    try {
      const friendsResponse = await fetch(`${API_URL}/friends/user-friends`, {
        credentials: "include",
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        const isFriend = friendsData.friends?.includes(targetUserId);
        const hasReceivedRequest =
          friendsData.friendRequests?.includes(targetUserId);

        // 내가 보낸 친구 요청인지 확인
        let hasSentRequest = false;
        if (!isFriend && !hasReceivedRequest) {
          // 대상 사용자의 정보 가져오기
          const targetUserResponse = await fetch(
            `${API_URL}/profile/${targetUserId}`,
            {
              credentials: "include",
            }
          );

          if (targetUserResponse.ok) {
            const targetUserData = await targetUserResponse.json();
            // 대상 사용자의 friendsRequests에 내 ID가 있는지 확인 (내가 친구 요청을 보냈는지)
            hasSentRequest =
              targetUserData.user.friendsRequests &&
              targetUserData.user.friendsRequests.includes(user._id);
          }
        }

        // 친구 상태 저장
        setFriendInfo({
          ...friendInfo,
          isFriend,
          hasReceivedRequest,
          hasSentRequest,
        });
      }
    } catch (err) {
      console.error("친구 관계 확인 에러:", err);
    }
  };

  useEffect(() => {
    if (targetUserId) {
      fetchData();
    }
  }, [targetUserId]);

  // 게시물 삭제 처리 함수
  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  // 게시물 수정 처리 함수
  const handleUpdatePost = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post
      )
    );
  };

  // 친구 모달 열기
  const openFriendModal = (type) => {
    setModalType(type);
    setShowFriendModal(true);
  };

  // 친구 정보 가져오기
  const fetchUserDetails = async (userIds) => {
    if (!userIds.length) return [];

    try {
      const users = await Promise.all(
        userIds.map(async (id) => {
          const response = await fetch(`${API_URL}/profile/${id}`, {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            return data.user;
          }
          return null;
        })
      );

      return users.filter(Boolean);
    } catch (err) {
      console.error("사용자 정보 가져오기 에러:", err);
      return [];
    }
  };

  // 친구 요청 보내기
  const handleSendFriendRequest = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/friends/${userId}/add-friend`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        // 성공 메시지 표시
        toast.success("친구 요청을 보냈습니다.");

        // 친구 정보 새로고침
        await fetchFriendsInfo();

        // 추천 목록에서 제거
        setSuggestedPeople((prev) =>
          prev.filter((person) => person._id !== userId)
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "친구 요청 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("친구 요청 보내기 오류:", err);
      toast.error("친구 요청 중 오류가 발생했습니다.");
    }
  };

  // 친구 요청 취소 - 내가 보낸 요청을 취소하는 함수
  const handleCancelFriendRequest = async (userId) => {
    try {
      // 여기서 현재 로그인한 사용자가 target 사용자에게 보낸 요청을 취소하는 것이므로
      // 매개변수 순서 확인 (타겟 사용자 ID, 내 ID)
      const response = await fetch(
        `${API_URL}/friends/${userId}/remove-friend-request/${user._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        if (isOwnFeed) {
          fetchFriendsInfo();
        } else {
          // 다른 사용자의 피드인 경우 - 친구 요청 취소 상태 직접 업데이트
          setFriendInfo({
            ...friendInfo,
            hasSentRequest: false,
          });
        }

        // 성공 메시지 표시
        toast.success("친구 요청을 취소했습니다.");
      }
    } catch (err) {
      console.error("친구 요청 취소 에러:", err);
      toast.error("친구 요청 취소에 실패했습니다.");
    }
  };

  // 친구 요청 거절 - 다른 사람이 보낸 요청을 거절하는 함수
  const handleRejectFriendRequest = async (userId) => {
    try {
      const response = await fetch(
        `${API_URL}/friends/${user._id}/remove-friend-request/${userId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        fetchFriendsInfo();
        toast.success("친구 요청을 거절했습니다.");
      }
    } catch (err) {
      console.error("친구 요청 거절 에러:", err);
      toast.error("친구 요청 거절에 실패했습니다.");
    }
  };

  // 친구 요청 수락
  const handleAcceptFriendRequest = async (userId) => {
    try {
      const response = await fetch(
        `${API_URL}/friends/${userId}/accept-friend-request`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        if (isOwnFeed) {
          fetchFriendsInfo();
        } else {
          // 다른 사용자의 피드인 경우 - 친구 상태 직접 업데이트
          setFriendInfo({
            ...friendInfo,
            isFriend: true,
            hasReceivedRequest: false,
            hasSentRequest: false,
          });
        }
        toast.success("친구 요청을 수락했습니다.");
      }
    } catch (err) {
      console.error("친구 요청 수락 에러:", err);
      toast.error("친구 요청 수락에 실패했습니다.");
    }
  };

  // 친구 삭제
  const handleRemoveFriend = async () => {
    if (!window.confirm("정말 이 친구를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `${API_URL}/friends/${targetUserId}/remove-friend`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        // 친구 상태 업데이트
        setFriendInfo({
          ...friendInfo,
          isFriend: false,
          hasSentRequest: false,
          hasReceivedRequest: false,
        });
      }
    } catch (err) {
      console.error("친구 삭제 에러:", err);
    }
  };

  // 친구 목록 모달 컴포넌트
  const FriendsListModal = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadUsers = async () => {
        setLoading(true);
        let userIds = [];

        if (modalType === "friends") {
          // 자신의 피드인지 다른 사용자의 피드인지에 따라 데이터 소스 변경
          userIds = isOwnFeed ? friendInfo.friends : profileUser?.friends || [];
        } else if (modalType === "requests") {
          userIds = friendInfo.friendRequests;
        }

        const userDetails = await fetchUserDetails(userIds);
        setUsers(userDetails);
        setLoading(false);
      };

      loadUsers();
    }, [modalType]);

    // 모달 내용
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b">
            <h2 className="text-xl font-bold">
              {modalType === "friends" &&
                (isOwnFeed
                  ? "내 친구 목록"
                  : `${profileUser?.username || "사용자"}님의 친구 목록`)}
              {modalType === "requests" && "친구 요청"}
            </h2>
            <button
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
              onClick={() => setShowFriendModal(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
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
            </button>
          </div>

          <div className="p-4">
            <Suspense fallback={<FriendsListSkeleton />}>
              {loading ? (
                <FriendsListSkeleton />
              ) : users.length > 0 ? (
                <ul className="divide-y">
                  {users.map((user) => (
                    <li
                      key={user._id}
                      className="flex items-center justify-between py-3"
                    >
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => {
                          navigate(`/feed/${user._id}`);
                          setShowFriendModal(false);
                        }}
                      >
                        <div className="flex items-center justify-center w-10 h-10 mr-3 overflow-hidden bg-gray-200 rounded-full">
                          {user.profileImage ? (
                            <img
                              src={`${API_URL}/assets/profiles/${user.profileImage}`}
                              alt={user.username || "프로필"}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-lg font-semibold text-gray-600">
                              {user.username
                                ? user.username.charAt(0).toUpperCase()
                                : "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          {user.introduction && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {user.introduction}
                            </p>
                          )}
                        </div>
                      </div>

                      {modalType === "requests" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptFriendRequest(user._id)}
                            className="px-3 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                          >
                            수락
                          </button>
                          <button
                            onClick={() => handleRejectFriendRequest(user._id)}
                            className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  {modalType === "friends" && <p>아직 친구가 없습니다.</p>}
                  {modalType === "requests" && (
                    <p>받은 친구 요청이 없습니다.</p>
                  )}
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const getProfileInfo = () => {
    // 자신의 피드일 경우
    if (isOwnFeed) {
      return {
        username: user?.username || user?.email || "사용자",
        profileImage: user?.profileImage,
        introduction: user?.introduction || "",
      };
    }
    // 다른 사용자의 피드일 경우
    return {
      username: profileUser?.username || "사용자",
      profileImage: profileUser?.profileImage,
      introduction: profileUser?.introduction || "",
    };
  };

  const profile = getProfileInfo();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 컴포넌트 사용 */}
      <Header />

      <div className="container px-4 py-6 mx-auto">
        {error && (
          <div className="max-w-2xl p-4 mx-auto mb-6 text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:space-x-6">
          {/* 프로필 및 친구 정보 사이드바 */}
          <div className="w-full mb-6 md:w-1/4 md:mb-0">
            {/* 프로필 카드 */}
            <Suspense fallback={<ProfileSkeleton />}>
              {loading ? (
                <ProfileSkeleton />
              ) : (
                <div className="p-6 bg-white rounded-lg shadow">
                  <div className="flex flex-col items-center">
                    {/* 메인 피드로 돌아가기 버튼 (상단에 배치) */}
                    <button
                      onClick={() => navigate("/posts")}
                      className="self-end px-2 py-1 mb-2 text-xs text-blue-600 transition-colors border border-blue-200 rounded-full bg-blue-50 hover:bg-blue-100"
                    >
                      <span className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3 h-3 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        메인 피드
                      </span>
                    </button>

                    {/* 프로필 이미지 */}
                    <div className="relative w-20 h-20 overflow-hidden bg-gray-200 rounded-full">
                      {profile.profileImage ? (
                        <img
                          src={`${API_URL}/assets/profiles/${profile.profileImage}`}
                          alt={profile.username}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-3xl font-semibold text-gray-500">
                          {profile.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* 사용자 이름 */}
                    <h2 className="mt-3 text-xl font-bold text-center">
                      {profile.username}
                    </h2>

                    {/* 친구 상태 배지 추가 */}
                    {!isOwnFeed && friendInfo.isFriend && (
                      <div className="flex justify-center mt-1">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3 h-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          친구
                        </span>
                      </div>
                    )}

                    {/* 소개글 */}
                    {profile.introduction ? (
                      <p className="px-1 py-2 mt-2 text-sm text-center text-gray-600 border-t border-b border-gray-100">
                        {profile.introduction}
                      </p>
                    ) : (
                      <p className="px-1 py-2 mt-2 text-sm italic text-center text-gray-400 border-t border-b border-gray-100">
                        {isOwnFeed
                          ? "소개글이 없습니다."
                          : `${profile.username}님의 소개글이 없습니다.`}
                      </p>
                    )}

                    {/* 친구 정보 - 심플하게 개선 */}
                    {isOwnFeed ? (
                      <div className="flex items-center justify-center mt-4 space-x-2">
                        <button
                          onClick={() => openFriendModal("friends")}
                          className="flex items-center px-3 py-1.5 text-sm bg-gray-100 rounded-full hover:bg-gray-200"
                          title="친구 목록"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5 mr-1 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          친구 ({friendInfo.friends.length})
                        </button>

                        {friendInfo.friendRequests.length > 0 && (
                          <button
                            onClick={() => openFriendModal("requests")}
                            className="flex items-center px-3 py-1.5 text-sm bg-orange-100 rounded-full hover:bg-orange-200"
                            title="친구 요청"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-5 h-5 mr-1 text-orange-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            요청 ({friendInfo.friendRequests.length})
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-center mt-4 space-x-2">
                        {friendInfo.isFriend ? (
                          <>
                            <button
                              onClick={handleRemoveFriend}
                              className="flex items-center px-3 py-1.5 text-sm bg-red-100 rounded-full hover:bg-red-200"
                              title="친구 삭제"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5 mr-1 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                                />
                              </svg>
                              친구 삭제
                            </button>
                          </>
                        ) : friendInfo.hasReceivedRequest ? (
                          <button
                            onClick={() =>
                              handleAcceptFriendRequest(targetUserId)
                            }
                            className="flex items-center px-3 py-1.5 text-sm bg-green-100 rounded-full hover:bg-green-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-5 h-5 mr-1 text-green-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            친구 요청 수락
                          </button>
                        ) : friendInfo.hasSentRequest ? (
                          <button
                            onClick={() =>
                              handleCancelFriendRequest(targetUserId)
                            }
                            className="flex items-center px-3 py-1.5 text-sm bg-gray-100 rounded-full hover:bg-gray-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-5 h-5 mr-1 text-gray-600"
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
                            요청 취소
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleSendFriendRequest(targetUserId)
                            }
                            className="flex items-center px-3 py-1.5 text-sm bg-blue-100 rounded-full hover:bg-blue-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-5 h-5 mr-1 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            친구 요청
                          </button>
                        )}
                      </div>
                    )}

                    {/* 친구 수 표시 */}
                    {!isOwnFeed && (
                      <div className="mt-3 text-center text-gray-500">
                        <button
                          onClick={() => openFriendModal("friends")}
                          className="flex items-center justify-center text-sm transition-colors hover:text-blue-600 hover:underline"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 mr-1 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          친구 {profileUser?.friendsCount || 0}명
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Suspense>

            {/* 알 수도 있는 사람 섹션 - 프로필 카드 다음에 따로 배치 */}
            {isOwnFeed && suggestedPeople.length > 0 && (
              <div className="p-6 mt-4 bg-white rounded-lg shadow">
                <h3 className="mb-4 text-lg font-semibold">
                  알 수도 있는 사람
                </h3>
                <Suspense fallback={<FriendsListSkeleton />}>
                  {loadingSuggestions ? (
                    <FriendsListSkeleton />
                  ) : (
                    <div className="space-y-4">
                      {suggestedPeople.map((person) => (
                        <div
                          key={person._id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-10 h-10 mr-3 overflow-hidden bg-gray-200 rounded-full">
                              {person.profileImage ? (
                                <img
                                  src={`${API_URL}/assets/profiles/${person.profileImage}`}
                                  alt={person.username}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="text-xl font-semibold text-gray-500">
                                  {person.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div
                                className="font-medium cursor-pointer hover:text-blue-600"
                                onClick={() => navigate(`/feed/${person._id}`)}
                              >
                                {person.username}
                              </div>
                              {person.introduction && (
                                <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {person.introduction}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendFriendRequest(person._id)}
                            className="px-3 py-1 text-xs text-blue-600 border border-blue-500 rounded-full hover:bg-blue-50"
                          >
                            친구 추가
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Suspense>
              </div>
            )}
          </div>

          {/* 게시물 섹션 */}
          <div className="w-full md:w-3/4">
            <div className="mb-6 overflow-hidden bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">
                  {isOwnFeed ? "내 게시물" : `${profile.username}님의 게시물`}
                </h2>
              </div>
            </div>

            <Suspense fallback={<PostsSkeleton />}>
              {loading ? (
                <PostsSkeleton />
              ) : posts.length === 0 ? (
                <div className="w-full p-8 py-10 text-center bg-white rounded-lg shadow-md">
                  <p className="mb-4 text-xl text-gray-500">
                    게시물이 없습니다.
                  </p>
                  {isOwnFeed ? (
                    <button
                      onClick={() => navigate("/posts")}
                      className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      메인 피드에서 게시물 작성하기
                    </button>
                  ) : (
                    <p className="text-gray-600">
                      {profile.username}님이 아직 게시물을 작성하지 않았습니다.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostItem
                      key={`feed-${post._id}`}
                      post={post}
                      onDeletePost={handleDeletePost}
                      onUpdatePost={handleUpdatePost}
                    />
                  ))}
                </div>
              )}
            </Suspense>

            {loading && posts.length > 0 && (
              <div className="py-4 text-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 친구 모달 */}
      {showFriendModal && <FriendsListModal />}
    </div>
  );
};

export default MyFeed;
