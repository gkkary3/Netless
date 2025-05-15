const express = require("express");
const router = express.Router();
const Message = require("../models/message.model");
const User = require("../models/users.model");
const mongoose = require("mongoose");

// 인증 미들웨어
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "로그인이 필요합니다" });
};

// 사용자 검색 (메시지 보낼 대상 찾기)
router.get("/users/search", isLoggedIn, async (req, res) => {
  try {
    const query = req.query.q;
    const onlyFriends = req.query.onlyFriends === "true";
    const currentUserId = req.user._id;

    if (!query) {
      return res.status(400).json({ error: "검색어가 필요합니다" });
    }

    // 현재 사용자 정보 가져오기
    const currentUser = await User.findById(currentUserId);

    // 쿼리 필터 설정
    let filter = {
      $and: [
        { _id: { $ne: currentUserId } }, // 현재 사용자 제외
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
      ],
    };

    // 친구만 검색하도록 필터 추가
    if (onlyFriends && currentUser.friends && currentUser.friends.length > 0) {
      filter.$and.push({ _id: { $in: currentUser.friends } });
    }

    // 사용자 검색
    const users = await User.find(filter)
      .select("_id username email profileImage")
      .limit(10);

    console.log(
      "Found users:",
      users.map((u) => ({
        username: u.username,
        profileImage: u.profileImage,
        profileImageType: typeof u.profileImage,
        hasProfileImage: !!u.profileImage,
      }))
    );

    // 친구인지 표시
    const usersWithFriendStatus = users.map((user) => {
      const isFriend =
        currentUser.friends &&
        currentUser.friends.includes(user._id.toString());
      console.log("User profile image:", user.username, user.profileImage);
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        isFriend,
      };
    });

    res.json(usersWithFriendStatus);
  } catch (error) {
    console.error("사용자 검색 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// 사용자의 모든 대화 목록 가져오기
router.get("/conversations", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;

    // 사용자가 보낸 메시지 또는 받은 메시지를 기준으로 모든 대화 검색
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username profileImage")
      .populate("receiver", "username profileImage");

    // 고유한 대화 ID 추출하여 그룹화
    const conversationsMap = new Map();

    messages.forEach((message) => {
      const { conversationId, sender, receiver, content, createdAt } = message;

      // 대화 상대 설정 (상대방이 누구인지 확인)
      const otherUser =
        sender._id.toString() === userId.toString() ? receiver : sender;

      if (!conversationsMap.has(conversationId)) {
        conversationsMap.set(conversationId, {
          conversationId,
          otherUser: {
            _id: otherUser._id,
            username: otherUser.username,
            profileImage: otherUser.profileImage,
          },
          lastMessage: content,
          lastMessageDate: createdAt,
          unreadCount:
            sender._id.toString() !== userId.toString() && !message.read
              ? 1
              : 0,
        });
      } else if (sender._id.toString() !== userId.toString() && !message.read) {
        // 안 읽은 메시지 카운트 증가
        const conversation = conversationsMap.get(conversationId);
        conversation.unreadCount += 1;
      }
    });

    // 최신 메시지 순으로 정렬
    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastMessageDate - a.lastMessageDate
    );

    res.json(conversations);
  } catch (error) {
    console.error("대화 목록 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// 특정 사용자와의 메시지 기록 가져오기
router.get("/:userId", isLoggedIn, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // 올바른 ObjectId 형식인지 확인
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: "유효하지 않은 사용자 ID입니다" });
    }

    // 상대방 사용자가 존재하는지 확인
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    // 대화 ID 생성
    const conversationId = Message.createConversationId(
      currentUserId.toString(),
      otherUserId.toString()
    );

    // 두 사용자 간의 메시지 검색
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", "username profileImage")
      .populate("receiver", "username profileImage");

    // 상대방이 보낸 메시지를 읽음으로 표시
    await Message.updateMany(
      {
        conversationId,
        sender: otherUserId,
        receiver: currentUserId,
        read: false,
      },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("메시지 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// 새 메시지 전송 (REST API로)
router.post("/:userId", isLoggedIn, async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "메시지 내용이 필요합니다" });
    }

    // 올바른 ObjectId 형식인지 확인
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: "유효하지 않은 사용자 ID입니다" });
    }

    // 수신자가 존재하는지 확인
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "수신자를 찾을 수 없습니다" });
    }

    // 자기 자신에게 메시지를 보내는 것을 방지
    if (senderId.toString() === receiverId.toString()) {
      return res
        .status(400)
        .json({ error: "자기 자신에게 메시지를 보낼 수 없습니다" });
    }

    // 대화 ID 생성
    const conversationId = Message.createConversationId(
      senderId.toString(),
      receiverId.toString()
    );

    // 새 메시지 생성 및 저장
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      conversationId,
    });

    await newMessage.save();

    // 저장된 메시지를 사용자 정보와 함께 반환
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username profileImage")
      .populate("receiver", "username profileImage");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("메시지 전송 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// 대화 삭제하기
router.delete(
  "/conversations/:conversationId",
  isLoggedIn,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      // 대화에 속한 모든 메시지 삭제
      await Message.deleteMany({ conversationId });

      res.json({ message: "대화가 삭제되었습니다" });
    } catch (error) {
      console.error("대화 삭제 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다" });
    }
  }
);

module.exports = router;
