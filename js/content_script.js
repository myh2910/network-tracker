chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.to === 'content_script') {
		if (message.from === 'background' && message.subject === 'download_playlist') {
			downloadPlaylist(message.data);
			chrome.runtime.sendMessage({
				from: 'content_script',
				to: 'popup',
				subject: 'update_status',
				data: {idx: message.data.idx, msg: message.data.url}
			});
		} else if (message.from === 'background' && message.subject === 'alert') {
			alert(message.data);
		}
	}
});

async function downloadPlaylist(data) {
	if (data.urls.length === 0) {
		alert(`Error: Cannot download ${data.url}`);
		return false;
	}
	let blobs = [];
	for (const [idx, url] of data.urls.entries()) {
		chrome.runtime.sendMessage({
			from: 'content_script',
			to: 'popup',
			subject: 'update_status',
			data: {idx: data.idx, msg: `[${idx + 1}/${data.urls.length}] ${url}`}
		});
		try {
			const _res = await fetch(url);
			const _blob = await _res.blob();
			blobs.push(_blob);
		} catch (err) {
			alert(`[${idx + 1}/${data.urls.length}] Error: ${err}`);
			return false;
		}
	}
	const blob = new Blob(blobs, {type: 'video/mp4'});
	chrome.runtime.sendMessage({
			from: 'content_script',
			to: 'background',
			subject: 'download_playlist',
			data: URL.createObjectURL(blob)
		}, url => {
			URL.revokeObjectURL(url);
	});
}
