import { v2 as cloudinary } from 'cloudinary';

// Configure official Cloudinary SDK using server-side environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export const MAX_SIGNATURE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/**
 * Upload candidate digital signature or document to Cloudinary
 * @param {string|Buffer} fileData - Base64 data URI or raw Buffer
 * @param {Object} options - Upload options (folder, candidateId, publicId)
 */
export async function uploadToCloudinary(fileData, options = {}) {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment configuration is missing on the server.');
  }

  const folder = options.folder || 'shortfundly/intern_signatures';
  const publicId = options.publicId ? `${folder}/${options.publicId}` : undefined;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      public_id: options.publicId,
      overwrite: true,
      resource_type: 'auto',
      tags: ['internship', 'signature', options.candidateId || 'general'],
    };

    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      // Base64 Data URI upload
      cloudinary.uploader.upload(fileData, uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      });
    } else {
      // Buffer / Stream upload
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      });

      if (Buffer.isBuffer(fileData)) {
        uploadStream.end(fileData);
      } else {
        reject(new Error('Invalid file data provided for Cloudinary upload.'));
      }
    }
  });
}

/**
 * Test connectivity with Cloudinary credentials by uploading a 1x1 harmless pixel
 */
export async function testCloudinaryConnection() {
  if (!cloudName || !apiKey || !apiSecret) {
    return { success: false, error: 'Missing Cloudinary credentials in .env' };
  }

  try {
    // Valid 1x1 transparent PNG base64
    const sample1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await uploadToCloudinary(sample1x1, {
      folder: 'shortfundly/system_verification',
      publicId: `verify-${Date.now()}`,
    });

    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export { cloudinary };
