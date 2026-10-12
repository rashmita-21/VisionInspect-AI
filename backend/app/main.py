import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure project root is in sys.path regardless of execution working directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.db.session import init_db
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.model import router as model_router
from backend.app.api.routes.inspect import router as inspect_router
from backend.app.api.routes.inspections import router as inspections_router
from backend.app.api.routes.analytics import router as analytics_router
from backend.app.api.routes.assistant import router as assistant_router

# Initialize database schema immediately on import
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API and Genuine ML Inference Engine for VisionInspect AI",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated image artifacts (heatmaps, overlays, uploads)
app.mount(
    "/artifacts",
    StaticFiles(directory=str(settings.ARTIFACTS_DIR)),
    name="artifacts",
)

# Register API routes
app.include_router(health_router)
app.include_router(model_router, prefix=settings.API_PREFIX)
app.include_router(inspect_router, prefix=settings.API_PREFIX)
app.include_router(inspections_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(assistant_router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
