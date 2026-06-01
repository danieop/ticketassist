import { createServer } from "node:http";

const port = Number(process.env.PORT || 4000);

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "ticketassist-backend"
      })
    );
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
