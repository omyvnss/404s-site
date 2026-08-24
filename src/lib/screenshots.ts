export function getScreenshotUrl(url: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`
}

export function extractCleanUrl(url: string): string {
  return url.replace(/\?via=404sdesign/g, '').trim()
}
