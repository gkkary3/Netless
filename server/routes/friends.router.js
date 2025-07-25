const express = require("express");
const { checkAuthenticated } = require("../middlewares/auth");
const User = require("../models/users.model");
const router = express.Router();

// 공개 사용자 검색 엔드포인트 (비로그인 사용자도 사용 가능)
router.get("/public/search", async (req, res) => {
  try {
    const users = await User.find({}).select(
      "_id username email profileImage introduction"
    );

    return res.status(200).json({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        introduction: user.introduction,
      })),
    });
  } catch (err) {
    console.error("공개 사용자 검색 오류:", err);
    return res.status(500).json({
      success: false,
      message: "사용자 검색 중 오류가 발생했습니다.",
      users: [],
    });
  }
});

// 사용자 친구 및 친구 요청 정보 가져오기
router.get("/user-friends", checkAuthenticated, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 중복 제거 및 유효한 친구만 필터링
    const uniqueFriends = [...new Set(currentUser.friends || [])];
    const uniqueFriendRequests = [
      ...new Set(currentUser.friendsRequests || []),
    ];

    // 존재하는 친구만 필터링
    const validFriends = [];
    for (const friendId of uniqueFriends) {
      try {
        const friendUser = await User.findById(friendId);
        if (friendUser) {
          validFriends.push(friendId);
        }
      } catch (err) {
        // 오류 발생 시 해당 친구 제외
      }
    }

    // 존재하는 친구 요청만 필터링
    const validFriendRequests = [];
    for (const requestId of uniqueFriendRequests) {
      try {
        const requestUser = await User.findById(requestId);
        if (requestUser) {
          validFriendRequests.push(requestId);
        }
      } catch (err) {
        // 오류 발생 시 해당 요청 제외
      }
    }

    // 만약 유효한 목록이 원래와 다르다면 DB 업데이트
    if (
      validFriends.length !== currentUser.friends?.length ||
      !validFriends.every((id) => currentUser.friends.includes(id)) ||
      validFriendRequests.length !== currentUser.friendsRequests?.length ||
      !validFriendRequests.every((id) =>
        currentUser.friendsRequests.includes(id)
      )
    ) {
      await User.findByIdAndUpdate(req.user._id, {
        friends: validFriends,
        friendsRequests: validFriendRequests,
      });
    }

    return res.status(200).json({
      success: true,
      friends: validFriends,
      friendRequests: validFriendRequests,
    });
  } catch (err) {
    console.error("친구 정보 조회 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
    });
  }
});

// 모든 사용자 목록 가져오기
router.get("/", checkAuthenticated, async (req, res) => {
  try {
    const users = await User.find({});

    // 조건문 제거하고 직접 응답 반환
    return res.status(200).json({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        introduction: user.introduction,
        friendsRequests: user.friendsRequests || [],
      })),
    });
  } catch (err) {
    console.error("사용자 목록 조회 오류:", err);
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        success: false,
        message: "친구 목록을 가져오는 데 실패했습니다.",
      });
    } else {
      req.flash("error", "친구 목록을 가져오는 데 실패했습니다.");
      res.redirect("/posts");
    }
  }
});

