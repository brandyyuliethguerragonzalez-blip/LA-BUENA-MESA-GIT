
const http = require("http");
const fs = require("fs");

const path = require("path");
const { execFileSync } = require("child_process");

const PORT = 3000;
const DB = path.join(__dirname, "base_de_datos_sena.db");

const server = http.createServer((req, res) => {

  // CONSULTAR PRODUCTOS
  if (req.url === "/api/productos" && req.method === "GET") {
    try {
      const datos = execFileSync("sqlite3", [
        "-json",
        DB,
        'SELECT * FROM "restaurante la buena mesa";'
      ], { encoding: "utf8" });

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8"
      });
      res.end(datos);
    } catch (error) {
      res.writeHead(500);
      res.end("Error consultando SQLite");
    }
    return;
  }

  // REGISTRAR PEDIDOS
  if (req.url === "/registrarPedido" && req.method === "POST") {
    let cuerpo = "";

    req.on("data", parte => {
      cuerpo += parte.toString();
    });

    req.on("end", () => {
      try {
        const datos = new URLSearchParams(cuerpo);

        const cliente = datos.get("cliente");
        const plato = Number(datos.get("plato_id"));
        const cantidad = Number(datos.get("cantidad"));

        if (!cliente || ![1, 2, 3, 4].includes(plato) ||
            !Number.isInteger(cantidad) || cantidad < 1) {
          res.writeHead(400);
          res.end("Datos del pedido no válidos");
          return;
        }

        const nombreSeguro = cliente.replace(/'/g, "''");

        const consulta =
          `INSERT INTO pedidos (cliente, plato_id, cantidad) ` +
          `VALUES ('${nombreSeguro}', ${plato}, ${cantidad});`;

        execFileSync("sqlite3", [DB, consulta]);

        res.writeHead(303, {
          "Location": "/pedidos.html?registrado=1"
        });
        res.end();

      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.end("Error al registrar el pedido");
      }
    });

    return;
  }

  // MOSTRAR ARCHIVOS DEL SITIO
  const rutaSolicitada = req.url.split("?")[0];

  const archivo = rutaSolicitada === "/"
    ? "Index.html"
    : decodeURIComponent(rutaSolicitada.slice(1));

  const ruta = path.join(__dirname, archivo);

  if (!ruta.startsWith(__dirname + path.sep) ||
      !fs.existsSync(ruta) ||
      !fs.statSync(ruta).isFile()) {
    res.writeHead(404);
    res.end("Archivo no encontrado");
    return;
  }

  const extension = path.extname(ruta);
  const tipos = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript"
  };

  res.writeHead(200, {
    "Content-Type":
      (tipos[extension] || "application/octet-stream") + "; charset=utf-8"
  });

  fs.createReadStream(ruta).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LA BUENA MESA funcionando en http://localhost:${PORT}`);
});
