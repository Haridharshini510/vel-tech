from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import close_db, connect_db
from app.api.dashboard import router as dashboard_router
from app.api.courses import router as courses_router
from app.api.skills import router as skills_router
from app.api.companies import router as companies_router
from app.api.roadmap import router as roadmap_router
from app.api.jobs import router as jobs_router
from app.api.maharashtra import router as maharashtra_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="IndustryPulse API",
    description="Curriculum-Job Market Alignment Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api")
app.include_router(courses_router, prefix="/api")
app.include_router(skills_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(roadmap_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(maharashtra_router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)},
    )


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "IndustryPulse"}
