from fastapi import FastAPI
from app.api import users
from app.api import auth
from app.api import protected
from app.transactions import router as transactions_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(protected.router)
app.include_router(transactions_router.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "MoneyMind backend running"}
