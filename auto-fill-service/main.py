from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv
import logging
from datetime import datetime
from resume_uploader import upload_to_gcs  # GCS upload handler
from parser import extract_text, parse_resume_with_gpt
import re
import ast
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")




db_params = {}
if DATABASE_URL:
    try:
        result = urlparse(DATABASE_URL)
        db_params = {
            "dbname": result.path[1:],
            "user": result.username,
            "password": result.password,
            "host": result.hostname,
            "port": result.port
        }
    except Exception as e:
        logging.error(f"Failed to parse DATABASE_URL: {e}")
        db_params = {}
else:
    logging.error("DATABASE_URL not found")

def get_db_connection():
    try:
        return psycopg2.connect(**db_params)
    except Exception as e:
        logging.error(f"PostgreSQL connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

def to_json_list(val, sep=","):
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        # Try splitting by sep, but also handle newlines for some fields
        if sep == "\n":
            return [v.strip() for v in val.split("\n") if v.strip()]
        else:
            return [v.strip() for v in val.split(sep) if v.strip()]
    return []

def insert_user_profile(user_id: str, parsed_data: dict, resume_url: str = None):
    """
    Insert or update user profile in user_profiles table
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Ensure fields are lists for JSON serialization
        skills = to_json_list(parsed_data.get("skills", ""), sep=",")
        projects = to_json_list(parsed_data.get("projects", parsed_data.get("project", "")), sep="\n")
        experience = to_json_list(parsed_data.get("experience", ""), sep="\n")
        education = to_json_list(parsed_data.get("education", ""), sep="\n")
        qualification = education + to_json_list(parsed_data.get("qualification", ""), sep="\n")
        
        # Save summary as first item in achievements (if present)
        summary = parsed_data.get("summary", "")
        achievements = to_json_list(parsed_data.get("achievements", ""), sep="\n")
        if summary:
            achievements = [summary] + [a for a in achievements if a != summary]
        
        societies = to_json_list(parsed_data.get("societies", ""), sep=",")
        links = to_json_list(parsed_data.get("links", ""), sep="\n")

        email = parsed_data.get("email", "")
        phone = parsed_data.get("phone", "")
        name = parsed_data.get("name", "")
        location = parsed_data.get("location", "")

        # Check if user exists in users table
        cur.execute("SELECT uid FROM users WHERE uid = %s", (user_id,))
        user_exists = cur.fetchone()
        
        if not user_exists:
            # Create user in users table if doesn't exist
            cur.execute("""
                INSERT INTO users (uid, email, role, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (uid) DO UPDATE SET
                    email = EXCLUDED.email,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, email, 'applicant'))

        # Insert or update user_profiles
        cur.execute("""
            INSERT INTO user_profiles (
                user_id, name, email, phone, location, education, skills, 
                projects, experience, achievements, societies, links, 
                original_resume_filepath, profile_completed, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                location = EXCLUDED.location,
                education = EXCLUDED.education,
                skills = EXCLUDED.skills,
                projects = EXCLUDED.projects,
                experience = EXCLUDED.experience,
                achievements = EXCLUDED.achievements,
                societies = EXCLUDED.societies,
                links = EXCLUDED.links,
                original_resume_filepath = EXCLUDED.original_resume_filepath,
                profile_completed = EXCLUDED.profile_completed,
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_id, name, email, phone, location, json.dumps(qualification), 
            json.dumps(skills), json.dumps(projects), json.dumps(experience),
            json.dumps(achievements), json.dumps(societies), json.dumps(links),
            resume_url, True  # profile_completed = True when resume is uploaded
        ))
        
        conn.commit()
        logging.info(f"Successfully inserted/updated profile for user {user_id}")
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error during insert_user_profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to insert user profile")
    finally:
        if cur: cur.close()
        if conn: conn.close()

def get_user_info(user_id: str):
    """
    Get user information from users table
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First check users table
        cur.execute("SELECT uid, email, role FROM users WHERE uid = %s", (user_id,))
        user_row = cur.fetchone()
        
        if user_row:
            return {
                "uid": user_row[0],
                "email": user_row[1],
                "role": user_row[2]
            }
        else:
            return None
            
    except Exception as e:
        logging.error(f"Database error during get_user_info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user info")
    finally:
        if cur: cur.close()
        if conn: conn.close()

def postprocess_parsed_data(parsed_data, raw_text):
    # Fallback for email
    if not parsed_data.get("email"):
        match = re.search(r"[\\w\\.-]+@[\\w\\.-]+", raw_text)
        if match:
            parsed_data["email"] = match.group(0)
    # Fallback for phone
    if not parsed_data.get("phone"):
        match = re.search(r"(\\+?\\d[\\d\\s\\-()]{7,})", raw_text)
        if match:
            parsed_data["phone"] = match.group(0)
    # Clean up name (optional, e.g., take first line if missing)
    if not parsed_data.get("name"):
        lines = raw_text.splitlines()
        if lines:
            parsed_data["name"] = lines[0].strip()
    return parsed_data

@app.post("/parse-resume/")
async def parse_resume(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    # Get user info from users table
    user_info = get_user_info(user_id)
    if not user_info:
        # Create user if doesn't exist
        user_info = {"uid": user_id, "email": "", "role": "applicant"}
    
    username = user_info.get("email", "").split("@")[0] if user_info.get("email") else user_id
    username = username.replace(" ", "_") or "anonymous"

    # Construct cloud path: resume_and_job_matching/raw_resume/<user_id>/<username>_<date>.pdf
    date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    clean_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{username}_{date_str}{clean_ext}"
    gcs_path = f"resume_and_job_matching/raw_resume/{user_id}/{safe_filename}"

    # Upload to GCS
    try:
        upload_to_gcs(file, gcs_path)
    except Exception as e:
        logging.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Cloud upload failed")

    # Reset stream and extract text
    file.file.seek(0)
    extracted_text = extract_text(file)
    parsed_data = parse_resume_with_gpt(extracted_text)
    parsed_data = postprocess_parsed_data(parsed_data, extracted_text)

    # Ensure parsed_data fields are lists for JSON serialization
    parsed_data["skills"] = to_json_list(parsed_data.get("skills", ""), sep=",")
    parsed_data["projects"] = to_json_list(parsed_data.get("projects", ""), sep="\n")
    parsed_data["experience"] = to_json_list(parsed_data.get("experience", ""), sep="\n")
    parsed_data["achievements"] = to_json_list(parsed_data.get("achievements", ""), sep="\n")
    parsed_data["societies"] = to_json_list(parsed_data.get("societies", ""), sep=",")
    parsed_data["links"] = to_json_list(parsed_data.get("links", ""), sep="\n")
    parsed_data["education"] = to_json_list(parsed_data.get("education", ""), sep="\n")
    parsed_data["qualification"] = to_json_list(parsed_data.get("qualification", ""), sep="\n")

    # Store parsed info in user_profiles table
    insert_user_profile(user_id, parsed_data, gcs_path)

    # Track service usage
    track_service_usage(user_id, "resume_parser")

    return {
        "user_id": user_id,
        "cloud_path": gcs_path,
        "parsed_profile": parsed_data
    }

def track_service_usage(user_id: str, service_name: str):
    """
    Track service usage in service_usage table
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO service_usage (user_id, service_name, usage_count, last_used, created_at)
            VALUES (%s, %s, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, service_name) DO UPDATE SET
                usage_count = service_usage.usage_count + 1,
                last_used = CURRENT_TIMESTAMP
        """, (user_id, service_name))
        
        conn.commit()
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Failed to track service usage: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.post("/update-profile/")
async def update_profile(data: dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")
    
    # Map frontend fields to backend expected keys
    parsed_data = {
        "name": data.get("name", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "location": data.get("location", ""),
        "education": data.get("education", ""),
        "skills": data.get("skills", ""),
        "projects": data.get("projects", data.get("project", "")),
        "experience": data.get("experience", ""),
        "achievements": data.get("achievements", ""),
        "societies": data.get("societies", ""),
        "links": data.get("links", ""),
        "summary": data.get("summary", "")
    }
    
    try:
        insert_user_profile(user_id, parsed_data)
        return {"message": "Profile updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {e}")

@app.get("/get-profile/")
async def get_profile(user_id: str):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get profile from user_profiles table
        cur.execute("""
            SELECT up.*, u.email as user_email, u.role as user_role
            FROM user_profiles up
            LEFT JOIN users u ON up.user_id = u.uid
            WHERE up.user_id = %s
        """, (user_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Profile for user_id {user_id} not found")
        
        # Get column names
        colnames = [desc[0] for desc in cur.description]
        profile = dict(zip(colnames, row))
        
        # Attempt to parse JSON fields
        json_fields = ["skills", "projects", "experience", "achievements", "societies", "links", "education"]
        for field in json_fields:
            if profile.get(field):
                try:
                    profile[field] = json.loads(profile[field])
                except Exception:
                    pass  # Leave as string if not parseable
        
        # Extract summary from achievements if present
        if isinstance(profile.get("achievements"), list) and profile["achievements"]:
            profile["summary"] = profile["achievements"][0] if profile["achievements"] else ""
            profile["certifications"] = profile["achievements"][1:] if len(profile["achievements"]) > 1 else []
        else:
            profile["summary"] = ""
            profile["certifications"] = profile.get("achievements", [])
        
        # Always provide 'projects' as an alias for 'project'
        profile["projects"] = profile.get("projects", [])
        
        # Always provide 'education' as an alias for 'qualification'
        profile["education"] = profile.get("education", [])
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.get("/check-user/{user_id}")
async def check_user(user_id: str):
    """
    Check if user exists and return basic info
    """
    try:
        user_info = get_user_info(user_id)
        if user_info:
            return {
                "exists": True,
                "user_info": user_info
            }
        else:
            return {
                "exists": False,
                "user_info": None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check user: {e}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 