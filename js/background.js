chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.to === 'background') {
		if (message.from === 'popup' && message.subject === 'download_file') {
			chrome.downloads.download({url: message.data.url});
		} else if (message.from === 'content_script' && message.subject === 'get_array_buffers') {
			getArrayBuffers(message.data);
		} else if (message.from === 'content_script' && message.subject === 'download_blob_url') {
			chrome.downloads.download({url: message.data});
			sendResponse(message.data);
		}
	}
});

chrome.webNavigation.onBeforeNavigate.addListener(details => {
	console.log(`[${details.tabId}] Connecting to ${details.url}...`);
});

chrome.webNavigation.onCommitted.addListener(details => {
	if (['reload', 'typed', 'generated'].includes(details.transitionType)) {
		let data = {};
		data[details.tabId.toString()] = [];
		chrome.storage.local.set(data);
	}
});

let requestHeaders = {};

chrome.webRequest.onSendHeaders.addListener(details => {
	if (details.tabId !== -1) {
		requestHeaders[details.requestId] = details.requestHeaders;
	}
}, {
	urls: ['<all_urls>']
}, ['requestHeaders', 'extraHeaders']);

chrome.webRequest.onHeadersReceived.addListener(details => {
	if (details.tabId !== -1) {
		chrome.tabs.get(details.tabId, tab => {
			if (!tab) {
				return;
			}

			details.tabURL = tab.url;
			let header = getHeader(details.responseHeaders, 'content-type');
			details.mimeType = header && header.value.split(';', 1)[0];

			if (matchURL(details)) {
				if (requestHeaders[details.requestId]) {
					details.requestHeaders = requestHeaders[details.requestId];
				}
				const tabId = details.tabId.toString();
				chrome.storage.local.get(tabId, local => {
					let object = local[tabId];
					if (!object) {
						object = [];
					}
					object.push(details);

					let data = {};
					data[tabId] = object;
					chrome.storage.local.set(data);
				});
			}
		});
	}
}, {
	urls: ['<all_urls>']
}, ['responseHeaders', 'extraHeaders']);

async function getArrayBuffers(data) {
	try {
		const urls = await getPlaylistURL(data);
		if (!urls) {
			throw `Cannot download ${data.url}`;
		}
		for (const [i, url] of urls.entries()) {
			console.log(`[${data.tabId}] [${data.requestId} ${i + 1}/${urls.length}] ${url}`);
			chrome.runtime.sendMessage({
				from: 'background',
				to: 'popup',
				subject: 'update_status',
				data: {
					tabId: data.tabId,
					idx: data.idx,
					msg: `[${i + 1}/${urls.length}] ${url}`,
					function: 'highlight'
				}
			}, () => chrome.runtime.lastError);
			try {
				const res = await fetch(url);
				const arrayBuffer = await res.arrayBuffer();
				const array = new Uint32Array(arrayBuffer);
				chrome.tabs.sendMessage(data.tabId, {
					from: 'background',
					to: 'content_script',
					subject: 'array_buffers_to_blob',
					data: {
						tabId: data.tabId,
						requestId: data.requestId,
						idx: data.idx,
						url: data.url,
						array: array,
						arrayLength: array.length,
						arrayBuffersIdx: i,
						arrayBuffersLength: urls.length,
					}
				});
			} catch (err) {
				console.log(`[${data.tabId}] [${data.requestId} ${i + 1}/${urls.length}] Error: ${err}`);
				chrome.tabs.sendMessage(data.tabId, {
					from: 'background',
					to: 'content_script',
					subject: 'error',
					data: `[${i + 1}/${urls.length}] Error: ${err}`
				});
				return;
			}
		}
		chrome.tabs.sendMessage(data.tabId, {
			from: 'background',
			to: 'content_script',
			subject: 'blob_to_url',
			data: {
				tabId: data.tabId,
				requestId: data.requestId,
				idx: data.idx,
				url: data.url
			}
		});
	} catch (err) {
		console.log(`[${data.tabId}] [${data.requestId}] Error: ${err}`);
		chrome.tabs.sendMessage(data.tabId, {
			from: 'background',
			to: 'content_script',
			subject: 'error',
			data: `Error: ${err}`
		});
	}
}

async function getPlaylistURL(data) {
	let res = await fetch(data.url);
	let text = await res.text() + '\n';
	let urls = Array.from(text.matchAll(/,\n(.*)\n/g), match =>
		sanitizeURL(new URL(match[1], data.url).href)
	);
	if (urls.length !== 0) {
		return urls;
	}
	urls = {};
	const heights = Array.from(text.matchAll(/RESOLUTION=.*x(.*)\n(.*)\n/g), match => {
		let height = match[1];
		let idx = height.indexOf(',');
		if (idx !== -1) {
			height = height.substring(0, idx);
		}
		urls[height] = sanitizeURL(new URL(match[2], data.url).href);
		return parseInt(height);
	});
	if (heights.length === 0) {
		return false;
	}
	const maxHeight = Math.max(...heights).toString();
	res = await fetch(urls[maxHeight]);
	text = await res.text() + '\n';
	urls = Array.from(text.matchAll(/,\n(.*)\n/g), match =>
		sanitizeURL(new URL(match[1], urls[maxHeight]).href)
	);
	if (urls.length !== 0) {
		return urls;
	}
	return false;
}

function sanitizeURL(url) {
	// Define your custom rules here
	if (url.match(/googleusercontent\.com\/.*&url=.*/g)) {
		matches = Array.from(url.matchAll(/googleusercontent\.com\/.*&url=(.*)/g));
		if (matches[0].length === 2) {
			return matches[0][1];
		}
	}
	return url;
}

function matchURL(data) {
	// Define your custom rules here
	return true;
}

function getHeader(headers, headerName) {
	for (let i = 0; i < headers.length; i++) {
		if (headers[i].name.toLowerCase() === headerName) {
			return headers[i];
		}
	}
}
