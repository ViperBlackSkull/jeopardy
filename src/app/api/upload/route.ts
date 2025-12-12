import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Allowed file types
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
};

function getMediaType(mimeType: string): 'image' | 'audio' | 'video' | null {
  for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as 'image' | 'audio' | 'video';
    }
  }
  return null;
}

function getExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext || '.bin';
}

export async function POST(request: Request) {
  try {
    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const mediaType = getMediaType(file.type);
    if (!mediaType) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: images, audio, and video files.` },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = getExtension(file.name);
    const uniqueFilename = `${uuidv4()}${extension}`;
    const filepath = path.join(UPLOAD_DIR, uniqueFilename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the URL
    const url = `/uploads/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      media: {
        type: mediaType,
        url,
        filename: file.name,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
    }

    // Security: only allow deleting from uploads directory
    const safeName = path.basename(filename);
    const filepath = path.join(UPLOAD_DIR, safeName);

    const fs = await import('fs/promises');
    await fs.unlink(filepath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
