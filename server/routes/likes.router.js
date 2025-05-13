const express = require("express");
const { checkAuthenticated } = require("../middlewares/auth");
const Post = require("../models/posts.model");
const router = express.Router({ mergeParams: true });
// Express에서는 라우터를 use()로 분리해서 연결할 때,
// 기본적으로는 상위 라우터의 params를 하위 라우터로 전달하지 않습니다.

// 그래서 하위 라우터(likesRouter)에서 :id를 쓰고 싶으면,
// **명시적으로 mergeParams: true**를 줘야 req.params.id가 작동합니다.

router.put("/", checkAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    // 이미 좋아요를 눌렀다면 좋아요 취소
    if (post.likes.find((like) => like === req.user._id.toString())) {
      const updatedLikes = post.likes.filter(
        (like) => like !== req.user._id.toString()
      );

      const updatedPost = await Post.findByIdAndUpdate(
        post._id,
        {
          likes: updatedLikes,
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "좋아요가 취소되었습니다.",
        post: updatedPost,
      });
    } else {
      // 좋아요를 누르지 않았다면 좋아요 추가
      const updatedPost = await Post.findByIdAndUpdate(
        post._id,
        {
          likes: post.likes.concat([req.user._id]),
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "좋아요가 추가되었습니다.",
        post: updatedPost,
      });
    }
  } catch (err) {
    console.error("좋아요 처리 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

module.exports = router;
