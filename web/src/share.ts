// Shared by the invite-code share button (Home.tsx's Profile sheet) and the
// Result-screen share card. Tries the richest option the platform actually
// supports rather than silently downloading a file with no share sheet at
// all, which is what looked like "it only shares the bare URL" in practice.
export async function shareOrCopy(payload: { title: string; text: string; url: string; file?: File }) {
  const { title, text, url, file } = payload;
  // A few share targets (some WhatsApp/Android intents) only surface one of
  // `text`/`url` and silently drop the other — folding the link into the
  // text itself means the invite code and pitch survive either way.
  const combined = `${text} ${url}`;

  if (file) {
    // Try the file share directly rather than gating on canShare() first:
    // canShare is unimplemented or under-reports support on some browsers
    // that can still share files fine, and a real share() call is the more
    // trustworthy signal — fall back only if it actually fails.
    try {
      if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error('files unsupported');
      await navigator.share({ files: [file], title, text: combined });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err; // user cancelled — don't fall through
    }
  }

  if (navigator.share) {
    await navigator.share({ title, text: combined });
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
  await navigator.clipboard?.writeText(combined).catch(() => {});
}
