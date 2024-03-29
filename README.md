# ![Icon](assets/icon_32.png) Network Tracker

A Chrome extension to get all network requests in a website and download files
and videos from it.

![Screenshot](assets/screenshot.png)

## Configuration

In `sanitizeURL` function at [background.js](js/background.js#L314-L322):

```js
function sanitizeURL(url) {
  ...
  if (url.match(/googleusercontent\.com\/.*&url=.*/g)) {
    return Array.from(
      url.matchAll(/googleusercontent\.com\/.*&url=(.*)/g)
    )[0][1];
  }
  ...
  return url;
}
```

In `matchURL` function at [background.js](js/background.js#L324-L340):

```js
function matchURL(data) {
  ...
  if (data.tabURL.match(/https?:\/\/www\.example\.com/g)) {
    return (
      (data.mimeType && (
        data.mimeType === "application/vnd.apple.mpegurl" ||
          data.mimeType.match(/^(video|audio)/g))) ||
      data.url.match(/^(?!.*\bthumbnails\.vtt\b).*\.(m3u8|aaa|ts|vtt|srt)\b/g) ||
      data.url.match(/\bmaster\.txt\b/g)
    );
  }
  ...
  return false;
}
```

In `matchPlaylistURL` function at [background.js](js/background.js#L342-L350):

```js
function matchPlaylistURL(data) {
  ...
  if (data.tabURL.match(/https?:\/\/www\.example\.com/g)) {
    return (
      data.mimeType === "application/vnd.apple.mpegurl" ||
      data.url.includes("master.txt") ||
      data.url.includes(".m3u8") ||
      data.url.includes("/m3/")
    );
  }
  ...
  return false;
}
```

## Sources

- <https://www.flaticon.com/free-icon/network_2561991>
- <https://developer.chrome.com/docs/extensions/mv3/getstarted/>
- <https://stackoverflow.com/questions/20019958>
- <https://stackoverflow.com/questions/16096482>
- <https://stackoverflow.com/questions/66618136>
