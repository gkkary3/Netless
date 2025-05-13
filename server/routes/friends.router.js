const express = require("express");
const { checkAuthenticated } = require("../middlewares/auth");
const User = require("../models/users.model");
const router = express.Router();

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

    // 사용자의 친구 목록과 친구 요청 목록을 보냄
    return res.status(200).json({
      success: true,
      friends: currentUser.friends || [],
      friendRequests: currentUser.friendsRequests || [],
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

    await User.findByIdAndUpdate(user._id, {
      friendsRequests: user.friendsRequests.concat([req.user._id]),
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
    console.log(err);
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

      // friendsRequests가 undefined일 경우를 대비해 빈 배열로 처리
      const filteredFriendRequests = user.friendsRequests.filter(
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

      // 1. 친구 요청을 보낸 유저의 friends에 현재 유저 추가
      await User.findByIdAndUpdate(senderUser._id, {
        friends: (senderUser.friends || []).concat([req.user._id]),
      });

      // 2. 현재 유저의 friends에 친구 요청 보낸 유저 추가, friendsRequests에서 해당 요청 제거
      const currentUser = await User.findById(req.user._id);

      await User.findByIdAndUpdate(req.user._id, {
        friends: (currentUser.friends || []).concat([senderUser._id]),
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

    // 2. 상대방의 friends에서 현재 유저의 id를 제거
    await User.findByIdAndUpdate(user._id, {
      friends: (user.friends || []).filter(
        (friendId) => friendId !== req.user._id.toString()
      ),
    });

    // 3. 현재 유저의 friends에서 상대방의 id를 제거
    const currentUser = await User.findById(req.user._id);
    await User.findByIdAndUpdate(req.user._id, {
      friends: (currentUser.friends || []).filter(
        (friendId) => friendId !== req.params.id.toString()
      ),
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

    // 친구 목록 반환
    return res.status(200).json({
      success: true,
      friends: user.friends || [],
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