// 친구 요청 보내기
router.put("/:id/add-friend", checkAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(404).json({
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        });
      } else {
        req.flash("error", "사용자를 찾을 수 없습니다.");
        return res.redirect("/friends");
      }
    }

    // 이미 친구 요청을 보냈는지 확인
    if (
      user.friendsRequests &&
      user.friendsRequests.includes(req.user._id.toString())
    ) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(400).json({
          success: false,
          message: "이미 친구 요청을 보냈습니다.",
        });
      } else {
        req.flash("error", "이미 친구 요청을 보냈습니다.");
        return res.redirect("/friends");
      }
    }

    // 이미 친구인지 확인
    if (user.friends && user.friends.includes(req.user._id.toString())) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(400).json({
          success: false,
          message: "이미 친구입니다.",
        });
      } else {
        req.flash("error", "이미 친구입니다.");
        return res.redirect("/friends");
      }
    }

    // 자기 자신에게 친구 요청을 보내는지 확인
    if (req.user._id.toString() === req.params.id) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(400).json({
          success: false,
          message: "자기 자신에게는 친구 요청을 보낼 수 없습니다.",
        });
      } else {
        req.flash("error", "자기 자신에게는 친구 요청을 보낼 수 없습니다.");
        return res.redirect("/friends");
      }
    }

    // 중복 방지하여 친구 요청 추가
    const existingRequests = user.friendsRequests || [];
    const updatedRequests = existingRequests.includes(req.user._id.toString())
      ? existingRequests
      : [...new Set([...existingRequests, req.user._id.toString()])];

    await User.findByIdAndUpdate(user._id, {
      friendsRequests: updatedRequests,
    });

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(200).json({
        success: true,
        message: "친구 추가 요청을 보냈습니다.",
      });
    } else {
      req.flash("success", "친구 추가 요청을 보냈습니다.");
      res.redirect("/friends");
    }
  } catch (err) {
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        success: false,
        message: "친구 요청 처리 중 오류가 발생했습니다.",
      });
    } else {
      req.flash("error", "문제가 발생했습니다.");
      res.redirect("/friends");
    }
  }
});

// 친구 요청 취소
router.put(
  "/:firstId/remove-friend-request/:secondId",
  checkAuthenticated,
  async (req, res) => {
    try {
      // 내가 다른 사람에게 보낸 친구 요청 취소
      const user = await User.findById(req.params.firstId);
      if (!user) {
        if (req.xhr || req.headers.accept.includes("application/json")) {
          return res.status(404).json({
            success: false,
            message: "사용자를 찾을 수 없습니다.",
          });
        } else {
          req.flash("error", "User not found");
          return res.redirect("/friends");
        }
      }

      // friendsRequests가 undefined일 경우를 대비해 빈 배열로 처리하고 중복 제거
      const uniqueRequests = [...new Set(user.friendsRequests || [])];
      const filteredFriendRequests = uniqueRequests.filter(
        (friendId) => friendId !== req.params.secondId
      );

      await User.findByIdAndUpdate(user._id, {
        friendsRequests: filteredFriendRequests,
      });

      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(200).json({
          success: true,
          message: "친구 추가 요청을 취소했습니다.",
        });
      } else {
        req.flash("success", "친구 추가 요청을 취소했습니다.");
        res.redirect("/friends");
      }
    } catch (err) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(500).json({
          success: false,
          message: "친구 요청 취소 중 오류가 발생했습니다.",
        });
      } else {
        req.flash("error", "문제가 발생했습니다.");
        res.redirect("/friends");
      }
    }
  }
);

// 친구 요청 수락
router.put(
  "/:id/accept-friend-request",
  checkAuthenticated,
  async (req, res) => {
    try {
      // 친구 요청을 보낸 유저
      const senderUser = await User.findById(req.params.id);
      if (!senderUser) {
        if (req.xhr || req.headers.accept.includes("application/json")) {
          return res.status(404).json({
            success: false,
            message: "유저를 찾지 못했습니다.",
          });
        } else {
          req.flash("error", "유저를 찾지 못했습니다.");
          return res.redirect("/friends");
        }
      }

      // 1. 친구 요청을 보낸 유저의 friends에 현재 유저 추가 (중복 방지)
      const senderFriends = senderUser.friends || [];
      const updatedSenderFriends = senderFriends.includes(
        req.user._id.toString()
      )
        ? senderFriends
        : [...new Set([...senderFriends, req.user._id.toString()])];

      await User.findByIdAndUpdate(senderUser._id, {
        friends: updatedSenderFriends,
      });

      // 2. 현재 유저의 friends에 친구 요청 보낸 유저 추가, friendsRequests에서 해당 요청 제거
      const currentUser = await User.findById(req.user._id);

      const currentFriends = currentUser.friends || [];
      const updatedCurrentFriends = currentFriends.includes(
        senderUser._id.toString()
      )
        ? currentFriends
        : [...new Set([...currentFriends, senderUser._id.toString()])];

      await User.findByIdAndUpdate(req.user._id, {
        friends: updatedCurrentFriends,
        friendsRequests: (currentUser.friendsRequests || []).filter(
          (friendId) => friendId !== senderUser._id.toString()
        ),
      });

      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(200).json({
          success: true,
          message: "친구 추가를 성공했습니다!",
        });
      } else {
        req.flash("success", "친구 추가를 성공했습니다!");
        res.redirect("/friends");
      }
    } catch (err) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(500).json({
          success: false,
          message: "친구 추가하는데 실패했습니다.",
        });
      } else {
        req.flash("error", "친구 추가하는데 실패했습니다.");
        res.redirect("/friends");
      }
    }
  }
);

