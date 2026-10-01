interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

let cachedSignature: { data: CloudinarySignature; expiresAt: number } | null =
  null;

async function getSignature(): Promise<CloudinarySignature> {
  const now = Date.now();
  if (cachedSignature && cachedSignature.expiresAt > now) {
    return cachedSignature.data;
  }

  const res = await fetch("/api/admin/upload");
  const json = await res.json();

  if (!res.ok || !json.success || !json.data) {
    throw new Error(
      json.error || json.message || "Failed to get upload authorization",
    );
  }

  const data = json.data as CloudinarySignature;
  cachedSignature = {
    data,
    expiresAt: now + 50 * 1000,
  };

  return data;
}

export async function uploadImageToCloudinaryClient(
  file: File,
): Promise<string> {
  const { signature, timestamp, apiKey, cloudName, folder } =
    await getSignature();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || "Failed to upload image directly to Cloudinary",
    );
  }

  return data.secure_url as string;
}
