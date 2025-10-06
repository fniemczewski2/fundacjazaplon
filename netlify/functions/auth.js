const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  OAUTH_REDIRECT_URI, // np. https://twoja-domena.netlify.app/.netlify/functions/auth/callback
  GITHUB_SCOPE = "public_repo,user:email",
} = process.env;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
  const pathname = url.pathname;

  try {
    // 1) start OAuth: /.netlify/functions/auth
    if (pathname.endsWith("/auth")) {
      const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        scope: GITHUB_SCOPE,
      });
      return {
        statusCode: 302,
        headers: { Location: `https://github.com/login/oauth/authorize?${params.toString()}`, ...CORS },
      };
    }

    // 2) callback: /.netlify/functions/auth/callback?code=...
    if (pathname.endsWith("/auth/callback")) {
      const code = url.searchParams.get("code");
      if (!code) return { statusCode: 400, headers: CORS, body: "Missing code" };

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: OAUTH_REDIRECT_URI,
        }),
      });

      const json = await tokenRes.json();
      if (!json.access_token) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify(json) };
      }

      // format oczekiwany przez Decap: { token: "..." }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ token: json.access_token }),
      };
    }

    return { statusCode: 404, headers: CORS, body: "Not found" };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: e.message || "Server error" };
  }
}
