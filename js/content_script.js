let arrayBuffers = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.to === 'content_script') {
		if (message.from === 'popup' && message.subject === 'download_playlist') {
			downloadPlaylist(message.data);
		} else if (message.from === 'background' && message.subject === 'array_buffers_to_blob') {
			arrayBuffersToBlob(message.data);
		} else if (message.from === 'background' && message.subject === 'blob_to_url') {
			blobToURL(message.data);
		} else if (message.from === 'background' && message.subject === 'error') {
			alert(message.data);
		}
	}
});

function downloadPlaylist(data) {
	try {
		if (arrayBuffers[data.requestId] instanceof Blob) {
			blobToURL(data);
		} else {
			chrome.runtime.sendMessage({
				from: 'content_script',
				to: 'background',
				subject: 'get_array_buffers',
				data: data
			});
		}
	} catch (err) {
		alert(`Error: ${err}`);
	}
}

function blobToURL(data) {
	try {
		if (arrayBuffers[data.requestId] instanceof Blob) {
			chrome.runtime.sendMessage({
					from: 'content_script',
					to: 'background',
					subject: 'download_blob_url',
					data: URL.createObjectURL(arrayBuffers[data.requestId])
				}, url => {
					URL.revokeObjectURL(url);
			});
			chrome.runtime.sendMessage({
				from: 'content_script',
				to: 'popup',
				subject: 'update_status',
				data: {
					tabId: data.tabId,
					idx: data.idx,
					msg: data.url,
					function: 'end-highlight'
				}
			}, () => chrome.runtime.lastError);
		}
	} catch (err) {
		alert(`Error: ${err}`);
	}
}

function arrayBuffersToBlob(data) {
	try {
		if (!arrayBuffers[data.requestId]) {
			arrayBuffers[data.requestId] = new Array(data.arrayBuffersLength);
		}
		if (arrayBuffers[data.requestId] instanceof Array) {
			let i = 0;
			const array = new Uint32Array(data.arrayLength).fill().map(() => data.array[i++]);
			arrayBuffers[data.requestId][data.arrayBuffersIdx] = array.buffer;
			if (arrayBuffers[data.requestId].filter(Boolean).length === data.arrayBuffersLength) {
				arrayBuffers[data.requestId] = new Blob(arrayBuffers[data.requestId], {type: 'video/mp4'});
			}
		}
	} catch (err) {
		alert(`Error: ${err}`);
	}
}
