chrome.webNavigation.onBeforeNavigate.addListener(details => {
	console.log('Starting...')
});

chrome.webRequest.onHeadersReceived.addListener(details => {
	if (details.tabId !== -1) {
		let header = getHeader(details.responseHeaders, 'content-type');
		details.mimeType = header && header.value.split(';', 1)[0];
		if (matchURL(details)) {
			chrome.tabs.sendMessage(details.tabId, {
				from: 'background',
				subject: 'requestInfo',
				content: details
			});
		}
	}
}, {
	urls: ['<all_urls>']
}, ['responseHeaders']);

function matchURL(details) {
	// Write your custom function here
	return true;
}

function getHeader(headers, headerName) {
	for (var i = 0; i < headers.length; ++i) {
		let header = headers[i];
		if (header.name.toLowerCase() === headerName) {
			return header;
		}
	}
}
