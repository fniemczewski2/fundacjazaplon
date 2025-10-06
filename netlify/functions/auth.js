// netlify/functions/auth.js
const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  OAUTH_REDIRECT_URI,
  GITHUB_SCOPE = "public_repo,user:email",
  ALLOWED_ORIGINS, // opcjonalnie: "https://fundacjazaplon.netlify.app,https://fundacjazaplon.pl"
} = process.env;

// 🔑 whitelist + wybór originu z nagłówka
const allowlist = (ALLOWED_ORIGINS || "https://fundacjazaplon.netlify.app")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function pickOrigin(event) {
  const hdr = event.headers || {};
  const reqOrigin = hdr.origin || hdr.Origin || "";
  return allowlist.includes(reqOrigin) ? reqOrigin : allowlist[0];
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader.split(";").map(c => c.trim().split("=").map(decodeURIComponent)).filter(p => p[0])
  );
}

export async function handler(event) {
  const ORIGIN = pickOrigin(event);
  const CORS = corsHeaders(ORIGIN);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
  const pathname = url.pathname;

  // 1) start OAuth
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

  // 2) callback -> postMessage + zamknięcie okna
  if (pathname.endsWith("/auth/callback")) {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) return { statusCode: 400, headers: CORS, body: "Missing code" };

    const cookies = parseCookies(event.headers.cookie);
    if (!state || cookies.gh_oauth_state !== state) {
      const html = `<!doctype html><meta charset="utf-8"><script>
        (function(){
          var msg = 'authorization:github:error:' + JSON.stringify({message:'Invalid state'});
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage(msg, ${JSON.stringify(ORIGIN)});
            window.close();
          } else { document.body.innerText='Invalid state'; }
        })();
      </script>`;
      return { statusCode: 401, headers: { ...CORS, "Content-Type": "text/html" }, body: html };
    }

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

    const ok = json && json.access_token;
    const payload = ok ? JSON.stringify({ token: json.access_token }) : JSON.stringify(json || {});

    const html = `<!doctype html><meta charset="utf-8"><script>
      (function(){
        var msg = 'authorization:github:${ok ? "success" : "error"}:' + ${JSON.stringify(payload)};
        if (window.opener && window.opener.postMessage) {
          window.opener.postMessage(msg, ${JSON.stringify(ORIGIN)});
          window.close();
        } else { document.body.innerText = ${JSON.stringify(ok ? "Logged in" : "OAuth error")}; }
      })();
    </script>`;

    return {
      statusCode: ok ? 200 : 401,
      headers: {
        ...CORS,
        "Content-Type": "text/html",
        "Set-Cookie": "gh_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      },
      body: html,
    };
  }

  return { statusCode: 404, headers: corsHeaders(pickOrigin(event)), body: "Not found" };
}
