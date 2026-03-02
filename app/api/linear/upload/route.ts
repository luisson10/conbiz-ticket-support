import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { linearClient } from "@/lib/linear";

const FILE_UPLOAD_MUTATION = `
  mutation FileUpload($contentType: String!, $filename: String!, $size: Int!, $makePublic: Boolean) {
    fileUpload(contentType: $contentType, filename: $filename, size: $size, makePublic: $makePublic) {
      success
      uploadFile {
        uploadUrl
        assetUrl
        filename
        contentType
        size
        headers {
          key
          value
        }
      }
    }
  }
`;

type UploadPayload = {
  data?: {
    fileUpload?: {
      success?: boolean;
      uploadFile?: {
        uploadUrl: string;
        assetUrl: string;
        filename: string;
        contentType: string;
        size: number;
        headers: Array<{ key: string; value: string }>;
      } | null;
    };
  };
};

async function uploadToSignedUrl(params: {
  uploadUrl: string;
  file: File;
  headers: Array<{ key: string; value: string }>;
}) {
  const headerRecord = new Headers();
  params.headers.forEach((header) => {
    headerRecord.set(header.key, header.value);
  });
  if (!headerRecord.has("content-type")) {
    headerRecord.set("content-type", params.file.type || "application/octet-stream");
  }

  const arrayBuffer = await params.file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  let uploadResponse = await fetch(params.uploadUrl, {
    method: "PUT",
    headers: headerRecord,
    body,
  });

  if (!uploadResponse.ok) {
    uploadResponse = await fetch(params.uploadUrl, {
      method: "POST",
      headers: headerRecord,
      body,
    });
  }

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to Linear storage.");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const payload = (await linearClient.client.rawRequest(FILE_UPLOAD_MUTATION, {
      contentType: file.type || "application/octet-stream",
      filename: file.name,
      size: file.size,
      makePublic: true,
    })) as UploadPayload;

    const uploadFile = payload.data?.fileUpload?.uploadFile;
    if (!payload.data?.fileUpload?.success || !uploadFile) {
      return NextResponse.json({ error: "Failed to initialize upload." }, { status: 502 });
    }

    await uploadToSignedUrl({
      uploadUrl: uploadFile.uploadUrl,
      file,
      headers: uploadFile.headers || [],
    });

    return NextResponse.json({
      success: true,
      data: {
        assetUrl: uploadFile.assetUrl,
        filename: uploadFile.filename,
        contentType: uploadFile.contentType,
        size: uploadFile.size,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected upload error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
