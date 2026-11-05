// Release sources. The key is used in the URL (?source=<key>) so links can be shared.
const SOURCES = {
  official: { label: "Official", owner: "betasharp-official" },
  millenniumambiguity: { label: "Other", owner: "millennIumAMbiguity"},
};
const REPO = "betasharp";
const DEFAULT_SOURCE = "official";


// One cache entry per source, filled on first use only.
// Stores the promise so switching back mid-fetch doesn't fetch twice.
const releaseCache = {};

let currentSource = null;

function getSourceFromUrl() {
  const key = new URLSearchParams(window.location.search).get("source");
  return key && SOURCES[key.toLowerCase()] ? key.toLowerCase() : DEFAULT_SOURCE;
}

function getReleases(sourceKey) {
  if (!releaseCache[sourceKey]) {
    const { owner } = SOURCES[sourceKey];
    const url = `https://git.gay/api/v1/repos/${owner}/${REPO}/releases`;
    releaseCache[sourceKey] = fetch(url, {
      headers: {
        // This enables rendered HTML (body_html)
        Accept: "application/vnd.github+json",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        delete releaseCache[sourceKey]; // allow retry next time
        throw error;
      });
  }
  return releaseCache[sourceKey];
}

function buildSourceSwitch() {
  const switcher = document.getElementById("source-switch");
  Object.entries(SOURCES).forEach(([key, source]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.source = key;
    button.textContent = source.label;
    button.setAttribute("role", "tab");
    button.onclick = () => selectSource(key, true);
    switcher.appendChild(button);
  });
}

async function selectSource(sourceKey, updateUrl) {
  if (sourceKey === currentSource) return;
  currentSource = sourceKey;

  document.querySelectorAll("#source-switch button").forEach((button) => {
    const active = button.dataset.source === sourceKey;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active);
  });

  if (updateUrl) {
    const url = new URL(window.location.href);
    if (sourceKey === DEFAULT_SOURCE) url.searchParams.delete("source");
    else url.searchParams.set("source", sourceKey);
    history.pushState({ source: sourceKey }, "", url);
  }

  const container = document.getElementById("releases");
  container.replaceChildren(statusMessage("Loading releases…"));

  try {
    const releases = await getReleases(sourceKey);
    if (currentSource !== sourceKey) return; // user switched while loading
    container.replaceChildren();
    if (releases.length === 0) {
      container.appendChild(statusMessage("No releases found."));
    } else {
      renderReleases(releases, container);
    }
  } catch (error) {
    if (currentSource !== sourceKey) return;
    container.replaceChildren(statusMessage(`Failed to load releases (${error.message}).`));
  }
}

function statusMessage(text) {
  const p = document.createElement("p");
  p.className = "releases-status";
  p.textContent = text;
  return p;
}

function renderReleases(releases, container) {
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

window.addEventListener("popstate", () => selectSource(getSourceFromUrl(), false));

buildSourceSwitch();
selectSource(getSourceFromUrl(), false);
