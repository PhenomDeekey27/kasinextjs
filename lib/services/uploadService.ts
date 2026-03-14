// Utility for handling file uploads in Next.js API routes
// Next.js uses FormData API instead of multer

interface ParsedFormData {
  fields: Record<string, string | string[]>;
  files: Record<string, File[]>;
}

export async function parseFormData(request: Request): Promise<ParsedFormData> {
  const formData = await request.formData();

  const fields: Record<string, string | string[]> = {};
  const files: Record<string, File[]> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (!files[key]) {
        files[key] = [];
      }
      files[key].push(value);
    } else {
      // Handle multiple values for same key
      if (fields[key]) {
        if (Array.isArray(fields[key])) {
          (fields[key] as string[]).push(value);
        } else {
          fields[key] = [fields[key] as string, value];
        }
      } else {
        fields[key] = value;
      }
    }
  }

  return { fields, files };
}

// Convert File to buffer and metadata for processing
export async function fileToBuffer(file: File): Promise<{
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    originalname: file.name,
    mimetype: file.type,
  };
}
