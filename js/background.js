const requestHeaders = {};
const videoFragments = {};
const startTime = Date.now();

findTab();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepAlive") {
    setTimeout(() => port.disconnect(), 250e3);
    port.onDisconnect.addListener(() => findTab());
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.to === "background") {
    if (message.subject === "download_file") {
      downloadFile(message.data);
    } else if (message.subject === "get_arrays") {
      getArrays(message.data);
    }
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((data) => {
  console.log(`[${elapsedTime()}s] [T${data.tabId}] ${data.url}`);
});

chrome.webNavigation.onCommitted.addListener((data) => {
  if (["reload", "typed", "generated"].includes(data.transitionType)) {
    chrome.storage.local.remove(data.tabId.toString());
  }
});

chrome.webRequest.onSendHeaders.addListener(
  (data) => {
    if (data.tabId !== -1) {
      requestHeaders[data.requestId] = data.requestHeaders;
    }
  },
  {
    urls: ["<all_urls>"],
  },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  (data) => {
    if (data.tabId !== -1) {
      chrome.tabs.get(data.tabId, (tab) => {
        if (!tab) {
          return;
        }

        data.tabURL = tab.url;
        const header = getHeader(data.responseHeaders, "content-type");
        data.mimeType = header && header.value.split(";", 1)[0];

        if (matchURL(data)) {
          updateWebRequests(data);
        }
      });
    }
  },
  {
    urls: ["<all_urls>"],
  },
  ["responseHeaders", "extraHeaders"]
);

async function findTab(tabs) {
  if (chrome.runtime.lastError) {
  }
  for (const { id: tabId } of tabs ||
    (await chrome.tabs.query({ url: "*://*/*" }))) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: connect,
      });
      chrome.tabs.onUpdated.removeListener(onUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(onUpdate);
}

function connect() {
  chrome.runtime
    .connect({ name: "keepAlive" })
    .onDisconnect.addListener(connect);
}

function onUpdate(tabId, info, tab) {
  /^https?:/.test(info.url) && findTab([tab]);
}

function elapsedTime() {
  return ((Date.now() - startTime) / 1000).toFixed(2);
}

async function downloadFile(data) {
  const downloadId = await chrome.downloads.download({
    url: sanitizeURL(data.url),
  });
  if (downloadId) {
    console.log(
      `[${elapsedTime()}s] [R${data.requestId}] [D${downloadId}] ${data.url}`
    );
  } else {
    console.log(
      `[${elapsedTime()}s] [R${data.requestId}] Error: Failed to download ${
        data.url
      }`
    );
  }
}

function filterArray(array) {
  return array instanceof Array && array.length;
}

async function getArrays(data) {
  try {
    let urls = videoFragments[data.requestId];
    if (!urls || !urls.length) {
      urls = await getPlaylistURL(data);
      if (!urls.length) {
        throw `Error: Cannot download ${data.url}`;
      }
      videoFragments[data.requestId] = urls;
    }
    let promises = [];
    for (const [i, url] of urls.entries()) {
      async function promise() {
        updateDownloadStatus(data, {
          msg: `[${i + 1}/${urls.length}] ${url}`,
          perc: ((i + 1) * 100) / urls.length,
        });
        const array = await getArrayFromURL(
          url,
          data,
          `${i + 1}/${urls.length}`
        );
        if (!filterArray(array)) {
          throw `[${i + 1}/${urls.length}] Error: Cannot download ${data.url}`;
        }
        chrome.tabs.sendMessage(
          data.tabId,
          {
            from: "background",
            to: "content_script",
            subject: "arrays_to_blob",
            data: {
              requestId: data.requestId,
              array: array,
              idx: i,
              length: urls.length,
            },
          },
          () => chrome.runtime.lastError
        );
      }
      promises.push(promise());
      if (promises.length === 10) {
        await Promise.all(promises);
        promises = [];
      }
    }
    if (promises.length) {
      await Promise.all(promises);
      promises = [];
    }
    chrome.tabs.sendMessage(
      data.tabId,
      {
        from: "background",
        to: "content_script",
        subject: "blob_to_url",
        data: { requestId: data.requestId },
      },
      () => chrome.runtime.lastError
    );
  } catch (err) {
    err = `[R${data.requestId}] ${err}`;
    chrome.tabs.sendMessage(
      data.tabId,
      {
        from: "background",
        to: "content_script",
        subject: "alert",
        data: err,
      },
      () => chrome.runtime.lastError
    );
    console.log(`[${elapsedTime()}s] ${err}`);
  }
  updateDownloadStatus(data);
}

