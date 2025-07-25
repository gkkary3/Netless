const mongoose = require("mongoose");
const Post = require("../models/posts.model");
const Comment = require("../models/comments.model");
require("dotenv").config();

const migrateAuthorStructure = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("MongoDB 연결 성공");

    // 게시글 마이그레이션
    console.log("게시글 마이그레이션 시작...");
    const postsWithOldStructure = await Post.find({
      "author.id": { $exists: true },
    });

    console.log(`마이그레이션할 게시글 수: ${postsWithOldStructure.length}`);

    let postUpdatedCount = 0;
    for (const post of postsWithOldStructure) {
      try {
        if (post.author && post.author.id) {
          await Post.findByIdAndUpdate(post._id, {
            author: post.author.id,
          });
          postUpdatedCount++;
          console.log(`게시글 ID ${post._id}: author 구조 업데이트 완료`);
        }
      } catch (error) {
        console.error(`게시글 ID ${post._id} 업데이트 실패:`, error);
      }
    }

    // 댓글 마이그레이션
    console.log("댓글 마이그레이션 시작...");
    const commentsWithOldStructure = await Comment.find({
      "author.id": { $exists: true },
    });

    console.log(`마이그레이션할 댓글 수: ${commentsWithOldStructure.length}`);

    let commentUpdatedCount = 0;
    for (const comment of commentsWithOldStructure) {
      try {
        if (comment.author && comment.author.id) {
          await Comment.findByIdAndUpdate(comment._id, {
            author: comment.author.id,
          });
          commentUpdatedCount++;
          console.log(`댓글 ID ${comment._id}: author 구조 업데이트 완료`);
        }
      } catch (error) {
        console.error(`댓글 ID ${comment._id} 업데이트 실패:`, error);
      }
    }

    console.log(
      `총 ${postUpdatedCount}개의 게시글과 ${commentUpdatedCount}개의 댓글이 마이그레이션되었습니다.`
    );
  } catch (error) {
    console.error("마이그레이션 실행 중 오류:", error);
  } finally {
    // MongoDB 연결 종료
    await mongoose.connection.close();
    console.log("MongoDB 연결 종료");
  }
};

// 스크립트 실행
if (require.main === module) {
  migrateAuthorStructure();
}

module.exports = migrateAuthorStructure;
