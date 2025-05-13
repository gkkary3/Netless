const { default: mongoose } = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    author: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      username: String,
      profileImage: String,
    },
    images: [{ type: String }],
    likes: [{ type: String }],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
