// R2 is S3-compatible. We use @aws-sdk/client-s3 with the R2 endpoint.
// Not unit-tested (requires live credentials); validated via plan §5 step 4.

let s3SdkCache;
function loadS3Sdk() {
  if (!s3SdkCache) s3SdkCache = require('@aws-sdk/client-s3');
  return s3SdkCache;
}

class R2Store {
  constructor({ accountId, accessKeyId, secretAccessKey, bucket }) {
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('R2 requires accountId, accessKeyId, secretAccessKey, bucket');
    }
    const { S3Client } = loadS3Sdk();
    this.bucket = bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async get(id) {
    const { GetObjectCommand } = loadS3Sdk();
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: id }));
      const chunks = [];
      for await (const chunk of res.Body) chunks.push(chunk);
      return { buffer: Buffer.concat(chunks), mimeType: res.ContentType || 'image/png' };
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async put(id, buffer, mimeType) {
    const { PutObjectCommand } = loadS3Sdk();
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: id, Body: buffer, ContentType: mimeType,
    }));
  }
}

module.exports = { R2Store };
