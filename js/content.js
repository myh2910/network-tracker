let requests = [];

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if ((request.from === 'background') && (request.subject === 'requestInfo')) {
			let details = request.content;
			requests.push(details);
		} else if ((request.from === 'popup') && (request.subject === 'DOMInfo')) {
			sendResponse(requests);
		}
	}
);
