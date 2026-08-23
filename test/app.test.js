const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const app = require("../src/app");

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const req = http.request({ host: "127.0.0.1", port, path, method: options.method || "GET", headers: options.headers || {} }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => server.close(() => resolve({ status: res.statusCode, headers: res.headers, body })));
      });
      req.on("error", (error) => server.close(() => reject(error)));
      if (options.body) req.write(options.body);
      req.end();
    });
  });
}

test("health endpoint responds successfully with security headers", async () => {
  const response = await request("/api/v1/health");
  assert.equal(response.status, 200);
  assert.match(response.body, /\"status\":\"ok\"/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(response.headers["x-powered-by"], undefined);
});

test("unknown API route returns a JSON 404", async () => {
  const response = await request("/api/v1/unknown");
  assert.equal(response.status, 404);
  assert.match(response.body, /Route GET \/api\/v1\/unknown was not found/);
});

test("state-changing requests reject an untrusted origin", async () => {
  const response = await request("/api/v1/auth/logout", { method: "POST", headers: { Origin: "https://malicious.example" } });
  assert.equal(response.status, 403);
  assert.match(response.body, /Request origin is not allowed/);
});

test("property detail endpoint requires authentication", async () => {
  const response = await request("/api/v1/properties/000000000000000000000000");
  assert.equal(response.status, 401);
  assert.match(response.body, /Authentication is required/);
});
