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
    },
  },
  {
    timestamps: true,
  }
);

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
