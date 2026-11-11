/**
 * Save a Blob as a file through a temporary <a download>. The object URL is
 * revoked a moment later, not at once: some browsers start reading it only
 * after the click handler returns.
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
