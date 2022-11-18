let requestHeaders = {};

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

function matchUrl(data) {
	// Write your custom function here
	return true;
}

function getHeader(headers, headerName) {
	for (let i = 0; i < headers.length; i++) {
		if (headers[i].name.toLowerCase() === headerName) {
			return headers[i];
		}
	}
}
