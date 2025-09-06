from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
import google.generativeai as genai
import os
import traceback
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
from typing import Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables from .env file
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logging.error("DATABASE_URL not found in environment variables")
    raise ValueError("DATABASE_URL is required")

if not GOOGLE_API_KEY:
    logging.error("GOOGLE_API_KEY not found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

# Configure Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

# Define the FastAPI app
app = FastAPI(title="Cover Letter Generator Service", version="1.0.0")

# Allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CoverLetterRequest(BaseModel):
    user_id: str
    domain: str
    company_name: str
    job_id: Optional[int] = None
    personalized: bool = True

class CoverLetterResponse(BaseModel):
    cv_id: int
    applicant_id: str
    cv_type: str
    details: str
    job_id: Optional[int]
    personalized: bool
    created_at: str

# Database connection function
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Prompt template for Gemini (LLM)
cover_letter_prompt = PromptTemplate.from_template("""
You are a professional AI career assistant. Write a cover letter for the {domain} position at {company_name}.
Do NOT use placeholders like [Hiring Manager Name] or [Company Name]. Use generic phrases instead such as "your company" or "the hiring team".
Do NOT refer to where the advertisement was seen. Directly express interest in applying to the company.

Tone: professional, confident, and enthusiastic.

Keep the cover letter concise (must be at least 250 words). Include a short introduction, 2-3 bullet points showcasing strengths, and a thank you note.

Present any provided links as a clear, line-by-line list at the end of the letter, under the closing. Do NOT include a "Links:" heading or any bullet points (stars) before the links.

Here are the user details for your reference to craft the letter's content, these should not be explicitly listed at the beginning of the letter but integrated naturally:
Name: {name}
Email: {email}
Phone: {phone}
Location: {location}
Education: {education}
Experience: {experience}
Skills: {skills}
Achievements: {achievements}
Links: {links}
""")

# Fetch user profile data from DB
def fetch_user_profile(user_id: str):
    """Fetch user profile from user_profiles table"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT name, email, phone, location, education, skills, experience, 
                   projects, achievements, societies, links
            FROM user_profiles 
            WHERE user_id = %s
        """, (user_id,))
        
        result = cur.fetchone()
        if not result:
            raise ValueError(f"User ID {user_id} not found in the database.")
        
        # Parse JSON fields
        json_fields = ['education', 'skills', 'experience', 'projects', 'achievements', 'societies', 'links']
        user_data = dict(result)
        
        for field in json_fields:
            if user_data.get(field):
                try:
                    parsed_data = json.loads(user_data[field])
                    # Handle different data types
                    if isinstance(parsed_data, list):
                        # If it's a list, extract text from each item
                        text_items = []
                        for item in parsed_data:
                            if isinstance(item, dict):
                                # Extract relevant text fields from dictionary
                                if 'title' in item:
                                    text_items.append(str(item['title']))
                                elif 'name' in item:
                                    text_items.append(str(item['name']))
                                elif 'description' in item:
                                    text_items.append(str(item['description']))
                                elif 'text' in item:
                                    text_items.append(str(item['text']))
                                else:
                                    # Join all string values from the dictionary
                                    text_items.append(' '.join([str(v) for v in item.values() if isinstance(v, str)]))
                            elif isinstance(item, str):
                                text_items.append(item)
                            else:
                                text_items.append(str(item))
                        user_data[field] = text_items
                    elif isinstance(parsed_data, dict):
                        # If it's a dictionary, extract text values
                        text_items = []
                        for key, value in parsed_data.items():
                            if isinstance(value, str):
                                text_items.append(value)
                            elif isinstance(value, list):
                                text_items.extend([str(v) for v in value if isinstance(v, str)])
                        user_data[field] = text_items
                    else:
                        user_data[field] = [str(parsed_data)]
                except (json.JSONDecodeError, TypeError) as e:
                    logging.warning(f"Error parsing {field} for user {user_id}: {e}")
                    user_data[field] = []
            else:
                user_data[field] = []
        
        # Safely join the text items
        def safe_join(items, separator=" "):
            if not items:
                return ""
            try:
                return separator.join([str(item) for item in items if item])
            except Exception as e:
                logging.warning(f"Error joining items: {e}")
                return str(items[0]) if items else ""
        
        return {
            "name": user_data["name"] or "Applicant",
            "email": user_data["email"] or "",
            "phone": user_data["phone"] or "",
            "location": user_data["location"] or "",
            "education": safe_join(user_data["education"]),
            "experience": safe_join(user_data["experience"]),
            "skills": safe_join(user_data["skills"]),
            "achievements": safe_join(user_data["achievements"]),
            "links": safe_join(user_data["links"]),
        }
        
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user profile: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Generate the cover letter using Gemini
def generate_cover_letter(user_id: str, domain: str, company_name: str):
    """Generate cover letter using Google Gemini AI"""
    try:
        user_data = fetch_user_profile(user_id)
        # Fill all placeholders with real data or defaults
        prompt = cover_letter_prompt.format(
            domain=domain,
            company_name=company_name,
            name=user_data.get("name", "Applicant"),
            email=user_data.get("email", ""),
            phone=user_data.get("phone", ""),
            location=user_data.get("location", ""),
            education=user_data.get("education", ""),
            experience=user_data.get("experience", ""),
            skills=user_data.get("skills", ""),
            achievements=user_data.get("achievements", ""),
            links=user_data.get("links", "")
        )
        print("Prompt sent to Gemini:\n", prompt)  # Debug: print the final prompt
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
        
    except Exception as e:
        logging.error(f"Error generating cover letter: {e}")
        
        # Check if it's a quota exceeded error
        if "quota" in str(e).lower() or "429" in str(e):
            logging.warning("Google API quota exceeded, using fallback template")
            return generate_fallback_cover_letter(user_data, domain, company_name)
        
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {str(e)}")