// 친구 삭제
router.put("/:id/remove-friend", checkAuthenticated, async (req, res) => {
  try {
    // 1. 친구를 삭제할 대상 유저(상대방) 찾기
    const user = await User.findById(req.params.id);
    if (!user) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(404).json({
          success: false,
          message: "유저를 찾는데 실패했습니다.",
        });
      } else {
        req.flash("error", "유저를 찾는데 실패했습니다.");
        return res.redirect("back");
      }
    }

    // 2. 상대방의 friends에서 현재 유저의 id를 제거 (중복 제거)
    const userFriends = [...new Set(user.friends || [])];
    const updatedUserFriends = userFriends.filter(
      (friendId) => friendId !== req.user._id.toString()
    );

    await User.findByIdAndUpdate(user._id, {
      friends: updatedUserFriends,
    });

    // 3. 현재 유저의 friends에서 상대방의 id를 제거 (중복 제거)
    const currentUser = await User.findById(req.user._id);
    const currentUserFriends = [...new Set(currentUser.friends || [])];
    const updatedCurrentUserFriends = currentUserFriends.filter(
      (friendId) => friendId !== req.params.id.toString()
    );

    await User.findByIdAndUpdate(req.user._id, {
      friends: updatedCurrentUserFriends,
    });

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(200).json({
        success: true,
        message: "친구 삭제하는데 성공했습니다.",
      });
    } else {
      req.flash("success", "친구 삭제하는데 성공했습니다.");
      res.redirect("/friends");
    }
  } catch (err) {
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        success: false,
        message: "친구 삭제하는데 실패했습니다.",
      });
    } else {
      req.flash("error", "친구 삭제하는데 실패했습니다.");
      res.redirect("/friends");
    }
  }
});

// 사용자의 친구 수 가져오기
router.get("/count/:userId", checkAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
        count: 0,
      });
    }

    // 친구 수 반환
    return res.status(200).json({
      success: true,
      count: user.friends ? user.friends.length : 0,
    });
  } catch (err) {
    console.error("친구 수 조회 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      count: 0,
    });
  }
});

// 특정 사용자의 친구 목록 가져오기
router.get("/list/:userId", checkAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
        friends: [],
      });
    }

    // 중복 제거
    const uniqueFriends = [...new Set(user.friends || [])];

    // 존재하는 사용자만 필터링
    const validFriends = [];
    for (const friendId of uniqueFriends) {
      try {
        const friendUser = await User.findById(friendId);
        if (friendUser) {
          validFriends.push(friendId);
        }
      } catch (err) {
        // 오류 발생 시 해당 친구 제외
      }
    }

    // 만약 유효한 친구 목록이 원래와 다르다면 DB 업데이트
    if (
      validFriends.length !== user.friends?.length ||
      !validFriends.every((id) => user.friends.includes(id))
    ) {
      await User.findByIdAndUpdate(req.params.userId, {
        friends: validFriends,
      });
    }

    return res.status(200).json({
      success: true,
      friends: validFriends,
    });
  } catch (err) {
    console.error("친구 목록 조회 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      friends: [],
    });
  }
});

module.exports = router;
