import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from infrastructure.database.database import SessionLocal, Base, engine
from infrastructure.database.models import User
from infrastructure.auth.auth_handler import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create Admin
    admin_email = "admin@uca.es"
    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        new_admin = User(
            email=admin_email,
            hashed_password=get_password_hash("password123"),
            name="Coordinador",
            last_name_1="UCA",
            role="admin"
        )
        db.add(new_admin)
        db.commit()

    # Create Professor
    email = "profesor@uca.es"
    password = "password123"
    name = "Profesor Demo"
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        new_user = User(
            email=email,
            hashed_password=get_password_hash(password),
            name=name,
            last_name_1="Uno",
            role="professor"
        )
        db.add(new_user)
        db.commit()
        print(f"✅ Usuario creado con éxito:")
        print(f"Email: {email}")
        print(f"Contraseña: {password}")
    else:
        print("⚠️ El usuario ya existe en la base de datos.")
    
    db.close()

if __name__ == "__main__":
    init_db()
