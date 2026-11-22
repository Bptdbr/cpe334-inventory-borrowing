import { app } from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.PORT, () => {
  console.log(`Inventory & Borrowing API server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});

export default server;

