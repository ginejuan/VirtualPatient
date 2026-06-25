from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Usaremos SQLite para el desarrollo local. 
# En Dokploy solo habrá que cambiar esta URL por la de PostgreSQL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./virtualpatient_v4.db")

engine = create_engine(
    DATABASE_URL, 
    # check_same_thread es solo necesario para SQLite
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
