import React, { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PostItem from "../components/PostItem";
import PostForm from "../components/PostForm";
import Header from "../components/Header";
import AuthModal from "../components/AuthModal";

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
  </div>
);

// 콘텐츠 전체가 로딩 중일 때 표시할 컴포넌트
const FeedSkeleton = () => (
  <div className="w-full max-w-2xl space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-4 bg-white rounded-lg shadow animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="h-20 mt-3 bg-gray-100 rounded"></div>
      </div>
    ))}
  </div>
);

const Posts = () => {
  const [allPosts, setAllPosts] = useState([]);
  const [myAndFriendsPosts, setMyAndFriendsPosts] = useState([]);
  const [recommendedPosts, setRecommendedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRecommended, setShowRecommended] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  const sliderScrollRef = useRef(null);
  const touchStartXRef = useRef(0);
  const isManualScrollingRef = useRef(false);

  // API 기본 URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 슬라이더 수동 이동 함수
  const goToSlide = (index) => {
    if (!sliderScrollRef.current || recommendedPosts.length === 0) return;

    // 유효한 인덱스로 제한
    const safeIndex = Math.max(0, Math.min(index, recommendedPosts.length - 1));
    setCurrentSlide(safeIndex);

    // 스크롤이 사용자에 의한 것임을 표시
    isManualScrollingRef.current = true;

    // 슬라이더 이동
    const slideWidth = sliderScrollRef.current.offsetWidth;
    sliderScrollRef.current.scrollTo({
      left: safeIndex * slideWidth,
      behavior: "smooth",
    });

    // 500ms 후에 수동 스크롤 플래그 해제
    setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 500);
  };

  // 다음 슬라이드로 이동
  const showNextSlide = () => {
    if (recommendedPosts.length === 0) return;
    const nextSlide = (currentSlide + 1) % recommendedPosts.length;
    goToSlide(nextSlide);
  };

  // 이전 슬라이드로 이동
  const showPrevSlide = () => {
    if (recommendedPosts.length === 0) return;
    const prevSlide =
      (currentSlide - 1 + recommendedPosts.length) % recommendedPosts.length;
    goToSlide(prevSlide);
  };

  // 게시물과 친구 정보 가져오기
  const fetchData = async () => {
    setLoading(true);
    try {
      // 모든 게시물 가져오기 - 로그인 여부에 상관없이 가능
      const postsResponse = await fetch(`${API_URL}/posts`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!postsResponse.ok) {
        throw new Error("게시물을 불러오는데 실패했습니다.");
      }

      const postsData = await postsResponse.json();
      // 최신순으로 정렬
      const sortedPosts = postsData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setAllPosts(sortedPosts);

      if (user) {
        // 로그인된 사용자인 경우 친구 목록 가져오기
        try {
          const friendsResponse = await fetch(
            `${API_URL}/friends/user-friends`,
            {
              credentials: "include",
            }
          );

          if (friendsResponse.ok) {
            const friendsData = await friendsResponse.json();
            const myFriends = friendsData.friends || [];

            // 내 게시물과 친구 게시물 필터링
            const myAndFriendsPostsFiltered = sortedPosts.filter(
              (post) =>
                post.author.id === user._id ||
                myFriends.includes(post.author.id)
            );
            setMyAndFriendsPosts(myAndFriendsPostsFiltered);

            // 추천 게시물 필터링 (내 게시물과 친구 게시물이 아닌 것)
            const recommendedPostsFiltered = sortedPosts.filter(
              (post) =>
                post.author.id !== user._id &&
                !myFriends.includes(post.author.id)
            );

            // 랜덤으로 최대 10개 선택
            const shuffled = [...recommendedPostsFiltered].sort(
              () => 0.5 - Math.random()
            );
            setRecommendedPosts(
              shuffled.slice(0, Math.min(10, shuffled.length))
            );
          } else {
            // 친구 정보를 가져올 수 없는 경우 모든 게시물을 추천으로 설정
            setMyAndFriendsPosts([]);
            setRecommendedPosts(sortedPosts.slice(0, 4));
          }
        } catch (error) {
          console.error("친구 정보 가져오기 실패:", error);
          // 에러 발생 시 모든 게시물을 추천으로 설정
          setMyAndFriendsPosts([]);
          setRecommendedPosts(sortedPosts.slice(0, 4));
        }
      } else {
        // 비로그인 사용자인 경우
        setMyAndFriendsPosts([]);
        // 모든 게시물을 추천 게시물로 설정 (최대 4개)
        setRecommendedPosts(
          sortedPosts.slice(0, Math.min(4, sortedPosts.length))
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // 스크롤 감지 설정
  useEffect(() => {
    const slider = sliderScrollRef.current;
    if (!slider || recommendedPosts.length <= 1) return;

    let scrollTimeout;

    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      // 수동 스크롤 중이면 무시
      if (isManualScrollingRef.current) return;

      // 이전 타이머 취소
      clearTimeout(scrollTimeout);

      // 스크롤이 멈춘 후 처리
      scrollTimeout = setTimeout(() => {
        const slideWidth = slider.offsetWidth;
        if (slideWidth <= 0) return;

        const scrollPosition = slider.scrollLeft;
        const newSlideIndex = Math.round(scrollPosition / slideWidth);

        // 유효 범위 내에서만 상태 업데이트
        if (
          newSlideIndex >= 0 &&
          newSlideIndex < recommendedPosts.length &&
          newSlideIndex !== currentSlide
        ) {
          setCurrentSlide(newSlideIndex);
        }
      }, 150);
    };

    // 터치 이벤트 핸들러 - 모바일용
    const handleTouchStart = (e) => {
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      // 터치 종료 시 현재 슬라이드 인덱스 확인
      const slideWidth = slider.offsetWidth;
      if (slideWidth <= 0) return;

      const scrollPosition = slider.scrollLeft;
      const newSlideIndex = Math.round(scrollPosition / slideWidth);

      if (
        newSlideIndex >= 0 &&
        newSlideIndex < recommendedPosts.length &&
        newSlideIndex !== currentSlide
      ) {
        setCurrentSlide(newSlideIndex);
      }
    };

    slider.addEventListener("scroll", handleScroll);
    slider.addEventListener("touchstart", handleTouchStart);
    slider.addEventListener("touchend", handleTouchEnd);

    return () => {
      slider.removeEventListener("scroll", handleScroll);
      slider.removeEventListener("touchstart", handleTouchStart);
      slider.removeEventListener("touchend", handleTouchEnd);
      clearTimeout(scrollTimeout);
    };
  }, [recommendedPosts.length, currentSlide]);

  // 게시물 삭제 처리 함수
  const handleDeletePost = (postId) => {
    // 전체 데이터에서 삭제
    setAllPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
    // 내 게시물 섹션에서도 삭제
    setMyAndFriendsPosts((prevPosts) =>
      prevPosts.filter((post) => post._id !== postId)
    );
    // 추천 게시물 섹션에서도 삭제
    setRecommendedPosts((prevPosts) =>
      prevPosts.filter((post) => post._id !== postId)
    );
  };

  // 게시물 수정 처리 함수
  const handleUpdatePost = (updatedPost) => {
    // 업데이트 함수
    const updatePostsState = (prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post
      );

    // 모든 상태 업데이트
    setAllPosts(updatePostsState);
    setMyAndFriendsPosts(updatePostsState);
    setRecommendedPosts(updatePostsState);
  };

  // 추천 게시물 토글
  const toggleRecommended = () => {
    setShowRecommended(!showRecommended);
  };

  // 내 피드로 이동 (로그인 필요)
  const goToMyFeed = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate("/my-feed");
  };

  // 로그인이 필요한 액션 처리
  const handleRequireAuth = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 컴포넌트 - 항상 표시 */}
      <Header />

      <div className="container px-4 py-6 mx-auto">
        {error && (
          <div className="max-w-2xl p-4 mx-auto mb-6 text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center">
          {/* 게시물 작성 폼 - 로그인된 사용자만 표시 */}
          {user ? (
            <PostForm onPostCreated={fetchData} />
          ) : (
            <div className="sticky z-10 w-full max-w-2xl p-4 mb-6 bg-white border-2 border-blue-100 rounded-lg shadow-lg top-16">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 mr-3 overflow-hidden font-semibold text-blue-600 bg-blue-100 rounded-full flex-shrink-0">
                  ?
                </div>
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-3 font-medium text-blue-600 transition-all duration-200 rounded-full shadow-sm cursor-pointer bg-blue-50 hover:bg-blue-100"
                  onClick={handleRequireAuth}
                >
                  <span className="ml-2 text-sm sm:text-base">
                    무슨 생각을 하고 계신가요?
                  </span>
                  <span className="text-xs sm:text-sm text-blue-500 ml-2 sm:ml-0 mt-1 sm:mt-0">
                    로그인하기
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 추천 게시물 섹션 */}
          <Suspense fallback={<LoadingSpinner />}>
            {loading && recommendedPosts.length === 0 ? (
              <div className="w-full max-w-2xl mb-6">
                <div className="p-3 mb-2 bg-white rounded-lg shadow">
                  <h2 className="text-lg font-semibold text-blue-600">
                    추천 게시물
                  </h2>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                  <LoadingSpinner />
                </div>
              </div>
            ) : (
              recommendedPosts.length > 0 && (
                <div className="w-full max-w-2xl mb-6">
                  <div
                    className="flex items-center justify-between p-3 mb-2 bg-white rounded-lg shadow cursor-pointer"
                    onClick={toggleRecommended}
                  >
                    <h2 className="text-lg font-semibold text-blue-600">
                      추천 게시물
                    </h2>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-6 h-6 transition-transform duration-300 ${
                        showRecommended ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>

                  {showRecommended && (
                    <div className="p-4 bg-white rounded-lg shadow">
                      {/* 슬라이더 컨테이너 */}
                      <div className="relative">
                        {/* 왼쪽 버튼 */}
                        <button
                          className="absolute left-0 z-10 p-2 -translate-y-1/2 bg-white rounded-full shadow top-1/2 bg-opacity-70 hover:bg-opacity-100 focus:outline-none"
                          onClick={showPrevSlide}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-blue-600"
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

                        {/* 게시물 슬라이더 */}
                        <div className="overflow-hidden">
                          <div
                            ref={sliderScrollRef}
                            className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                            style={{
                              scrollbarWidth: "none",
                              msOverflowStyle: "none",
                            }}
                          >
                            {recommendedPosts.map((post, index) => (
                              <div
                                key={`recommended-${post._id}`}
                                className="flex-shrink-0 w-full px-2 snap-center"
                                style={{ minWidth: "100%" }}
                              >
                                <div className="mb-1 text-center">
                                  {recommendedPosts.length > 1 && (
                                    <span className="text-sm text-gray-500">
                                      추천 게시물 {index + 1}/
                                      {recommendedPosts.length}
                                    </span>
                                  )}
                                </div>
                                <div className="max-w-lg mx-auto">
                                  <PostItem
                                    post={post}
                                    onDeletePost={handleDeletePost}
                                    onUpdatePost={handleUpdatePost}
                                    isCompact={true}
                                    onRequireAuth={handleRequireAuth}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 오른쪽 버튼 */}
                        <button
                          className="absolute right-0 z-10 p-2 -translate-y-1/2 bg-white rounded-full shadow top-1/2 bg-opacity-70 hover:bg-opacity-100 focus:outline-none"
                          onClick={showNextSlide}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* 인디케이터 점 */}
                      <div className="flex justify-center mt-4">
                        {recommendedPosts.map((_, index) => (
                          <button
                            key={`dot-${index}`}
                            className={`h-2.5 w-2.5 mx-1 rounded-full transition-all duration-300 ${
                              currentSlide === index
                                ? "bg-blue-600 scale-110"
                                : "bg-gray-300"
                            }`}
                            onClick={() => goToSlide(index)}
                            aria-label={`슬라이드 ${index + 1}`}
                          />
                        ))}
                      </div>

                      {/* 비로그인 사용자 유도 메시지 */}
                      {!user && allPosts.length > 4 && (
                        <div className="mt-6 p-6 bg-white rounded-lg border border-gray-200 text-center">
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            더 많은 이야기가 기다리고 있어요
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">
                            나만의 피드를 만들고 다양한 사람들과 소통해보세요
                          </p>
                          <button
                            onClick={handleRequireAuth}
                            className="px-4 py-1.5 text-sm text-blue-600 font-medium border border-blue-600 rounded-md hover:bg-blue-50 transition-colors duration-200"
                          >
                            시작하기
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </Suspense>

          {/* 내 피드/실사용자 피드 섹션 */}
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between p-3 mb-2 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold text-blue-600">
                {user ? "내 피드" : "실시간 피드"}
              </h2>
              {user && (
                <button
                  onClick={goToMyFeed}
                  className="px-3 py-1 text-sm text-blue-600 border border-blue-500 rounded-lg hover:bg-blue-50"
                >
                  내 피드 보기
                </button>
              )}
            </div>

            <Suspense fallback={<FeedSkeleton />}>
              {loading ? (
                <FeedSkeleton />
              ) : (
                <div className="space-y-4">
                  {user ? (
                    // 로그인된 사용자: 내 게시물과 친구 게시물
                    myAndFriendsPosts.length === 0 ? (
                      <div className="w-full p-8 py-10 text-center bg-white rounded-lg shadow-md">
                        <p className="mb-4 text-xl text-gray-500">
                          게시물이 없습니다.
                        </p>
                        <p className="text-gray-600">
                          위 폼에서 첫 게시물을 작성하거나 친구를 추가해보세요!
                        </p>
                      </div>
                    ) : (
                      myAndFriendsPosts.map((post) => (
                        <PostItem
                          key={`feed-${post._id}`}
                          post={post}
                          onDeletePost={handleDeletePost}
                          onUpdatePost={handleUpdatePost}
                          onRequireAuth={handleRequireAuth}
                        />
                      ))
                    )
                  ) : // 비로그인 사용자: 모든 게시물을 최신순으로
                  allPosts.length === 0 ? (
                    <div className="w-full p-8 py-10 text-center bg-white rounded-lg shadow-md">
                      <p className="mb-4 text-xl text-gray-500">
                        게시물이 없습니다.
                      </p>
                      <p className="text-gray-600">
                        로그인하여 첫 게시물을 작성해보세요!
                      </p>
                    </div>
                  ) : (
                    <>
                      {allPosts.slice(0, 4).map((post) => (
                        <PostItem
                          key={`all-${post._id}`}
                          post={post}
                          onDeletePost={handleDeletePost}
                          onUpdatePost={handleUpdatePost}
                          onRequireAuth={handleRequireAuth}
                        />
                      ))}
                      {allPosts.length > 4 && (
                        <div className="w-full p-8 bg-white rounded-lg border border-gray-200 text-center">
                          <h3 className="text-xl font-medium text-gray-900 mb-3">
                            더 많은 이야기가 기다리고 있어요
                          </h3>
                          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                            다른 사람들의 생각과 일상을 더 깊이 들여다보고 나의
                            이야기도 함께 나눠보세요
                          </p>
                          <button
                            onClick={handleRequireAuth}
                            className="px-4 py-1.5 text-sm text-blue-600 font-medium border border-blue-600 rounded-md hover:bg-blue-50 transition-colors duration-200"
                          >
                            더 보기
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Suspense>

            {loading &&
              (user ? myAndFriendsPosts.length > 0 : allPosts.length > 0) && (
                <div className="py-4 text-center">
                  <LoadingSpinner />
                </div>
              )}
          </div>
        </div>
      </div>

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default Posts;
