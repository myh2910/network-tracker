let arrayBuffers = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.to === 'content_script') {
		if (message.from === 'background' && message.subject === 'alert') {
			alert(message.data);
		} else if (message.from === 'background' && message.subject === 'download_playlist') {
			downloadPlaylist(message.data);
		}
	}
});

function downloadPlaylist(data) {
	try {
		let i = 0;
		const array = new Uint32Array(data.arrayLength).fill().map(() => data.array[i++]);
		if (data.urlsIdx === 0) {
			arrayBuffers[data.requestId] = [];
		} if (arrayBuffers[data.requestId]) {
			arrayBuffers[data.requestId].push(array.buffer);
		}
		if (data.urlsIdx + 1 === data.urlsLength) {
			if (arrayBuffers[data.requestId].length !== data.urlsLength) {
				throw `Cannot download ${data.url}`;
			}
			const blob = new Blob(arrayBuffers[data.requestId], {type: 'video/mp4'});
			chrome.runtime.sendMessage({
					from: 'content_script',
					to: 'background',
					subject: 'download_playlist',
					data: URL.createObjectURL(blob)
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
					msg: data.url
				}
			}, () => chrome.runtime.lastError);
		}
	} catch (err) {
		alert(`Error: ${err}`);
	}
}
