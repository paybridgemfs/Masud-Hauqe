import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth.js';
import { uploadImageToGoogleDrive } from '@/lib/google-drive.js';
import { logAuditEvent } from '@/lib/db.js';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function sanitizeImageFilename(name = 'image.jpg') {
  const cleaned = String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);
  return cleaned || `image_${Date.now()}.jpg`;
}

export async function POST(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('imageFile');

    if (!imageFile || typeof imageFile === 'string') {
      return NextResponse.json(
        { ok: false, error: 'Please select a valid image file to upload.' },
        { status: 400 }
      );
    }

    const mimeType = (imageFile.type || 'image/jpeg').toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported image format (${mimeType}). Please upload JPG, PNG, WebP, GIF, AVIF, SVG, or ICO.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Uploaded image file is empty.' },
        { status: 400 }
      );
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Image size exceeds the 15 MB maximum limit.' },
        { status: 400 }
      );
    }

    const safeFileName = sanitizeImageFilename(imageFile.name);
    const uploadResult = await uploadImageToGoogleDrive({
      buffer,
      fileName: safeFileName,
      mimeType,
    });

    await logAuditEvent({
      adminId: admin.id,
      action: 'DRIVE_IMAGE_UPLOADED',
      entityType: 'GoogleDriveImage',
      entityId: uploadResult.fileId,
      metadata: {
        fileName: uploadResult.fileName,
        folderId: uploadResult.folderId,
        fileSize: uploadResult.fileSize,
      },
    });

    return NextResponse.json({
      ok: true,
      fileId: uploadResult.fileId,
      folderId: uploadResult.folderId,
      url: uploadResult.url,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
    });
  } catch (err) {
    console.error('Google Drive image upload error:', err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to upload image to Google Drive Images folder.',
      },
      { status: 500 }
    );
  }
}
