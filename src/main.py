from blacksheep import Application, json
from .config import load_config, PORT, HOST

app = Application()

@app.router.get("/version")
async def get_version():
    config = load_config()
    return json({"version": config.get("version", "unknown")})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
