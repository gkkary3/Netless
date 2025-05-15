import React, { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PostItem from "../components/PostItem";
import PostForm from "../components/PostForm";
import Header from "../components/Header";

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
      // 모든 게시물 가져오기
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
      setAllPosts(postsData);

      // 친구 목록 가져오기
      const friendsResponse = await fetch(`${API_URL}/friends/user-friends`, {
        credentials: "include",
      });

      if (!friendsResponse.ok) {
        throw new Error("친구 정보를 불러오는데 실패했습니다.");
      }

      const friendsData = await friendsResponse.json();
      const myFriends = friendsData.friends || [];

      // 내 게시물과 친구 게시물 필터링
      const myAndFriendsPostsFiltered = postsData.filter(
        (post) =>
          post.author.id === user._id || myFriends.includes(post.author.id)
      );
      setMyAndFriendsPosts(myAndFriendsPostsFiltered);

      // 추천 게시물 필터링 (내 게시물과 친구 게시물이 아닌 것)
      const recommendedPostsFiltered = postsData.filter(
        (post) =>
          post.author.id !== user._id && !myFriends.includes(post.author.id)
      );

      // 랜덤으로 최대 10개 선택 (또는 배열 길이가 10보다 작으면 모두 선택)
      const shuffled = [...recommendedPostsFiltered].sort(
        () => 0.5 - Math.random()
      );
      setRecommendedPosts(shuffled.slice(0, Math.min(10, shuffled.length)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user._id]);

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

  // 내 피드로 이동
  const goToMyFeed = () => {
    navigate("/my-feed");
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
          {/* 게시물 작성 폼 - 항상 표시 */}
          <PostForm onPostCreated={fetchData} />

          {/* 추천 게시물 섹션 - 로딩 상태에 따라 스켈레톤 또는 실제 콘텐츠 표시 */}
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

                        {/* 게시물 슬라이더 - 수평 스크롤 방식으로 변경 */}
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
                    </div>
                  )}
                </div>
              )
            )}
          </Suspense>

          {/* 내 게시물과 친구 게시물 섹션 - 로딩 상태에 따라 스켈레톤 또는 실제 콘텐츠 표시 */}
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between p-3 mb-2 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold text-blue-600">내 피드</h2>
              <button
                onClick={goToMyFeed}
                className="px-3 py-1 text-sm text-blue-600 border border-blue-500 rounded-lg hover:bg-blue-50"
              >
                내 피드 보기
              </button>
            </div>

            <Suspense fallback={<FeedSkeleton />}>
              {loading ? (
                <FeedSkeleton />
              ) : myAndFriendsPosts.length === 0 ? (
                <div className="w-full p-8 py-10 text-center bg-white rounded-lg shadow-md">
                  <p className="mb-4 text-xl text-gray-500">
                    게시물이 없습니다.
                  </p>
                  <p className="text-gray-600">
                    위 폼에서 첫 게시물을 작성하거나 친구를 추가해보세요!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myAndFriendsPosts.map((post) => (
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

            {loading && myAndFriendsPosts.length > 0 && (
              <div className="py-4 text-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posts;
