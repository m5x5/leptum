import { NextRequest, NextResponse } from "next/server";

const PENDING_SHARE_KEY = "pendingShare";

/**
 * Convert a File/Blob to base64 string (for passing shared files via redirect).
 */
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

/**
 * POST /share - Receives shared content from the Web Share Target API.
 * Builds a payload and returns HTML that stores it in localStorage and redirects to /.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = (formData.get("title") as string) || "";
    const text = (formData.get("text") as string) || "";
    const url = (formData.get("url") as string) || "";

    const files: { name: string; type: string; base64: string }[] = [];
    const fileEntries = formData.getAll("files");
    for (const entry of fileEntries) {
      const file = entry as File;
      if (file && file.size > 0) {
        const base64 = await fileToBase64(file);
        files.push({ name: file.name, type: file.type, base64 });
      }
    }

    const payload = {
      title: title.trim(),
      text: text.trim(),
      url: url.trim(),
      files,
    };

    // Return HTML that stores payload in localStorage and redirects to home
    const payloadJson = JSON.stringify(payload);
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Opening Leptum...</title></head>
<body>
<script>
(function() {
  try {
    localStorage.setItem("${PENDING_SHARE_KEY}", ${JSON.stringify(payloadJson)});
  } catch (e) {}
  window.location.replace("/");
})();
</script>
<p>Opening Leptum...</p>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Share route error:", error);
    return new NextResponse("Failed to process share", { status: 500 });
  }
}
