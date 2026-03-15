// Cloudinary file upload service
// Uploads files directly to Cloudinary and returns the secure URL

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
}

export async function uploadToCloudinary(
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  },
  folder: string
): Promise<string> {
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials not configured");
  }

  const formData = new FormData();
  
  // Convert buffer to Blob - use Uint8Array directly
  const uint8Array = new Uint8Array(file.buffer);
  const blob = new Blob([uint8Array], { type: file.mimetype });
  formData.append("file", blob, file.originalname);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
  formData.append("folder", `kasi-booking/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cloudinary upload failed: ${error.error?.message || "Unknown error"}`);
    }

    const data = (await response.json()) as CloudinaryResponse;
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}
