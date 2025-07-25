const { default: mongoose } = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    text: String,
    author: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      username: String,
      profileImage: String, // 프로필 이미지 필드 추가
    },
  },
  {
    timestamps: true,
  }
);

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
