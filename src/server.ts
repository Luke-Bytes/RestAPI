import app from "./app";

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, (err?: any) => {
    if (err) {
        console.error("Failed to start the server:", err);
    } else {
        console.log(`Server is running on http://localhost:${PORT}`);
    }
});
