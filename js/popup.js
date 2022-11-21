window.addEventListener('DOMContentLoaded', () => {
	const manifest = chrome.runtime.getManifest();
	document.body.querySelector('h2').textContent = `v${manifest.version} by ${manifest.author}`;

	chrome.tabs.query({
			active: true,
			currentWindow: true
		}, tabs => {
			const tabId = tabs[0].id.toString();

			let contentTable = document.createElement('table');

			chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
				if (message.to === 'popup' && message.data.tabId === tabId) {
					if (message.subject === 'update_status') {
						let msg = contentTable.querySelector(`tr:nth-child(${2 * message.data.idx}) div.request-url`);
						if (msg) {
							msg.textContent = message.data.msg;
						}
					}
				}
			});

			chrome.storage.local.get(tabId, local => {
				updatePage(local[tabId]);
			});

			chrome.storage.onChanged.addListener((changes, name) => {
				if (name === 'local') {
					for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
						if (key === tabId) {
							updatePage(newValue);
						}
					}
				}
			});

			let numContent = 0;

			function updatePage(data) {
				if (data && data.length > numContent) {
					if (numContent === 0) {
						document.body.appendChild(contentTable);
					}
					for (let i = numContent; i < data.length; i++) {
						numContent++;
						data[i].idx = numContent;
						updateData(data[i]);
					}
				}
			}

			function updateData(data) {
				let statusCode = document.createElement('div');
				statusCode.classList.add('box', 'request-status');
				statusCode.textContent = data.statusCode;
				statusCode.style.background = [
					'blue', 'green', 'orange', 'red', 'red'
				][Math.floor(data.statusCode / 100) - 1];

				let statusWrapper = document.createElement('div');
				statusWrapper.className = 'tooltip-wrap';
				statusWrapper.style.float = 'left';
				statusWrapper.appendChild(statusCode);

				if (data.statusLine !== '') {
					let statusLine = document.createElement('div');
					statusLine.classList.add('box', 'tooltip');
					statusLine.textContent = data.statusLine;
					statusLine.style.minWidth = '12ch';

					statusWrapper.appendChild(statusLine);
				}

				let requestType = document.createElement('div');
				requestType.classList.add('box', 'request-type');
				requestType.textContent = data.mimeType || data.type;

				let copyUrlButton = document.createElement('a');
				copyUrlButton.classList.add('box', 'button');
				copyUrlButton.textContent = 'COPY URL';
				copyUrlButton.href = '#';
				copyUrlButton.onclick = () => {
					navigator.clipboard.writeText(data.url);
					return false;
				};

				let downloadFileButton = document.createElement('a');
				downloadFileButton.classList.add('box', 'button', 'download');
				downloadFileButton.textContent = 'DOWNLOAD';
				downloadFileButton.href = '#';
				downloadFileButton.onclick = () => {
					chrome.runtime.sendMessage({
						from: 'popup',
						to: 'background',
						subject: 'download_file',
						data: data
					});
					return false;
				};

				let cell1 = document.createElement('td');

				let cell2 = document.createElement('td');
				cell2.appendChild(statusWrapper);
				cell2.appendChild(requestType);
				cell2.appendChild(copyUrlButton);

				if (data.responseHeaders) {
					let copyResponseButton = document.createElement('a');
					copyResponseButton.classList.add('box', 'button');
					copyResponseButton.textContent = 'COPY RESPONSE';
					copyResponseButton.href = '#';
					copyResponseButton.onclick = () => {
						copyJSON(data.responseHeaders);
						return false;
					};
					cell2.appendChild(copyResponseButton);
				}

				if (data.requestHeaders) {
					let copyRequestButton = document.createElement('a');
					copyRequestButton.classList.add('box', 'button');
					copyRequestButton.textContent = 'COPY REQUEST';
					copyRequestButton.href = '#';
					copyRequestButton.onclick = () => {
						copyJSON(data.requestHeaders);
						return false;
					};
					cell2.appendChild(copyRequestButton);
				}

				if (matchPlaylist(data)) {
					let downloadPlaylistButton = document.createElement('a');
					downloadPlaylistButton.classList.add('box', 'button', 'download');
					downloadPlaylistButton.textContent = 'DOWNLOAD PLAYLIST';
					downloadPlaylistButton.href = '#';
					downloadPlaylistButton.onclick = () => {
						chrome.runtime.sendMessage({
							from: 'popup',
							to: 'background',
							subject: 'download_playlist',
							data: data
						});
						return false;
					};
					cell2.appendChild(downloadPlaylistButton);
				}

				cell2.appendChild(downloadFileButton);

				let cell3 = document.createElement('td');
				cell3.className = 'request-idx';
				cell3.textContent = `[${numContent}]:`;

				let requestUrl = document.createElement('div');
				requestUrl.className = 'request-url';
				requestUrl.textContent = data.url;

				let cell4 = document.createElement('td');
				cell4.className = 'tooltip-wrap';
				cell4.appendChild(requestUrl);

				if (data.tabUrl) {
					let fitContent = document.createElement('span');
					fitContent.className = 'fit-content';
					fitContent.textContent = data.tabUrl;

					let tabUrl = document.createElement('div');
					tabUrl.classList.add('box', 'tooltip');
					tabUrl.appendChild(fitContent);

					cell4.appendChild(tabUrl);
				}

				let row1 = document.createElement('tr');
				row1.appendChild(cell1);
				row1.appendChild(cell2);

				let row2 = document.createElement('tr');
				row2.appendChild(cell3);
				row2.appendChild(cell4);

				row1.querySelectorAll('.tooltip').forEach(tooltipHover);
				row2.querySelectorAll('.tooltip').forEach(tooltipHover);

				contentTable.appendChild(row1);
				contentTable.appendChild(row2);
			}
	});
});

function matchPlaylist(data) {
	// Define your custom rules here
	return (
		data.mimeType === 'application/vnd.apple.mpegurl'
		|| data.url.includes('master.txt')
		|| data.url.includes('.m3u8')
	);
}

function copyJSON(object) {
	str = '{\n';
	object.forEach(item => {
		str += `\t'${item.name.replace(/'/g, '\\\'')}': '${item.value.replace(/'/g, '\\\'')}',\n`
	});
	str += '}';
	navigator.clipboard.writeText(str);
}

function tooltipHover(item) {
	item.previousElementSibling.onmouseenter = () => {
		item.style.bottom = 'calc(100% + 3px)';
		item.style.visibility = 'visible';
		item.style.opacity = '1';
	};
	item.previousElementSibling.onmouseleave = () => {
		item.style.bottom = '100%';
		item.style.visibility = 'hidden';
		item.style.opacity = '0';
	};
}
