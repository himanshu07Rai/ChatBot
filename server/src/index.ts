import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import app from "./app";
app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
