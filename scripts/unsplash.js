const UNSPLASH_API_BASE = "https://api.unsplash.com";
const UTM_SOURCE = process.env.UTM_SOURCE || "cctlab";
const UTM_MEDIUM = process.env.UTM_MEDIUM || "referral";

function getAccessKey() {
  return process.env.UNSPLASH_ACCESS_KEY || "";
}

function buildHeaders() {
  return {
    Authorization: `Client-ID ${getAccessKey()}`,
    "Accept-Version": "v1"
  };
}

function appendUtm(url) {
  const u = new URL(url);
  u.searchParams.set("utm_source", UTM_SOURCE);
  u.searchParams.set("utm_medium", UTM_MEDIUM);
  return u.toString();
}

async function trackDownload(downloadLocation) {
  if (!downloadLocation || !getAccessKey()) return;

  try {
    await fetch(downloadLocation, {
      method: "GET",
      headers: buildHeaders()
    });
  } catch (error) {
    console.warn("unsplash download tracking failed:", error.message);
  }
}

function normalizePhoto(photo) {
  if (!photo) return null;

  return {
    id: photo.id,
    imageUrl: photo?.urls?.regular || photo?.urls?.full || "",
    alt: photo.alt_description || photo.description || "",
    photographerName: photo?.user?.name || "",
    photographerUrl: photo?.user?.links?.html ? appendUtm(photo.user.links.html) : "",
    unsplashUrl: appendUtm("https://unsplash.com/"),
    downloadLocation: photo?.links?.download_location || ""
  };
}

async function searchUnsplashPhoto(query) {
  if (!query || !getAccessKey()) return null;

  const url = new URL(`${UNSPLASH_API_BASE}/search/photos`);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("per_page", "10");
  url.searchParams.set("page", "1");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders()
    });

    if (!res.ok) {
      console.warn("unsplash search failed:", res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const first = data?.results?.[0];
    const photo = normalizePhoto(first);

    if (!photo || !photo.imageUrl) return null;

    await trackDownload(photo.downloadLocation);

    return photo;
  } catch (error) {
    console.warn("unsplash search error:", error.message);
    return null;
  }
}

module.exports = {
  searchUnsplashPhoto
};