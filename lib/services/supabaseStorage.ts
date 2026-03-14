import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase storage is not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface FileToUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export async function uploadFile(
  file: FileToUpload,
  folder: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const fileName = `${Date.now()}-${file.originalname}`;

  const { data, error } = await supabase.storage
    .from("booking-files")
    .upload(`${folder}/${fileName}`, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("booking-files")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
