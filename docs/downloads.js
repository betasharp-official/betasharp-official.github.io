const owner = "betasharp-official";
const repo = "betasharp";

async function fetchReleases() {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
  const response = await fetch(url, {
    headers: {
      // This enables rendered HTML (body_html)
      Accept: "application/vnd.github+json",
    },
  });

  const releases = await response.json();

  const container = document.getElementById("releases");

  releases.forEach((release) => {
    const div = document.createElement("a");
    div.className = "release";
    div.onclick = function (event) {
      if (event.target.nodeName === "H3" || event.target.nodeName === "SPAN") {
        window.location = release.html_url;
      }
    };

    const title = document.createElement("h3");
    title.textContent = release.name || release.tag_name;

    if (release.prerelease) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Pre-release";
      title.appendChild(badge);
    }

    const assetsDiv = document.createElement("div");
    assetsDiv.className = "assets";

    if (release.assets.length === 0) {
      const noAssets = document.createElement("p");
      noAssets.textContent = "No downloadable files.";
      assetsDiv.appendChild(noAssets);
    } else {
      release.assets.forEach((asset) => {
        const assetWrapper = document.createElement("div");

        const link = document.createElement("a");
        link.href = asset.browser_download_url;
        link.textContent = asset.name;
        link.download = release.name + "-" + asset.name;
        assetWrapper.appendChild(link);

        const downloadCount = document.createElement("p");
        downloadCount.textContent = `${asset.download_count} ↓`;
        assetWrapper.appendChild(downloadCount);

        assetsDiv.appendChild(assetWrapper);
      });
    }

    const date = document.createElement("p");
    const releaseDate = new Date(release.published_at);
    date.textContent = `${releaseDate.toLocaleDateString()}`;
    title.appendChild(date);

    div.appendChild(title);
    div.appendChild(assetsDiv);

    if (release.reactions && release.reactions.total_count > 0) {
      const reactionsDiv = document.createElement("div");
      reactionsDiv.className = "reactions";

      const reactionMap = {
        "+1": "👍",
        //"-1": "👎",
        laugh: "😄",
        hooray: "🎉",
        //confused: "😕",
        heart: "❤️",
        rocket: "🚀",
        eyes: "👀",
      };

      Object.entries(reactionMap).forEach(([key, emoji]) => {
        const count = release.reactions[key];
        if (count && count > 0) {
          const span = document.createElement("span");
          span.textContent = `${emoji} ${count}`;
          reactionsDiv.appendChild(span);
        }
      });

      if (reactionsDiv.childElementCount > 0) {
        div.appendChild(reactionsDiv);
      }
    }

    container.appendChild(div);
  });
}

fetchReleases();