def generate_fallback_cover_letter(user_data: dict, domain: str, company_name: str) -> str:
    """Generate a basic cover letter when AI service is unavailable"""
    name = user_data.get("name", "Applicant")
    email = user_data.get("email", "")
    phone = user_data.get("phone", "")
    location = user_data.get("location", "")
    experience = user_data.get("experience", "")
    skills = user_data.get("skills", "")
    
    cover_letter = f"""
{name}
{email}
{phone}
{location}

{company_name}
Hiring Manager

Dear Hiring Manager,

I am writing to express my strong interest in the {domain} position at {company_name}. With my background in {domain} and relevant experience, I am confident in my ability to contribute effectively to your team.

My experience includes {experience[:200] + '...' if len(experience) > 200 else experience}. I have developed strong skills in {skills[:200] + '...' if len(skills) > 200 else skills}.

I am particularly drawn to {company_name} because of its reputation for innovation and excellence. I believe my technical skills and passion for {domain} would make me a valuable addition to your organization.

I am excited about the opportunity to discuss how my background, skills, and enthusiasm would benefit {company_name}. I would welcome the chance to speak with you about this position and learn more about your team.

Thank you for considering my application. I look forward to hearing from you.

Sincerely,
{name}
"""
    
    return cover_letter.strip()

# Save cover letter to database
def save_cover_letter(user_id: str, domain: str, company_name: str, cover_letter_text: str, job_id: Optional[int] = None, personalized: bool = True):
    """Save cover letter to cover_letter table"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First, ensure the applicant exists in the applicant table
        cur.execute("""
            INSERT INTO applicant (user_id, app_name, email, phone)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id) DO NOTHING
        """, (user_id, "Applicant", "", ""))
        
        # Now insert the cover letter
        cur.execute("""
            INSERT INTO cover_letter (
                applicant_id, cv_type, details, job_id, personalized, created_at
            )
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING cv_id
        """, (user_id, domain, cover_letter_text, job_id, personalized))
        
        cv_id = cur.fetchone()[0]
        conn.commit()
        
        logging.info(f"Cover letter saved with ID {cv_id} for user {user_id}")
        return cv_id
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error saving cover letter: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save cover letter: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Track service usage
def track_service_usage(user_id: str, service_name: str = "cover_letter_generator"):
    """Track service usage in service_usage table"""
    conn = None
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
        if cur:
            cur.close()
        if conn:
            conn.close()

# Get cover letter by ID
def get_cover_letter(cv_id: int):
    """Get cover letter by ID"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT cv_id, applicant_id, cv_type, details, job_id, personalized, created_at
            FROM cover_letter 
            WHERE cv_id = %s
        """, (cv_id,))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Cover letter not found")
        # Patch: ensure created_at is a string
        if result.get("created_at") and not isinstance(result["created_at"], str):
            result["created_at"] = result["created_at"].isoformat()
        return dict(result)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching cover letter: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch cover letter: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Get user's cover letters
def get_user_cover_letters(user_id: str):
    """Get all cover letters for a user"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT cv_id, applicant_id, cv_type, details, job_id, personalized, created_at
            FROM cover_letter 
            WHERE applicant_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        
        results = cur.fetchall()
        # Patch: ensure created_at is a string for each row
        cover_letters = []
        for row in results:
            if row.get("created_at") and not isinstance(row["created_at"], str):
                row["created_at"] = row["created_at"].isoformat()
            cover_letters.append(dict(row))
        return cover_letters
        
    except Exception as e:
        logging.error(f"Error fetching user cover letters: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch cover letters: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# API Routes
@app.get("/")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "service": "cover_letter_generator",
            "database": "connected",
            "ai_model": "gemini-1.5-flash",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "cover_letter_generator",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/generate-cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter_endpoint(request: CoverLetterRequest):
    """Generate and save a cover letter"""
    try:
        # Generate cover letter
        cover_letter_text = generate_cover_letter(
            request.user_id, 
            request.domain, 
            request.company_name
        )
        
        # Save to database
        cv_id = save_cover_letter(
            request.user_id,
            request.domain,
            request.company_name,
            cover_letter_text,
            request.job_id,
            request.personalized
        )
        
        # Track service usage
        track_service_usage(request.user_id, "cover_letter_generator")
        
        # Return the saved cover letter
        return get_cover_letter(cv_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in generate cover letter endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/generate-cover-letter")
async def generate_cover_letter_get(
    user_id: str = Query(..., description="The ID of the user"),
    domain: str = Query(..., description="The job domain, e.g., Data Science"),
    company_name: str = Query(..., description="The name of the target company"),
    job_id: Optional[int] = Query(None, description="The job ID (optional)"),
    personalized: bool = Query(True, description="Whether to personalize the cover letter")
):
    """Generate cover letter (GET endpoint for backward compatibility)"""
    try:
        # Generate cover letter
        cover_letter_text = generate_cover_letter(user_id, domain, company_name)
        
        # Save to database
        cv_id = save_cover_letter(user_id, domain, company_name, cover_letter_text, job_id, personalized)
        
        # Track service usage
        track_service_usage(user_id, "cover_letter_generator")
        
        # Return the saved cover letter
        return get_cover_letter(cv_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in generate cover letter endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cover-letter/{cv_id}")
async def get_cover_letter_endpoint(cv_id: int):
    """Get a specific cover letter by ID"""
    return get_cover_letter(cv_id)

@app.get("/user-cover-letters/{user_id}")
async def get_user_cover_letters_endpoint(user_id: str):
    """Get all cover letters for a user"""
    return get_user_cover_letters(user_id)

@app.delete("/cover-letter/{cv_id}")
async def delete_cover_letter(cv_id: int):
    """Delete a cover letter"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM cover_letter WHERE cv_id = %s", (cv_id,))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cover letter not found")
        
        conn.commit()
        return {"message": "Cover letter deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error deleting cover letter: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete cover letter: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.get("/user-profile/{user_id}")
async def get_user_profile_endpoint(user_id: str):
    """Get user profile for cover letter generation"""
    try:
        profile = fetch_user_profile(user_id)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user profile: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 