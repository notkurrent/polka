import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_cors_origin_regex, get_cors_origins, validate_runtime_config
from app.routers import admin, auth, offers, orders, partners, telegram, users

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
validate_runtime_config()

app = FastAPI(title="Polka Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=get_cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(offers.router)
app.include_router(orders.router)
app.include_router(partners.router)
app.include_router(partners.public_router)
app.include_router(telegram.router)
app.include_router(users.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "polka-backend"}
