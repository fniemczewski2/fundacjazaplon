// ESM, Node 18+, bez require
const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  OAUTH_REDIRECT_URI,
  GITHUB_SCOPE = "public_repo,user:email",
} = process.env;

const ORIGIN = "https://fundacjazaplon.netlify.app"; // jeśli używasz własnej domeny, podmień na nią
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("=").map(decodeURIComponent))
      .filter((p) => p[0])
  );
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
  const pathname = url.pathname;

  try {
    // 1) Start OAuth
    if (pathname.endsWith("/auth")) {
      const state = crypto.randomUUID();
      const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        scope: GITHUB_SCOPE,
        state,
      });
      return {
        statusCode: 302,
        headers: {
          ...CORS,
          "Set-Cookie": `gh_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
          Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
        },
      };
    }

    // 2) Callback: zwróć HTML, który przekaże token do parent window
    if (pathname.endsWith("/auth/callback")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code) return { statusCode: 400, headers: CORS, body: "Missing code" };

      const cookies = parseCookies(event.headers.cookie);
      if (!state || !cookies.gh_oauth_state || cookies.gh_oauth_state !== state) {
        // HTML z komunikatem błędu (Decap też to umie odebrać)
        const htmlErr = `<!doctype html>
<html><body>
<script>
  (function(){
    var msg = 'authorization:github:error:' + JSON.stringify({message:'Invalid state'});
    if (window.opener && window.opener.postMessage) {
      window.opener.postMessage(msg, '${ORIGIN}');
      window.close();
    } else {
      document.body.innerText = 'Invalid state. You can close this window.';
    }
  })();
</script>
</body></html>`;
        return {
          statusCode: 401,
          headers: { ...CORS, "Content-Type": "text/html" },
          body: htmlErr,
        };
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: OAUTH_REDIRECT_URI,
        }),
      });
      const json = await tokenRes.json();
      if (!json.access_token) {
        const htmlErr = `<!doctype html>
<html><body>
<script>
  (function(){
    var msg = 'authorization:github:error:' + ${JSON.stringify(JSON.stringify(json))};
    if (window.opener && window.opener.postMessage) {
      window.opener.postMessage(msg, '${ORIGIN}');
      window.close();
    } else {
      document.body.innerText = 'OAuth error. You can close this window.';
    }
  })();
</script>
</body></html>`;
        return {
          statusCode: 401,
          headers: { ...CORS, "Content-Type": "text/html" },
          body: htmlErr,
        };
      }

      // <- KLUCZOWA ZMIANA: ZWRACAMY HTML, NIE JSON
      const htmlOk = `<!doctype html>
<html><body>
<script>
  (function(){
    var data = { token: ${JSON.stringify(json.access_token)} };
    var msg = 'authorization:github:success:' + JSON.stringify(data);
    if (window.opener && window.opener.postMessage) {
      window.opener.postMessage(msg, '${ORIGIN}');
      window.close();
    } else {
      document.body.innerText = 'Logged in. You can close this window.';
    }
  })();
</script>
</body></html>`;
      return {
        statusCode: 200,
        headers: {
          ...CORS,
          "Content-Type": "text/html",
          "Set-Cookie": "gh_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
        },
        body: htmlOk,
      };
    }

    return { statusCode: 404, headers: CORS, body: "Not found" };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: e.message || "Server error" };
  }
}
