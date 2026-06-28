import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  buildMinioInternalBaseUrl,
  rewriteMinioSignedUrl,
} from './signed-url.util';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly internalBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<string>('MINIO_PORT', '9000');
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    this.internalBaseUrl = buildMinioInternalBaseUrl({
      endpoint,
      port,
      useSsl: useSSL,
    });

    this.client = new S3Client({
      endpoint: `${protocol}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ROOT_USER', ''),
        secretAccessKey: this.config.get<string>('MINIO_ROOT_PASSWORD', ''),
      },
      forcePathStyle: true,
    });
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'sidpro-files');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Storage bucket ready: ${this.bucket}`);
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      const notFound =
        err.name === 'NotFound' ||
        err.name === 'NoSuchBucket' ||
        err.$metadata?.httpStatusCode === 404;

      if (notFound) {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Storage bucket created: ${this.bucket}`);
        return;
      }

      this.logger.error(`Failed to verify storage bucket: ${this.bucket}`);
      throw error;
    }
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string, retries = 3): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          }),
        );
        return;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }
    }
    throw lastError;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const signed = await getSignedUrl(this.client, command, { expiresIn });
    const publicUrl = this.config.get<string>('MINIO_PUBLIC_URL');
    return rewriteMinioSignedUrl(signed, this.internalBaseUrl, publicUrl);
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async listFilesByPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      keys.push(...(page.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : [])));
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys;
  }

  async deletePrefix(prefix: string): Promise<void> {
    const keys = await this.listFilesByPrefix(prefix);
    for (const key of keys) {
      await this.deleteFile(key);
    }
  }
}
