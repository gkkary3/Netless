const mongoose = require("mongoose");
const Post = require("../models/posts.model");
const Comment = require("../models/comments.model");
require("dotenv").config();

const checkDataStructure = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("MongoDB 연결 성공");

    // 게시글 구조 확인
    console.log("\n=== 게시글 author 구조 확인 ===");
    const posts = await Post.find().limit(3);

    posts.forEach((post, index) => {
      console.log(`게시글 ${index + 1}:`, {
        _id: post._id,
        author: post.author,
        authorType: typeof post.author,
        isObjectId: mongoose.Types.ObjectId.isValid(post.author),
      });
    });

    // 댓글 구조 확인
    console.log("\n=== 댓글 author 구조 확인 ===");
    const comments = await Comment.find().limit(3);

    comments.forEach((comment, index) => {
      console.log(`댓글 ${index + 1}:`, {
        _id: comment._id,
        author: comment.author,
        authorType: typeof comment.author,
        isObjectId: mongoose.Types.ObjectId.isValid(comment.author),
      });
    });

    // 구조별 개수 확인
    console.log("\n=== 구조별 개수 확인 ===");

    const postsWithObjectIdAuthor = await Post.countDocuments({
      author: { $type: "objectId" },
    });

    const postsWithObjectAuthor = await Post.countDocuments({
      "author.id": { $exists: true },
    });

    const commentsWithObjectIdAuthor = await Comment.countDocuments({
      author: { $type: "objectId" },
    });

    const commentsWithObjectAuthor = await Comment.countDocuments({
      "author.id": { $exists: true },
    });

    console.log(`게시글 - ObjectId 구조: ${postsWithObjectIdAuthor}개`);
    console.log(`게시글 - Object 구조: ${postsWithObjectAuthor}개`);
    console.log(`댓글 - ObjectId 구조: ${commentsWithObjectIdAuthor}개`);
    console.log(`댓글 - Object 구조: ${commentsWithObjectAuthor}개`);
  } catch (error) {
    console.error("확인 중 오류:", error);
  } finally {
    // MongoDB 연결 종료
    await mongoose.connection.close();
    console.log("\nMongoDB 연결 종료");
  }
};

// 스크립트 실행
if (require.main === module) {
  checkDataStructure();
}

module.exports = checkDataStructure;
