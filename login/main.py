from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import psycopg2
from psycopg2.extras import RealDictCursor
from firebase import auth
from dotenv import load_dotenv
import os
import jwt
from datetime import datetime, timedelta
import logging

# Import email services
from email_service import (
    send_admin_welcome_email,
    send_hr_welcome_email,
    send_applicant_welcome_email,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logging.error("DATABASE_URL not found in environment variables")
    raise ValueError("DATABASE_URL is required")

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", "30"))

# App instance
app = FastAPI(title="Login Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Role mapping
ROLE_MAP = {"applicant": "applicant", "hr": "hr", "admin": "admin"}
REVERSE_ROLE_MAP = {v: k for k, v in ROLE_MAP.items()}


# -------------------- Database --------------------

def get_db_connection():
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

def create_user_in_db(uid: str, email: str, name: str, role: str, organization: str = None):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO users (uid, email, role, organization, created_at, updated_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (uid) DO UPDATE SET
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                organization = EXCLUDED.organization,
                updated_at = CURRENT_TIMESTAMP
            RETURNING uid, email, role, organization
        """, (uid, email, role, organization))

        user_data = cur.fetchone()
        conn.commit()
        return {
            "uid": user_data[0],
            "email": user_data[1],
            "role": user_data[2],
            "organization": user_data[3]
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error creating user in database: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user in database")
    finally:
        if cur: cur.close()
        if conn: conn.close()

def get_user_from_db(email: str):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT uid, email, role, organization, created_at, updated_at FROM users WHERE email = %s", (email,))
        return cur.fetchone()
    except Exception as e:
        logging.error(f"Error fetching user from database: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if cur: cur.close()
        if conn: conn.close()

def update_user_last_login(uid: str):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE uid = %s", (uid,))
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error updating last login: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()


# -------------------- Auth --------------------

def create_jwt_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_jwt_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# -------------------- Models --------------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # admin, hr, applicant

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str

class UserResponse(BaseModel):
    uid: str
    email: str
    role: str
    name: str
    organization: str = None


# -------------------- Routes --------------------

@app.post("/signup", response_model=dict)
async def signup(data: SignupRequest):
    if data.role.lower() not in ROLE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(ROLE_MAP.keys())}")

    try:
        # Firebase creation
        user_record = auth.create_user(
            email=data.email,
            password=data.password,
            display_name=data.name
        )

        # Insert in DB
        user_data = create_user_in_db(
            uid=user_record.uid,
            email=data.email,
            name=data.name,
            role=data.role.lower()
        )

        # Send email
        try:
            if data.role.lower() == "admin":
                logging.info("Sending admin welcome email...")
                await send_admin_welcome_email(data.email, data.name, user_record.uid)
            elif data.role.lower() == "hr":
                logging.info("Sending HR welcome email...")
                await send_hr_welcome_email(data.email, data.name, user_record.uid)
            elif data.role.lower() == "applicant":
                logging.info("Sending applicant welcome email...")
                await send_applicant_welcome_email(data.email, data.name, user_record.uid)
        except Exception as e:
            logging.error(f"Email sending failed: {e}")

        # JWT
        token = create_jwt_token({
            "uid": user_record.uid,
            "email": data.email,
            "role": data.role.lower(),
            "name": data.name
        })

        logging.info(f"User {data.email} registered successfully")

        return {
            "message": "Signup successful",
            "access_token": token,
            "user": {
                "uid": user_data["uid"],
                "email": user_data["email"],
                "role": user_data["role"],
                "name": data.name
            }
        }

    except Exception as e:
        logging.error(f"Signup error: {e}")
        if "EMAIL_EXISTS" in str(e):
            raise HTTPException(status_code=400, detail="Email already exists")
        elif "WEAK_PASSWORD" in str(e):
            raise HTTPException(status_code=400, detail="Password is too weak")
        else:
            raise HTTPException(status_code=500, detail="Signup failed")


@app.post("/login", response_model=dict)
async def login(data: LoginRequest):
    try:
        user = auth.get_user_by_email(data.email)
        db_user = get_user_from_db(data.email)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if data.role.lower() != db_user["role"]:
            raise HTTPException(status_code=403, detail=f"Role mismatch. Expected: {data.role.lower()}, Found: {db_user['role']}")

        update_user_last_login(db_user["uid"])

        token = create_jwt_token({
            "uid": db_user["uid"],
            "email": db_user["email"],
            "role": db_user["role"]
        })

        return {
            "message": "Login successful",
            "access_token": token,
            "user": {
                "uid": db_user["uid"],
                "email": db_user["email"],
                "role": db_user["role"],
                "organization": db_user["organization"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/verify-token")
async def verify_token(token: str):
    try:
        payload = verify_jwt_token(token)
        return {
            "valid": True,
            "user": {
                "uid": payload["uid"],
                "email": payload["email"],
                "role": payload["role"]
            }
        }
    except HTTPException:
        return {"valid": False, "error": "Invalid token"}


@app.get("/user/{uid}")
async def get_user_info(uid: str):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT uid, email, role, organization, created_at, updated_at, last_login FROM users WHERE uid = %s", (uid,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching user info: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.get("/dashboard/{role}")
async def get_dashboard(role: str, token: str):
    try:
        payload = verify_jwt_token(token)
        if payload["role"] != role:
            raise HTTPException(status_code=403, detail=f"Access forbidden. Required role: {role}")
        return {
            "message": f"Welcome to {role} dashboard",
            "user": {
                "uid": payload["uid"],
                "email": payload["email"],
                "role": payload["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Dashboard access error: {e}")
        raise HTTPException(status_code=500, detail="Dashboard access failed")


@app.get("/health")
async def health_check():
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "service": "login",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "login",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.delete("/logout")
async def logout(token: str):
    return {"message": "Logout successful"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
