// Shared by the invite-code share button (Home.tsx's Profile sheet) and the
// Result-screen share card. Tries the richest option the platform actually
// supports rather than silently downloading a file with no share sheet at
// all, which is what looked like "it only shares the bare URL" in practice.
export async function shareOrCopy(payload: { title: string; text: string; url: string; file?: File }) {
  const { title, text, url, file } = payload;

  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text, url });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return;
  }

  if (file) {
    const blobUrl = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }
  await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
}
