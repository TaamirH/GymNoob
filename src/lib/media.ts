/** Static JPG twin of a dataset GIF, for list thumbnails that should not animate. */
export function thumbOf(mediaUrl: string | undefined): string | undefined {
  if (!mediaUrl) return undefined
  if (mediaUrl.includes('/videos/') && mediaUrl.endsWith('.gif')) return mediaUrl.replace('/videos/', '/images/').replace(/\.gif$/, '.jpg')
  return mediaUrl
}
