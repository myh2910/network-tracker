chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.to === 'background') {
		if (message.from === 'popup' && message.subject === 'download_file') {
			chrome.downloads.download({url: message.data.url});
		} else if (message.from === 'popup' && message.subject === 'download_playlist') {
			downloadPlaylist(message.data);
		} else if (message.from === 'content_script' && message.subject === 'download_playlist') {
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

			details.tabUrl = tab.url;
			let header = getHeader(details.responseHeaders, 'content-type');
			details.mimeType = header && header.value.split(';', 1)[0];

			if (matchUrl(details)) {
				if (requestHeaders[details.requestId]) {
					details.requestHeaders = requestHeaders[details.requestId];
				}
				const tabId = details.tabId.toString();
				chrome.storage.local.get(tabId, local => {
					let object = local[tabId];
					if (object) {
						object.push(details);
					} else {
						object = [details];
					}

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

async function downloadPlaylist(data) {
	try {
		const res = await fetch(data.url);
		const text = await res.text();
		const urls = Array.from((text + '\n').matchAll(/,\n(.*)\n/g), match => 
			sanitizeUrl(new URL(match[1], data.url).href)
		);
		chrome.tabs.sendMessage(data.tabId, {
			from: 'background',
			to: 'content_script',
			subject: 'download_playlist',
			data: {idx: data.idx, url: data.url, urls: urls}
		});
	} catch (err) {
		chrome.tabs.sendMessage(data.tabId, {
			from: 'background',
			to: 'content_script',
			subject: 'alert',
			data: `Error: ${err}`
		});
	}
}

function sanitizeUrl(url) {
	// Define your custom rules here
	if (url.match(/googleusercontent\.com\/.*&url=.*/g)) {
		matches = Array.from(url.matchAll(/googleusercontent\.com\/.*&url=(.*)/g));
		if (matches[0].length === 2) {
			return matches[0][1];
		}
	}
	return url;
}

function matchUrl(data) {
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
