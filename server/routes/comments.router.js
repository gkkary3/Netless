const express = require("express");
const {
  checkAuthenticated,
  checkCommentOwnerShip,
} = require("../middlewares/auth");
const Comment = require("../models/comments.model");
const Post = require("../models/posts.model");
const router = express.Router({
  mergeParams: true,
});

// 댓글 생성
router.post("/", checkAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    const comment = await Comment.create({
      text: req.body.text,
    });

    // 생성한 댓글에 작성자 정보 넣어주기
    comment.author.id = req.user._id;
    comment.author.username = req.user.username;
    await comment.save();

    // 포스트에 댓글 데이터를 넣어주기
    post.comments.push(comment);
    await post.save();

    // 생성된 댓글 정보와 함께 저장된 post를 가져옴 (populate)
    const updatedPost = await Post.findById(post._id).populate("comments");

    return res.status(201).json({
      success: true,
      message: "댓글이 등록되었습니다!",
      post: updatedPost,
      comment: comment,
    });
  } catch (err) {
    console.error("댓글 생성 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

// 댓글 삭제
router.delete("/:commentId", checkCommentOwnerShip, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    await Comment.findByIdAndDelete(req.params.commentId);

    // 게시물에서 댓글 참조 제거
    post.comments = post.comments.filter(
      (comment) => comment.toString() !== req.params.commentId
    );
    await post.save();

    // 업데이트된 게시물 가져오기
    const updatedPost = await Post.findById(post._id).populate("comments");

    return res.status(200).json({
      success: true,
      message: "댓글이 삭제되었습니다!",
      post: updatedPost,
    });
  } catch (err) {
    console.error("댓글 삭제 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

// 댓글 수정
router.put("/:commentId", checkCommentOwnerShip, async (req, res) => {
  try {
    if (!req.body.text || !req.body.text.trim()) {
      return res.status(400).json({
        success: false,
        message: "댓글 내용을 입력해주세요.",
      });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      { text: req.body.text },
      { new: true }
    );

    // 업데이트된 게시물 가져오기
    const updatedPost = await Post.findById(req.params.id).populate("comments");

    return res.status(200).json({
      success: true,
      message: "댓글이 성공적으로 수정되었습니다!",
      post: updatedPost,
      comment: updatedComment,
    });
  } catch (err) {
    console.error("댓글 수정 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

module.exports = router;
