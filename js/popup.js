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

				const table = document.createElement('table');
				document.body.appendChild(table);

				for (let i = 0; i < requests.length; i++) {
					let statusCode = document.createElement('div');
					statusCode.classList.add('box', 'request-status');
					statusCode.textContent = requests[i].statusCode;
					statusCode.style.background = [
						'blue', 'green', 'orange', 'red', 'red'
					][Math.floor(requests[i].statusCode / 100) - 1];

					let statusWrapper = document.createElement('div');
					statusWrapper.className = 'tooltip-wrap';
					statusWrapper.style.float = 'left';
					statusWrapper.appendChild(statusCode);

					if (requests[i].statusLine !== '') {
						let statusLine = document.createElement('div');
						statusLine.classList.add('box', 'tooltip');
						statusLine.textContent = requests[i].statusLine;
						statusLine.style.minWidth = '12ch';

						statusWrapper.appendChild(statusLine);
					}

					let requestType = document.createElement('div');
					requestType.classList.add('box', 'request-type');
					requestType.textContent = requests[i].mimeType || requests[i].type;

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
					goButton.href = '#';
					goButton.onclick = () => {
						chrome.tabs.create({url: requests[i].url});
						return false;
					};

					let cell1 = document.createElement('td');

					let cell2 = document.createElement('td');
					cell2.appendChild(statusWrapper);
					cell2.appendChild(requestType);
					cell2.appendChild(goButton);
					cell2.appendChild(copyButton);

					let cell3 = document.createElement('td');
					cell3.className = 'request-idx';
					cell3.textContent = `[${i + 1}]:`;

					let fitContent = document.createElement('span');
					fitContent.className = 'fit-content';
					fitContent.textContent = requests[i].tabUrl;

					let tabUrl = document.createElement('div');
					tabUrl.classList.add('box', 'tooltip');
					tabUrl.appendChild(fitContent);

					let requestUrl = document.createElement('div');
					requestUrl.className = 'request-url';
					requestUrl.textContent = requests[i].url;

					let cell4 = document.createElement('td');
					cell4.className = 'tooltip-wrap';
					cell4.appendChild(requestUrl);
					cell4.appendChild(tabUrl);

					let row1 = document.createElement('tr');
					row1.appendChild(cell1);
					row1.appendChild(cell2);

					let row2 = document.createElement('tr');
					row2.appendChild(cell3);
					row2.appendChild(cell4);

					table.appendChild(row1);
					table.appendChild(row2);
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
