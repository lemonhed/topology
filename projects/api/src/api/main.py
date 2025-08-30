from fastapi import FastAPI

app = FastAPI(title="Whiteboard API")


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Whiteboard API running"}
