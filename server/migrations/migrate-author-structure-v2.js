const mongoose = require("mongoose");
require("dotenv").config();

const migrateAuthorStructure = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("MongoDB 연결 성공");

    const db = mongoose.connection.db;

    // 게시글 마이그레이션
    console.log("게시글 마이그레이션 시작...");

    const postsResult = await db
      .collection("posts")
      .updateMany({ "author.id": { $exists: true } }, [
        {
          $set: {
            author: "$author.id",
          },
        },
      ]);

    console.log(`게시글 ${postsResult.modifiedCount}개 마이그레이션 완료`);

    // 댓글 마이그레이션
    console.log("댓글 마이그레이션 시작...");

    const commentsResult = await db
      .collection("comments")
      .updateMany({ "author.id": { $exists: true } }, [
        {
          $set: {
            author: "$author.id",
          },
        },
      ]);

    console.log(`댓글 ${commentsResult.modifiedCount}개 마이그레이션 완료`);

    console.log(
      `총 ${postsResult.modifiedCount}개의 게시글과 ${commentsResult.modifiedCount}개의 댓글이 마이그레이션되었습니다.`
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