async function getPlaylistURL(data) {
  let res = await fetch(data.url);
  let text = (await res.text()) + "\n";
  let urls = Array.from(text.matchAll(/,\n(.*)\n/g), (match) =>
    sanitizeURL(new URL(match[1], data.url).href)
  );
  if (urls.length !== 0) {
    return urls;
  }
  urls = {};
  const heights = Array.from(
    text.matchAll(/RESOLUTION=.*x(.*)\n(.*)\n/g),
    (match) => {
      let height = match[1];
      const idx = height.indexOf(",");
      if (idx !== -1) {
        height = height.substring(0, idx);
      }
      urls[height] = sanitizeURL(new URL(match[2], data.url).href);
      return parseInt(height);
    }
  );
  if (heights.length) {
    const maxHeight = Math.max(...heights).toString();
    res = await fetch(urls[maxHeight]);
    text = (await res.text()) + "\n";
    urls = Array.from(text.matchAll(/,\n(.*)\n/g), (match) =>
      sanitizeURL(new URL(match[1], urls[maxHeight]).href)
    );
    return urls;
  }
  return [];
}

async function getArrayFromURL(url, data, perc) {
  console.log(`[${elapsedTime()}s] [R${data.requestId}] [${perc}] ${url}`);
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return Array.from(new Uint32Array(arrayBuffer));
  } catch (err) {
    err = `[R${data.requestId}] [${perc}] ${err}`;
    chrome.tabs.sendMessage(
      data.tabId,
      {
        from: "background",
        to: "content_script",
        subject: "alert",
        data: err,
      },
      () => chrome.runtime.lastError
    );
    console.log(`[${elapsedTime()}s] ${err}`);
    return null;
  }
}

async function updateDownloadStatus(data, downloadStatus = null) {
  if (downloadStatus) {
    data.downloadStatus = downloadStatus;
  } else {
    delete data.downloadStatus;
  }
  chrome.runtime.sendMessage(
    {
      from: "background",
      to: "popup",
      subject: "update_status",
      data: data,
    },
    () => chrome.runtime.lastError
  );

  let storage = await chrome.storage.local.get(data.tabId.toString());
  const object = storage[data.tabId.toString()];
  if (object instanceof Array && object.length) {
    object[data.idx] = data;

    storage = {};
    storage[data.tabId.toString()] = object;
    chrome.storage.local.set(storage);
  }
}

function updateWebRequests(data) {
  chrome.storage.local.get(data.tabId.toString(), (storage) => {
    let object = storage[data.tabId.toString()];
    if (!object) {
      object = [];
    }

    data.idx = object.length;
    if (requestHeaders[data.requestId]) {
      data.requestHeaders = requestHeaders[data.requestId];
    }
    if (matchPlaylistURL(data)) {
      data.isPlaylist = true;
    }
    object.push(data);

    storage = {};
    storage[data.tabId.toString()] = object;
    chrome.storage.local.set(storage);
  });
}

function getHeader(headers, headerName) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].name.toLowerCase() === headerName) {
      return headers[i];
    }
  }
}

function sanitizeURL(url) {
  // Define your custom rules here
  if (url.match(/googleusercontent\.com\/.*&url=.*/g)) {
    return Array.from(
      url.matchAll(/googleusercontent\.com\/.*&url=(.*)/g)
    )[0][1];
  }
  return url;
}

function matchURL(data) {
  // Define your custom rules here
  if (data.tabURL.match(/https?:\/\/www\.youtube\.com/g)) {
    return false;
  }
  return (
    (data.mimeType &&
      (data.mimeType === "application/vnd.apple.mpegurl" ||
        data.mimeType.match(/^(video|audio)/g))) ||
    data.url.match(/^(?!.*\bthumbnails\.vtt\b).*\.(m3u8|aaa|ts|vtt|srt)\b/g) ||
    data.url.match(/\/br\/H[1-4]/g) ||
    data.url.match(/\bmaster\.txt\b/g) ||
    data.url.match(/\/subtitles?\//g) ||
    data.url.includes("/m3/") ||
    data.url.includes("googleusercontent.com/download/storage/")
  );
}

function matchPlaylistURL(data) {
  // Define your custom rules here
  return (
    data.mimeType === "application/vnd.apple.mpegurl" ||
    data.url.includes("master.txt") ||
    data.url.includes(".m3u8") ||
    data.url.includes("/m3/")
  );
}
