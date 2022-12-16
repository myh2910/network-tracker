const arrayBuffers = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.to === 'content_script') {
		if (message.subject === 'download_playlist') {
			downloadPlaylist(message.data);
		} else if (message.subject === 'arrays_to_blob') {
			arraysToBlob(message.data);
		} else if (message.subject === 'blob_to_url') {
			blobToURL(message.data);
		} else if (message.subject === 'alert') {
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
				subject: 'get_arrays',
				data: data
			});
		}
	} catch (err) {
		alert(`[R${data.requestId}] ${err}`);
	}
}

function arraysToBlob(data) {
	try {
		if (!arrayBuffers[data.requestId]) {
			arrayBuffers[data.requestId] = new Array(data.length);
		}
		if (arrayBuffers[data.requestId] instanceof Array) {
			arrayBuffers[data.requestId][data.idx] = Uint32Array.from(data.array).buffer;
			if (arrayBuffers[data.requestId].filter(Boolean).length === data.length) {
				arrayBuffers[data.requestId] = new Blob(arrayBuffers[data.requestId], {type: 'video/mp4'});
			}
		}
	} catch (err) {
		alert(`[R${data.requestId}] ${err}`);
	}
}

function blobToURL(data) {
	try {
		if (arrayBuffers[data.requestId] instanceof Blob) {
			chrome.runtime.sendMessage({
				from: 'content_script',
				to: 'background',
				subject: 'download_file',
				data: {
					requestId: data.requestId,
					url: URL.createObjectURL(arrayBuffers[data.requestId])
				}
			});
		}
	} catch (err) {
		alert(`[R${data.requestId}] ${err}`);
	}
}
