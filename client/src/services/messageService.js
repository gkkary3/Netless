const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

// 대화 목록 조회
export const getConversations = async () => {
  try {
    const response = await fetch(`${API_URL}/messages/conversations`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "대화 목록을 불러오는데 실패했습니다");
    }

    return await response.json();
  } catch (error) {
    console.error("대화 목록 조회 오류:", error);
    throw error;
  }
};

// 특정 사용자와의 메시지 기록 조회
export const getMessagesWith = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/messages/${userId}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "메시지를 불러오는데 실패했습니다");
    }

    return await response.json();
  } catch (error) {
    console.error("메시지 기록 조회 오류:", error);
    throw error;
  }
};

// REST API로 메시지 전송 (Socket.io가 연결되지 않았을 때 대체 수단)
export const sendMessage = async (userId, content) => {
  try {
    const response = await fetch(`${API_URL}/messages/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "메시지 전송에 실패했습니다");
    }

    return await response.json();
  } catch (error) {
    console.error("메시지 전송 오류:", error);
    throw error;
  }
};

// 사용자 검색
export const searchUsers = async (query) => {
  try {
    // query 문자열에 ?onlyFriends=true와 같은 추가 파라미터가 있는지 확인
    let searchQuery = query;
    let additionalParams = "";

    if (query.includes("?")) {
      const parts = query.split("?");
      searchQuery = parts[0];
      additionalParams = "?" + parts[1];
    }

    const response = await fetch(
      `${API_URL}/messages/users/search?q=${encodeURIComponent(
        searchQuery
      )}${additionalParams}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "사용자 검색에 실패했습니다");
    }

    return await response.json();
  } catch (error) {
    console.error("사용자 검색 오류:", error);
    throw error;
  }
};

// 대화 삭제
export const deleteConversation = async (conversationId) => {
  try {
    const response = await fetch(
      `${API_URL}/messages/conversations/${conversationId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "대화 삭제에 실패했습니다");
    }

    return await response.json();
  } catch (error) {
    console.error("대화 삭제 오류:", error);
    throw error;
  }
};

// 사용자 정보 가져오기
export const getUserInfo = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/auth/${userId}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "사용자 정보를 불러오는데 실패했습니다"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    throw error;
  }
};
