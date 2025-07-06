const mongoose = require("mongoose");
const User = require("../models/users.model");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/your-database-name";

async function migrateOnlineStatus() {
  try {
    // MongoDB 연결
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB에 연결되었습니다.");

    // isOnline 필드가 없는 사용자들에게 기본값 설정
    const result1 = await User.updateMany(
      { isOnline: { $exists: false } },
      {
        $set: {
          isOnline: false,
        },
      }
    );
    console.log(
      `✅ ${result1.modifiedCount}명의 사용자에게 isOnline 필드를 추가했습니다.`
    );

    // lastSeen 필드가 없는 사용자들에게 기본값 설정
    const result2 = await User.updateMany(
      { lastSeen: { $exists: false } },
      {
        $set: {
          lastSeen: new Date(),
        },
      }
    );
    console.log(
      `✅ ${result2.modifiedCount}명의 사용자에게 lastSeen 필드를 추가했습니다.`
    );

    // 전체 사용자 수 확인
    const totalUsers = await User.countDocuments();
    console.log(`📊 총 ${totalUsers}명의 사용자가 있습니다.`);

    // 샘플 데이터 확인
    const sampleUser = await User.findOne().select(
      "username isOnline lastSeen"
    );
    console.log("🔍 샘플 사용자 데이터:", sampleUser);

    console.log("🎉 마이그레이션이 완료되었습니다!");
  } catch (error) {
    console.error("❌ 마이그레이션 중 오류 발생:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결이 해제되었습니다.");
  }
}

// 스크립트 실행
migrateOnlineStatus();
