window.addEventListener("DOMContentLoaded", () => {
  const manifest = chrome.runtime.getManifest();
  document.body.querySelector(
    "h2"
  ).textContent = `v${manifest.version} by ${manifest.author}`;

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    (tabs) => {
      const tabId = tabs[0].id;
      const contentTable = document.createElement("table");
      let numContent = 0;

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.to === "popup" && message.data.tabId === tabId) {
          if (message.subject === "update_status") {
            updateStatus(message.data);
          }
        }
      });

      chrome.storage.local.get(tabId.toString(), (storage) => {
        updatePage(storage[tabId.toString()]);
      });

      chrome.storage.onChanged.addListener((changes, name) => {
        if (name === "local") {
          for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key === tabId.toString()) {
              updatePage(newValue);
            }
          }
        }
      });

      function updateStatus(data) {
        const tbody = contentTable.querySelector(
          `tbody:nth-child(${data.idx + 1})`
        );
        if (!tbody) {
          return;
        }
        const cell = tbody.querySelector(".request-url");
        if (data.downloadStatus) {
          updateDownloadStatus(tbody, cell, data.downloadStatus);
        } else {
          tbody.style.backgroundColor = null;
          cell.style.background = null;
          cell.textContent = data.url;
        }
      }

      function updateDownloadStatus(tbody, cell, status) {
        if (status) {
          tbody.style.backgroundColor = "#ffff8f";
          cell.style.background = `linear-gradient(to right, lime ${status.perc}%, lightcyan ${status.perc}%)`;
          cell.textContent = status.msg;
        }
      }

      function updatePage(object) {
        if (object instanceof Array && object.length) {
          if (!numContent) {
            document.body.appendChild(contentTable);
          }
          while (numContent < object.length) {
            updateData(object[numContent++]);
          }
        }
      }

      function updateData(data) {
        const statusCode = document.createElement("div");
        statusCode.classList.add("box", "request-status");
        statusCode.textContent = data.statusCode;
        statusCode.style.background = ["blue", "green", "orange", "red", "red"][
          Math.floor(data.statusCode / 100) - 1
        ];

        const statusWrapper = document.createElement("div");
        statusWrapper.className = "tooltip-wrap";
        statusWrapper.appendChild(statusCode);

        if (data.statusLine !== "") {
          const statusLine = document.createElement("div");
          statusLine.classList.add("box", "tooltip");
          statusLine.textContent = data.statusLine;

          statusWrapper.appendChild(statusLine);
        }

        const requestType = document.createElement("div");
        requestType.classList.add("box", "request-type");
        requestType.textContent = data.mimeType || data.type;

        const copyURLButton = document.createElement("a");
        copyURLButton.classList.add("box", "button", "copy");
        copyURLButton.textContent = "COPY URL";
        copyURLButton.onclick = () => {
          navigator.clipboard.writeText(data.url);
        };

        const downloadFileButton = document.createElement("a");
        downloadFileButton.classList.add("box", "button", "download");
        downloadFileButton.textContent = "DOWNLOAD";
        downloadFileButton.onclick = () => {
          chrome.runtime.sendMessage({
            from: "popup",
            to: "background",
            subject: "download_file",
            data: data,
          });
        };

        const cell1 = document.createElement("td");

        const cell2 = document.createElement("td");
        cell2.appendChild(statusWrapper);
        cell2.appendChild(requestType);
        cell2.appendChild(copyURLButton);

        if (data.responseHeaders) {
          const copyResponseButton = document.createElement("a");
          copyResponseButton.classList.add("box", "button", "copy");
          copyResponseButton.textContent = "COPY RESPONSE";
          copyResponseButton.onclick = () => {
            stringifyHeaders(data.responseHeaders);
          };
          cell2.appendChild(copyResponseButton);
        }

        if (data.requestHeaders) {
          const copyRequestButton = document.createElement("a");
          copyRequestButton.classList.add("box", "button", "copy");
          copyRequestButton.textContent = "COPY REQUEST";
          copyRequestButton.onclick = () => {
            stringifyHeaders(data.requestHeaders);
          };
          cell2.appendChild(copyRequestButton);
        }

        if (data.isPlaylist) {
          const downloadPlaylistButton = document.createElement("a");
          downloadPlaylistButton.classList.add("box", "button", "download");
          downloadPlaylistButton.textContent = "DOWNLOAD PLAYLIST";
          downloadPlaylistButton.onclick = () => {
            chrome.tabs.sendMessage(
              data.tabId,
              {
                from: "popup",
                to: "content_script",
                subject: "download_playlist",
                data: data,
              },
              () => chrome.runtime.lastError
            );
          };
          cell2.appendChild(downloadPlaylistButton);
        }

        cell2.appendChild(downloadFileButton);

        const cell3 = document.createElement("td");
        cell3.className = "request-idx";
        cell3.textContent = `[${data.idx + 1}]:`;

        const requestURL = document.createElement("div");
        requestURL.className = "request-url";
        requestURL.textContent = data.url;

        const cell4 = document.createElement("td");
        cell4.className = "tooltip-wrap";
        cell4.appendChild(requestURL);

        if (data.tabURL) {
          const fitContent = document.createElement("span");
          fitContent.className = "fit-content";
          fitContent.textContent = data.tabURL;

          const tabURL = document.createElement("div");
          tabURL.classList.add("box", "tooltip");
          tabURL.appendChild(fitContent);

          cell4.appendChild(tabURL);
        }

        const row1 = document.createElement("tr");
        row1.appendChild(cell1);
        row1.appendChild(cell2);

        const row2 = document.createElement("tr");
        row2.appendChild(cell3);
        row2.appendChild(cell4);

        const tbody = document.createElement("tbody");
        tbody.appendChild(row1);
        tbody.appendChild(row2);

        if (data.downloadStatus) {
          updateDownloadStatus(tbody, requestURL, data.downloadStatus);
        }

        contentTable.appendChild(tbody);
      }

      function stringifyHeaders(headers) {
        let text = "{";
        let isStart = true;
        headers.forEach((item) => {
          if (isStart) {
            isStart = false;
          } else {
            text += ",";
          }
          itemName = item.name.replace(/'/g, "\\'");
          itemValue = item.value.replace(/'/g, "\\'");
          text += `\n  '${itemName}': '${itemValue}'`;
        });
        text += "\n}";
        navigator.clipboard.writeText(text);
      }
    }
  );
});
