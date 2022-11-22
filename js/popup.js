window.addEventListener('DOMContentLoaded', () => {
	const manifest = chrome.runtime.getManifest();
	document.body.querySelector('h2').textContent = `v${manifest.version} by ${manifest.author}`;

	chrome.tabs.query({
			active: true,
			currentWindow: true
		}, tabs => {
			const tabId = tabs[0].id;
			const contentTable = document.createElement('table');

			chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
				if (message.to === 'popup' && message.data.tabId === tabId) {
					if (message.subject === 'update_status') {
						const row1 = contentTable.querySelector(`tr:nth-child(${2 * message.data.idx - 1})`);
						if (!row1) {
							return;
						}
						const row2 = row1.nextElementSibling;
						if (message.data.msg) {
							const cell = row2.querySelector('div.request-url');
							cell.textContent = message.data.msg;
						}
						if (message.data.function === 'highlight') {
							row1.classList.add('change-color');
							row2.classList.add('change-color');
							setTimeout(() => {
								row1.classList.remove('change-color');
								row2.classList.remove('change-color');
								row1.classList.add('highlight');
								row2.classList.add('highlight');
							}, 500);
						} else if (message.data.function === 'end-highlight') {
							row1.classList.remove('highlight');
							row2.classList.remove('highlight');
						}
					}
				}
			});

			chrome.storage.local.get(tabId.toString(), local => {
				updatePage(local[tabId.toString()]);
			});

			chrome.storage.onChanged.addListener((changes, name) => {
				if (name === 'local') {
					for (const [key, {oldValue, newValue}] of Object.entries(changes)) {
						if (key === tabId.toString()) {
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
				const statusCode = document.createElement('div');
				statusCode.classList.add('box', 'request-status');
				statusCode.textContent = data.statusCode;
				statusCode.style.background = [
					'blue', 'green', 'orange', 'red', 'red'
				][Math.floor(data.statusCode / 100) - 1];

				const statusWrapper = document.createElement('div');
				statusWrapper.className = 'tooltip-wrap';
				statusWrapper.style.float = 'left';
				statusWrapper.appendChild(statusCode);

				if (data.statusLine !== '') {
					const statusLine = document.createElement('div');
					statusLine.classList.add('box', 'tooltip');
					statusLine.textContent = data.statusLine;
					statusLine.style.minWidth = '12ch';

					statusWrapper.appendChild(statusLine);
				}

				const requestType = document.createElement('div');
				requestType.classList.add('box', 'request-type');
				requestType.textContent = data.mimeType || data.type;

				const copyURLButton = document.createElement('a');
				copyURLButton.classList.add('box', 'button', 'copy');
				copyURLButton.textContent = 'COPY URL';
				copyURLButton.href = '#';
				copyURLButton.onclick = () => {
					navigator.clipboard.writeText(data.url);
					return false;
				};

				const downloadFileButton = document.createElement('a');
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

				const cell1 = document.createElement('td');

				const cell2 = document.createElement('td');
				cell2.appendChild(statusWrapper);
				cell2.appendChild(requestType);
				cell2.appendChild(copyURLButton);

				if (data.responseHeaders) {
					const copyResponseButton = document.createElement('a');
					copyResponseButton.classList.add('box', 'button', 'copy');
					copyResponseButton.textContent = 'COPY RESPONSE';
					copyResponseButton.href = '#';
					copyResponseButton.onclick = () => {
						copyJSON(data.responseHeaders);
						return false;
					};
					cell2.appendChild(copyResponseButton);
				}

				if (data.requestHeaders) {
					const copyRequestButton = document.createElement('a');
					copyRequestButton.classList.add('box', 'button', 'copy');
					copyRequestButton.textContent = 'COPY REQUEST';
					copyRequestButton.href = '#';
					copyRequestButton.onclick = () => {
						copyJSON(data.requestHeaders);
						return false;
					};
					cell2.appendChild(copyRequestButton);
				}

				if (matchPlaylist(data)) {
					const downloadPlaylistButton = document.createElement('a');
					downloadPlaylistButton.classList.add('box', 'button', 'download');
					downloadPlaylistButton.textContent = 'DOWNLOAD PLAYLIST';
					downloadPlaylistButton.href = '#';
					downloadPlaylistButton.onclick = () => {
						chrome.tabs.sendMessage(tabId, {
							from: 'popup',
							to: 'content_script',
							subject: 'download_playlist',
							data: data
						});
						return false;
					};
					cell2.appendChild(downloadPlaylistButton);
				}

				cell2.appendChild(downloadFileButton);

				const cell3 = document.createElement('td');
				cell3.className = 'request-idx';
				cell3.textContent = `[${numContent}]:`;

				const requestURL = document.createElement('div');
				requestURL.className = 'request-url';
				requestURL.textContent = data.url;

				const cell4 = document.createElement('td');
				cell4.className = 'tooltip-wrap';
				cell4.appendChild(requestURL);

				if (data.tabURL) {
					const fitContent = document.createElement('span');
					fitContent.className = 'fit-content';
					fitContent.textContent = data.tabURL;

					const tabURL = document.createElement('div');
					tabURL.classList.add('box', 'tooltip');
					tabURL.appendChild(fitContent);

					cell4.appendChild(tabURL);
				}

				const row1 = document.createElement('tr');
				row1.appendChild(cell1);
				row1.appendChild(cell2);

				const row2 = document.createElement('tr');
				row2.appendChild(cell3);
				row2.appendChild(cell4);

				animateOnHover(row1, row2);

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
		|| data.url.includes('/m3/')
	);
}

function copyJSON(object) {
	let text = '{\n';
	object.forEach(item => {
		text += `\t'${item.name.replace(/'/g, '\\\'')}': '${item.value.replace(/'/g, '\\\'')}',\n`
	});
	text += '}';
	navigator.clipboard.writeText(text);
}

function animateOnHover(row1, row2) {
	for (const row of [row1, row2]) {
		row.onmouseenter = () => {
			row1.classList.add('focused');
			row2.classList.add('focused');
		};
		row.onmouseleave = () => {
			row1.classList.remove('focused');
			row2.classList.remove('focused');
		};
		row.querySelectorAll('.tooltip').forEach(item => {
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
		});
	}
}
