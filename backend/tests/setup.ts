import dotenv from "dotenv";
import path from "path";

// Load from root .env or .env.example
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.example") });
