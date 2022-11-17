window.addEventListener('DOMContentLoaded', () => {
	const manifest = chrome.runtime.getManifest();
	document.body.querySelector('h2').textContent = `v${manifest.version} by ${manifest.author}`;

	chrome.tabs.query({
			active: true,
			currentWindow: true
		}, tabs => {
			const tabId = tabs[0].id.toString();

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
	});
});

let contentTable = document.createElement('table');
let numContent = 0;

function updatePage(data) {
	if (data && data.length > numContent) {
		if (numContent === 0) {
			document.body.appendChild(contentTable);
		}
		for (let i = numContent; i < data.length; i++) {
			numContent++;
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

	let copyButton = document.createElement('a');
	copyButton.classList.add('box', 'button');
	copyButton.textContent = 'COPY URL';
	copyButton.href = '#';
	copyButton.onclick = () => {
		navigator.clipboard.writeText(data.url);
		return false;
	};

	let goButton = document.createElement('a');
	goButton.classList.add('box', 'button');
	goButton.textContent = 'GO';
	goButton.href = '#';
	goButton.onclick = () => {
		chrome.tabs.create({url: data.url});
		return false;
	};

	let cell1 = document.createElement('td');

	let cell2 = document.createElement('td');
	cell2.appendChild(statusWrapper);
	cell2.appendChild(requestType);
	cell2.appendChild(goButton);
	cell2.appendChild(copyButton);

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
