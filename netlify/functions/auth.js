// netlify/functions/auth.js
const querystring = require("querystring");
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  OAUTH_REDIRECT_URI, // np. https://twoja-domena.netlify.app/.netlify/functions/auth/callback
  GITHUB_SCOPE = "public_repo,user:email",
} = process.env;

exports.handler = async (event) => {
  const url = new URL(event.rawUrl);
  const path = url.pathname; // e.g. /.netlify/functions/auth or .../auth/callback

  // proste CORS (Decap używa fetch z przeglądarki)
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }

  try {
    // 1) Start OAuth: przekieruj na GitHub
    if (path.endsWith("/auth")) {
      const redirect = "https://github.com/login/oauth/authorize?" + querystring.stringify({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        scope: GITHUB_SCOPE,
      });
      return {
        statusCode: 302,
        headers: { Location: redirect, ...cors },
      };
    }

    // 2) Callback: wymiana code -> access_token
    if (path.endsWith("/auth/callback")) {
      const code = url.searchParams.get("code");
      if (!code) return { statusCode: 400, headers: cors, body: "Missing code" };

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
        return { statusCode: 401, headers: cors, body: JSON.stringify(json) };
      }

      // format, którego oczekuje Decap: { token: "..." }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...cors },
        body: JSON.stringify({ token: json.access_token }),
      };
    }

    return { statusCode: 404, headers: cors, body: "Not found" };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: e.message };
  }
};
