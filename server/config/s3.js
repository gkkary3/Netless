const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require("multer");

// AWS S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 버킷 이름
const bucketName = process.env.AWS_S3_BUCKET_NAME || "netless-uploads-1";

// 커스텀 S3 스토리지 엔진
const createS3Storage = (folder) => {
  return {
    _handleFile: async (req, file, cb) => {
      try {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const extension = file.originalname.split(".").pop();
        const key = `${folder}/${folder.slice(
          0,
          -1
        )}-${uniqueSuffix}.${extension}`;

        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: bucketName,
            Key: key,
            Body: file.stream,
            ContentType: file.mimetype,
          },
        });

        const result = await upload.done();

        cb(null, {
          bucket: bucketName,
          key: key,
          location: result.Location,
          size: file.size,
        });
      } catch (error) {
        cb(error);
      }
    },
    _removeFile: (req, file, cb) => {
      // 파일 삭제는 별도로 처리
      cb(null);
    },
  };
};

// 프로필 이미지 업로드 설정
const profileUpload = multer({
  storage: createS3Storage("profiles"),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("지원하지 않는 파일 형식입니다: " + file.mimetype), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// 게시물 이미지 업로드 설정
const postUpload = multer({
  storage: createS3Storage("posts"),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("지원하지 않는 파일 형식입니다: " + file.mimetype), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// S3에서 파일 삭제
const deleteFromS3 = async (fileKey) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    };

    await s3Client.deleteObject(params).promise();
    // 삭제 성공 로그 제거
  } catch (error) {
    console.error("S3 파일 삭제 실패:", error);
    throw error;
  }
};

module.exports = {
  s3Client,
  bucketName,
  profileUpload,
  postUpload,
  deleteFromS3,
};
