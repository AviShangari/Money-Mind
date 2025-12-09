from fastapi import FastAPI
from app.api import users
from app.api import auth
from app.api import protected
from app.transactions import router as transactions_router

app = FastAPI()

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(protected.router)
app.include_router(transactions_router.router)

@app.get("/")
def root():
    return {"message": "MoneyMind backend running"}
