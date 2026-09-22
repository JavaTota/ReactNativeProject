"""Run with 'python run.py'. Uvicorn's reload process uses the application factory."""

import uvicorn
from config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:application",
        factory=True,
        host=settings.host,
        port=settings.port,
        reload=True,
        proxy_headers=False,
    )
