from fastapi import FastAPI
from app.api import users
from app.api import auth
from app.transactions import router as transactions_router
from app.insights import router as insights_router
from app.budgets import router as budgets_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(transactions_router.router)
app.include_router(insights_router.router)
app.include_router(budgets_router.router)

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
