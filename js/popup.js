window.addEventListener('DOMContentLoaded', () => {
	chrome.tabs.query({
			active: true,
			currentWindow: true
		}, tabs => {
			chrome.tabs.sendMessage(tabs[0].id, {
				from: 'popup',
				subject: 'DOMInfo'
			}, requests => {
				const manifest = chrome.runtime.getManifest();
				document.body.querySelector('h2').textContent = `v${manifest.version} by ${manifest.author}`;

				if (!requests) { return; }

				document.body.querySelector('ol').style.display = 'block';

				const statusColor = ['blue', 'green', 'orange', 'red', 'red'];
				const maxUrlLength = 297;

				for (let i = 0; i < requests.length; i++) {
					let statusCode = document.createElement('span');
					statusCode.classList.add('box', 'request-status');
					statusCode.textContent = requests[i].statusCode;
					statusCode.style.background = statusColor[Math.floor(requests[i].statusCode / 100) - 1];

					let statusWrapper = document.createElement('div');
					statusWrapper.className = 'wrapper';
					statusWrapper.style.float = 'left';
					statusWrapper.appendChild(statusCode);

					if (requests[i].statusLine !== '') {
						let statusLine = document.createElement('span');
						statusLine.className = 'tooltip';
						statusLine.textContent = requests[i].statusLine;

						statusWrapper.appendChild(statusLine);
					}

					let requestType = document.createElement('span');
					requestType.className = 'request-type';
					requestType.textContent = ` ${requests[i].mimeType || requests[i].type}`;

					let copyButton = document.createElement('a');
					copyButton.classList.add('box', 'button');
					copyButton.textContent = 'COPY';
					copyButton.href = '#';
					copyButton.onclick = () => {
						navigator.clipboard.writeText(requests[i].url);
						return false;
					};

					let goButton = document.createElement('a');
					goButton.classList.add('box', 'button');
					goButton.textContent = 'GO';
					goButton.style.marginLeft = '3px';
					goButton.href = '#';
					goButton.onclick = () => {
						chrome.tabs.create({url: requests[i].url});
						return false;
					};

					let container = document.createElement('div');
					container.className = 'container';
					container.appendChild(statusWrapper);
					container.appendChild(requestType);
					container.appendChild(goButton);
					container.appendChild(copyButton);

					let tabUrl = document.createElement('span');
					tabUrl.className = 'tooltip';
					tabUrl.textContent = (requests[i].tabUrl.length > maxUrlLength)
						? `${requests[i].tabUrl.substring(0, maxUrlLength - 1)}\u2026`
						: requests[i].tabUrl;
					tabUrl.style.wordBreak = 'break-all';

					let requestUrl = document.createElement('span');
					requestUrl.className = 'request-url';
					requestUrl.textContent = requests[i].url;

					let urlWrapper = document.createElement('div');
					urlWrapper.className = 'wrapper';
					urlWrapper.appendChild(requestUrl);
					urlWrapper.appendChild(tabUrl);

					let requestData = document.createElement('li');
					requestData.appendChild(container);
					requestData.appendChild(urlWrapper);

					document.body.querySelector('ol').appendChild(requestData);
				}

				document.body.querySelectorAll('.tooltip').forEach(item => {
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
			});
		}
	);
});
