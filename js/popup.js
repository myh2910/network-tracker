window.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query(
		{active: true, currentWindow: true},
		tabs => {
			chrome.tabs.sendMessage(tabs[0].id, {
				from: 'popup',
				subject: 'DOMInfo'
			}, requests => {
				const manifest = chrome.runtime.getManifest();
				document.body.querySelector('h2').textContent = `v${manifest.version} by ${manifest.author}`;

				if (!requests) {
					return;
				}

				for (let i = 0; i < requests.length; i++) {
					let statusCode = document.createElement('span');
					statusCode.classList.add('box', 'status');
					statusCode.textContent = requests[i].statusCode;

					const codeColors = [
						'blue', 'green', 'orange', 'red', 'red'
					];

					for (let j = 0; j < codeColors.length; j++) {
						if (requests[i].statusCode / 100 < j + 2) {
							statusCode.style.background = codeColors[j];
							break;
						}
					}

					if (requests[i].statusLine !== "") {
						let statusLine = document.createElement('span');
						statusLine.className = 'tooltip';
						statusLine.textContent = requests[i].statusLine;
	
						statusCode.appendChild(statusLine);
						statusCode.onmouseover = () => {
							statusLine.style.visibility = 'visible';
						};
						statusCode.onmouseleave = () => {
							statusLine.style.visibility = 'hidden';
						};
					}

					let type = document.createElement('span');
					type.className = 'type';
					type.textContent = ` ${requests[i].mimeType || requests[i].type}`;

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
					container.appendChild(statusCode);
					container.appendChild(type);
					container.appendChild(goButton);
					container.appendChild(copyButton);

					let url = document.createElement('div');
					url.className = 'url';
					url.textContent = requests[i].url;

					let elem = document.createElement('li');
					elem.appendChild(container);
					elem.appendChild(url);

					document.body.querySelector('ol').appendChild(elem);
				}
			});
		}
	);
});
