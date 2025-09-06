from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import sys
import logging
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
import json

# Add the directory containing matcher.py to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from matcher import load_and_prepare_data_from_db, job_matcher, EMBEDDING_CACHE_FILE, BATCH_SIZE

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables from .env file
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logging.error("DATABASE_URL not found in environment variables")
    raise ValueError("DATABASE_URL is required")

app = FastAPI(title="Job Matcher Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # React default
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection function
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Pydantic models
class JobPreferencesRequest(BaseModel):
    user_id: str
    keywords: Optional[List[str]] = []
    location: Optional[str] = ""
    salary_range: Optional[str] = ""
    job_types: Optional[List[str]] = []
    experience_level: Optional[str] = ""
    industries: Optional[List[str]] = []

class JobMatchRequest(BaseModel):
    user_id: str
    domain: Optional[str] = ""
    qualification: Optional[str] = ""
    location: Optional[str] = ""
    salaryRange: Optional[str] = ""
    jobType: Optional[List[str]] = []
    experienceLevel: Optional[str] = ""
    industry: Optional[List[str]] = []
    top_n: Optional[int] = 10

class JobMatchResponse(BaseModel):
    job_id: int
    job_title: str
    job_description: str
    match_score: float
    salary: str
    location: str
    experience: str
    date_posted: str
    work_type: str
    org_name: str
    apply_link: Optional[str] = ""

# Global variable to store jobs dataframe
jobs_dataframe = None

def load_jobs_data():
    """Load and prepare job data from database"""
    global jobs_dataframe
    try:
        logging.info("Loading and preparing job data...")
        jobs_dataframe = load_and_prepare_data_from_db(DATABASE_URL, EMBEDDING_CACHE_FILE, BATCH_SIZE)
        
        if jobs_dataframe is None:
            logging.error("Failed to load job data. The API will not function correctly.")
            return False
        
        logging.info(f"Successfully loaded {len(jobs_dataframe)} jobs with embeddings.")
        return True
    except Exception as e:
        logging.error(f"Error loading job data: {e}")
        return False

def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile from user_profiles table"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT name, email, phone, location, education, skills, experience, 
                   projects, achievements, societies, links, profile_completed
            FROM user_profiles 
            WHERE user_id = %s
        """, (user_id,))
        
        profile = cur.fetchone()
        if profile:
            # Parse JSON fields
            json_fields = ['education', 'skills', 'experience', 'projects', 'achievements', 'societies', 'links']
            for field in json_fields:
                if profile.get(field):
                    try:
                        parsed_data = json.loads(profile[field])
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
                            profile[field] = text_items
                        elif isinstance(parsed_data, dict):
                            # If it's a dictionary, extract text values
                            text_items = []
                            for key, value in parsed_data.items():
                                if isinstance(value, str):
                                    text_items.append(value)
                                elif isinstance(value, list):
                                    text_items.extend([str(v) for v in value if isinstance(v, str)])
                            profile[field] = text_items
                        else:
                            profile[field] = [str(parsed_data)]
                    except (json.JSONDecodeError, TypeError) as e:
                        logging.warning(f"Error parsing {field} for user {user_id}: {e}")
                        profile[field] = []
                else:
                    profile[field] = []
            
            return dict(profile)
        else:
            return {}
            
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        return {}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_user_job_preferences(user_id: str) -> Dict[str, Any]:
    """Get user job preferences from job_preferences table"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT keywords, location, salary_range, job_types, experience_level, industries
            FROM job_preferences 
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        
        preferences = cur.fetchone()
        if preferences:
            # Parse JSON fields - handle both string and list inputs
            json_fields = ['keywords', 'job_types', 'industries']
            for field in json_fields:
                if preferences.get(field):
                    try:
                        # Check if it's already a list (from database)
                        if isinstance(preferences[field], list):
                            # Already a list, use as is
                            preferences[field] = preferences[field]
                        else:
                            # Try to parse as JSON string
                            parsed_data = json.loads(preferences[field])
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
                                preferences[field] = text_items
                            elif isinstance(parsed_data, dict):
                                # If it's a dictionary, extract text values
                                text_items = []
                                for key, value in parsed_data.items():
                                    if isinstance(value, str):
                                        text_items.append(value)
                                    elif isinstance(value, list):
                                        text_items.extend([str(v) for v in value if isinstance(v, str)])
                                preferences[field] = text_items
                            else:
                                preferences[field] = [str(parsed_data)]
                    except (json.JSONDecodeError, TypeError) as e:
                        logging.warning(f"Error parsing {field} for user {user_id}: {e}")
                        preferences[field] = []
                else:
                    preferences[field] = []
            
            return dict(preferences)
        else:
            return {}
            
    except Exception as e:
        logging.error(f"Error fetching job preferences: {e}")
        return {}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def save_job_preferences(user_id: str, preferences: JobPreferencesRequest):
    """Save user job preferences to database"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First, delete any existing preferences for this user
        cur.execute("DELETE FROM job_preferences WHERE user_id = %s", (user_id,))
        
        # Then insert new preferences
        cur.execute("""
            INSERT INTO job_preferences (
                user_id, keywords, location, salary_range, job_types, 
                experience_level, industries, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (
            user_id,
            json.dumps(preferences.keywords),
            preferences.location,
            preferences.salary_range,
            json.dumps(preferences.job_types),
            preferences.experience_level,
            json.dumps(preferences.industries)
        ))
        
        conn.commit()
        logging.info(f"Job preferences saved for user {user_id}")
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error saving job preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to save job preferences")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_user_id_from_uid(firebase_uid: str) -> int:
    """Get the users.id from Firebase UID"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM users WHERE uid = %s", (firebase_uid,))
        result = cur.fetchone()
        
        if not result:
            # If user doesn't exist in users table, create one
            cur.execute("""
                INSERT INTO users (uid, email, role, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """, (firebase_uid, "", "applicant"))
            
            user_id = cur.fetchone()[0]
            conn.commit()
            logging.info(f"Created new user with ID {user_id} for Firebase UID {firebase_uid}")
            return user_id
        
        return result[0]
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error getting user ID from UID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user ID: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def track_service_usage(user_id: str, service_name: str = "job_matcher"):
    """Track service usage in service_usage table"""
    conn = None
    try:
        # Use the Firebase UID directly (string) since service_usage.user_id is character varying
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First try to update existing record
        cur.execute("""
            UPDATE service_usage 
            SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
            WHERE user_id = %s AND service_name = %s
        """, (user_id, service_name))
        
        # If no rows were updated, insert new record
        if cur.rowcount == 0:
            cur.execute("""
                INSERT INTO service_usage (user_id, service_name, usage_count, last_used, created_at)
                VALUES (%s, %s, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

def save_job_application(user_id: str, job_id: int, enhanced_resume_url: str = None, cover_letter_id: int = None):
    """Save job application to jobs_applied table"""
    conn = None
    try:
        # First, ensure the applicant exists in the applicant table
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO applicant (user_id, app_name, email, phone)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id) DO NOTHING
        """, (user_id, "Applicant", "", ""))
        
        cur.execute("""
            INSERT INTO jobs_applied (
                job_id, applicant_id, application_date, enhanced_resume_url, 
                cover_letter_id, application_status, created_at, updated_at
            )
            VALUES (%s, %s, CURRENT_DATE, %s, %s, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (job_id, applicant_id) DO UPDATE SET
                enhanced_resume_url = EXCLUDED.enhanced_resume_url,
                cover_letter_id = EXCLUDED.cover_letter_id,
                application_status = 'applied',
                updated_at = CURRENT_TIMESTAMP
        """, (job_id, user_id, enhanced_resume_url, cover_letter_id))
        
        conn.commit()
        logging.info(f"Job application saved for user {user_id}, job {job_id}")
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error saving job application: {e}")
        raise HTTPException(status_code=500, detail="Failed to save job application")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_applied_job_ids(user_id: str) -> List[int]:
    """Get list of job IDs that the user has already applied to"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query jobs_applied table to get job IDs the user has already applied to
        cur.execute("""
            SELECT DISTINCT job_id 
            FROM jobs_applied 
            WHERE applicant_id = %s
        """, (user_id,))
        
        applied_jobs = cur.fetchall()
        applied_job_ids = [row[0] for row in applied_jobs]
        
        logging.info(f"User {user_id} has already applied to {len(applied_job_ids)} jobs: {applied_job_ids}")
        return applied_job_ids
        
    except Exception as e:
        logging.error(f"Error fetching applied jobs for user {user_id}: {e}")
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_user_applications_with_job_details(user_id: str) -> List[Dict[str, Any]]:
    """Get user applications with job details"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Join jobs_applied with org_jobs and Organisation tables to get complete job details
        cur.execute("""
            SELECT 
                ja.id as application_id,
                ja.job_id,
                ja.sent_at as applied_date,
                ja.application_status as status,
                oj.job_title,
                oj.job_desc,
                oj.salary,
                oj.job_location,
                oj.experience,
                oj.date_posted,
                oj.work_type,
                oj.qualification,
                o.Org_Name as org_name,
                ja.enhanced_resume_url,
                ja.cover_letter_id
            FROM jobs_applied ja
            LEFT JOIN org_jobs oj ON ja.job_id = oj.job_id
            LEFT JOIN Organisation o ON oj.Org_ID = o.Org_ID
            WHERE ja.applicant_id = %s
            ORDER BY ja.sent_at DESC
        """, (user_id,))
        
        applications = cur.fetchall()
        
        # Convert to list of dictionaries and handle data types
        result = []
        for app in applications:
            app_dict = dict(app)
            
            # Convert numpy types to standard Python types
            for key, value in app_dict.items():
                if hasattr(value, 'item'):  # numpy type
                    app_dict[key] = value.item()
                elif isinstance(value, (datetime, date)):
                    app_dict[key] = value.isoformat()
            
            result.append(app_dict)
        
        logging.info(f"Retrieved {len(result)} applications for user {user_id}")
        return result
        
    except Exception as e:
        logging.error(f"Error fetching user applications: {e}")
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_dashboard_stats(user_id: str) -> Dict[str, Any]:
    """Get dashboard statistics for a user"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get total applications
        cur.execute("""
            SELECT COUNT(*) as total_applications
            FROM jobs_applied 
            WHERE applicant_id = %s
        """, (user_id,))
        total_applications = cur.fetchone()[0]
        
        # Get total enhanced resumes
        cur.execute("""
            SELECT COUNT(*) as total_resumes
            FROM enhanced_resumes 
            WHERE user_id = %s
        """, (user_id,))
        total_resumes = cur.fetchone()[0]
        
        # Get total cover letters (if cover_letters table exists)
        try:
            cur.execute("""
                SELECT COUNT(*) as total_cover_letters
                FROM cover_letters 
                WHERE user_id = %s
            """, (user_id,))
            total_cover_letters = cur.fetchone()[0]
        except:
            total_cover_letters = 0
        
        # Get service usage stats
        cur.execute("""
            SELECT service_name, COUNT(*) as usage_count
            FROM service_usage 
            WHERE user_id = %s
            GROUP BY service_name
        """, (user_id,))
        service_usage = cur.fetchall()
        
        # Calculate total jobs shown (from job matching)
        total_jobs_shown = sum([usage[1] for usage in service_usage if 'job_matcher' in usage[0]])
        
        # Calculate success rate (placeholder - would need more complex logic)
        application_success_rate = 75.0 if total_applications > 0 else 0.0
        
        stats = {
            "totalJobsShown": total_jobs_shown,
            "totalJobsSelected": total_applications,
            "totalCoverLettersGenerated": total_cover_letters,
            "totalResumesGenerated": total_resumes,
            "totalApplications": total_applications,
            "totalInterviews": 0,  # Would need interview tracking
            "totalSavedJobs": 0,   # Would need saved jobs tracking
            "profileViews": 0,     # Would need profile view tracking
            "applicationSuccessRate": application_success_rate,
            "averageMatchScore": 85.0  # Placeholder
        }
        
        return stats
        
    except Exception as e:
        logging.error(f"Error fetching dashboard stats for user {user_id}: {e}")
        return {
            "totalJobsShown": 0,
            "totalJobsSelected": 0,
            "totalCoverLettersGenerated": 0,
            "totalResumesGenerated": 0,
            "totalApplications": 0,
            "totalInterviews": 0,
            "totalSavedJobs": 0,
            "profileViews": 0,
            "applicationSuccessRate": 0,
            "averageMatchScore": 0
        }
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_recent_activity(user_id: str) -> List[Dict[str, Any]]:
    """Get recent activity for a user"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        activities = []
        
        # Get recent applications
        cur.execute("""
            SELECT 
                'application' as type,
                ja.sent_at as date,
                oj.job_title as title,
                o.Org_Name as subtitle,
                'Applied for job' as description
            FROM jobs_applied ja
            LEFT JOIN org_jobs oj ON ja.job_id = oj.job_id
            LEFT JOIN Organisation o ON oj.Org_ID = o.Org_ID
            WHERE ja.applicant_id = %s
            ORDER BY ja.sent_at DESC
            LIMIT 5
        """, (user_id,))
        
        applications = cur.fetchall()
        for app in applications:
            activities.append({
                "type": "application",
                "date": app['date'].isoformat() if app['date'] else datetime.now().isoformat(),
                "title": f"Applied for {app['title']}",
                "subtitle": app['subtitle'] or "Unknown Company",
                "description": "Job application submitted"
            })
        
        # Get recent enhanced resumes
        cur.execute("""
            SELECT 
                'resume' as type,
                er.created_at as date,
                er.job_preference as title,
                'Enhanced Resume' as subtitle,
                'Resume enhanced for job' as description
            FROM enhanced_resumes er
            WHERE er.user_id = %s
            ORDER BY er.created_at DESC
            LIMIT 3
        """, (user_id,))
        
        resumes = cur.fetchall()
        for resume in resumes:
            activities.append({
                "type": "resume",
                "date": resume['date'].isoformat() if resume['date'] else datetime.now().isoformat(),
                "title": f"Enhanced resume for {resume['title']}",
                "subtitle": "Resume Enhancement",
                "description": "AI-enhanced resume created"
            })
        
        # Sort by date and return top 10
        activities.sort(key=lambda x: x['date'], reverse=True)
        return activities[:10]
        
    except Exception as e:
        logging.error(f"Error fetching recent activity for user {user_id}: {e}")
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_service_usage(user_id: str) -> List[Dict[str, Any]]:
    """Get service usage statistics for a user"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                service_name,
                COUNT(*) as usage_count,
                MAX(created_at) as last_used
            FROM service_usage 
            WHERE user_id = %s
            GROUP BY service_name
            ORDER BY usage_count DESC
        """, (user_id,))
        
        usage_data = cur.fetchall()
        
        result = []
        for usage in usage_data:
            result.append({
                "service_name": usage['service_name'],
                "usage_count": usage['usage_count'],
                "last_used": usage['last_used'].isoformat() if usage['last_used'] else datetime.now().isoformat()
            })
        
        return result
        
    except Exception as e:
        logging.error(f"Error fetching service usage for user {user_id}: {e}")
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Load jobs data on startup
@app.on_event("startup")
async def startup_event():
    """Load jobs data when the application starts"""
    success = load_jobs_data()
    if not success:
        logging.error("Failed to load jobs data on startup")

# API Routes
@app.get("/")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "service": "job_matcher",
            "database": "connected",
            "jobs_loaded": jobs_dataframe is not None,
            "jobs_count": len(jobs_dataframe) if jobs_dataframe is not None else 0,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "job_matcher",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/match-jobs", response_model=List[JobMatchResponse])
async def match_jobs(request: JobMatchRequest):
    """Match jobs based on user details and preferences"""
    
    if jobs_dataframe is None:
        raise HTTPException(status_code=500, detail="Job data not loaded. Please check server logs.")
    
    try:
        # Get user profile and preferences
        user_profile = get_user_profile(request.user_id)
        user_preferences = get_user_job_preferences(request.user_id)
        
        # Combine user input with profile data
        # Convert frontend field names to backend expected format
        work_type = request.jobType[0] if request.jobType and len(request.jobType) > 0 else ''
        
        # Convert salary range string to expected_salary float
        expected_salary = None
        if request.salaryRange:
            try:
                # Extract numbers from salary range like "80k-120k" -> 100000
                salary_str = request.salaryRange.replace('k', '000').replace('K', '000')
                if '-' in salary_str:
                    min_sal, max_sal = salary_str.split('-')
                    expected_salary = (float(min_sal) + float(max_sal)) / 2
                else:
                    expected_salary = float(salary_str)
            except:
                expected_salary = None
        
        user_details = {
            'user_id': request.user_id,
            'work_type': work_type,
            'location': request.location or user_preferences.get('location', ''),
            'domain': request.domain or ' '.join(user_preferences.get('keywords', [])),
            'expected_salary': expected_salary,
            'experience': request.experienceLevel or ' '.join(user_profile.get('experience', [])),
            'qualification': request.qualification or ' '.join(user_profile.get('education', []))
        }
        
        # Get applied job IDs FIRST
        applied_job_ids = get_applied_job_ids(request.user_id)
        
        # Get job matches, passing applied_job_ids to filter before top N
        relevant_jobs = job_matcher(user_details, jobs_dataframe.copy(), top_n=request.top_n, applied_job_ids=applied_job_ids)
        
        # Track service usage
        track_service_usage(request.user_id, "job_matcher")
        
        return relevant_jobs
        
    except Exception as e:
        logging.error(f"Error during job matching: {e}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during job matching: {str(e)}")

@app.post("/save-preferences")
async def save_preferences(request: JobPreferencesRequest):
    """Save user job preferences"""
    try:
        save_job_preferences(request.user_id, request)
        return {"message": "Job preferences saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saving preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to save preferences")

@app.get("/get-preferences/{user_id}")
async def get_preferences(user_id: str):
    """Get user job preferences"""
    try:
        preferences = get_user_job_preferences(user_id)
        return preferences
    except Exception as e:
        logging.error(f"Error fetching preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch preferences")

@app.get("/get-profile/{user_id}")
async def get_user_profile_endpoint(user_id: str):
    """Get user profile for job matching"""
    try:
        profile = get_user_profile(user_id)
        return profile
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")

@app.post("/apply-job")
async def apply_to_job(user_id: str, job_id: int, enhanced_resume_url: str = None, cover_letter_id: int = None):
    """Apply to a specific job"""
    try:
        save_job_application(user_id, job_id, enhanced_resume_url, cover_letter_id)
        return {"message": "Job application submitted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error applying to job: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit job application")

@app.get("/reload-jobs")
async def reload_jobs_data():
    """Reload jobs data from database (admin function)"""
    try:
        success = load_jobs_data()
        if success:
            return {
                "message": "Jobs data reloaded successfully",
                "jobs_count": len(jobs_dataframe) if jobs_dataframe is not None else 0
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to reload jobs data")
    except Exception as e:
        logging.error(f"Error reloading jobs data: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload jobs data")

@app.get("/jobs-stats")
async def get_jobs_stats():
    """Get statistics about available jobs"""
    try:
        if jobs_dataframe is None:
            raise HTTPException(status_code=503, detail="Job data not loaded")
        
        total_jobs = len(jobs_dataframe)
        unique_companies = jobs_dataframe['org_name'].nunique()
        
        # Check if job_location column exists, otherwise use a default
        if 'job_location' in jobs_dataframe.columns:
            unique_locations = jobs_dataframe['job_location'].nunique()
        else:
            unique_locations = 0
        
        return {
            "total_jobs": int(total_jobs),
            "unique_companies": int(unique_companies),
            "unique_locations": int(unique_locations),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Error getting jobs stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get jobs statistics")

@app.get("/jobs")
async def get_jobs_by_ids(ids: str = Query(..., description="Comma-separated job IDs")):
    """Get job details by IDs"""
    try:
        if jobs_dataframe is None:
            raise HTTPException(status_code=503, detail="Job data not loaded")
        
        # Parse job IDs from query parameter
        job_ids = [int(id.strip()) for id in ids.split(',') if id.strip().isdigit()]
        
        if not job_ids:
            raise HTTPException(status_code=400, detail="No valid job IDs provided")
        
        # Filter jobs by IDs
        filtered_jobs = jobs_dataframe[jobs_dataframe['job_id'].isin(job_ids)]
        
        if filtered_jobs.empty:
            raise HTTPException(status_code=404, detail="No jobs found with the provided IDs")
        
        # Convert to list of dictionaries
        jobs_list = []
        for _, job in filtered_jobs.iterrows():
            # Convert numpy types to Python types for JSON serialization
            def convert_numpy_types(value):
                if hasattr(value, 'item'):
                    return value.item()
                elif hasattr(value, 'isoformat'):
                    return value.isoformat()
                else:
                    return value
            
            job_dict = {
                "id": convert_numpy_types(job.get('job_id')),
                "title": str(job.get('job_title', '')),
                "company": str(job.get('org_name', '')),
                "location": str(job.get('job_location', '')),  # Use job_location column
                "salary": str(job.get('salary', 'Not specified')),
                "type": str(job.get('work_type', 'Full-time')),
                "description": str(job.get('job_description', '')),
                "requirements": [],  # You can add requirements parsing logic here
                "match_score": 85,  # Default match score
                "apply_url": str(job.get('apply_link', '#'))
            }
            jobs_list.append(job_dict)
        
        return jobs_list
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching jobs by IDs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch job details")

@app.get("/debug-job-preferences")
def debug_job_preferences():
    """Debug endpoint to check job_preferences table"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check total count
        cur.execute("SELECT COUNT(*) FROM job_preferences")
        total_count = cur.fetchone()[0]
        
        # Get sample data
        cur.execute("""
            SELECT user_id, location, salary_range, experience_level, created_at
            FROM job_preferences 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        sample_data = []
        for row in cur.fetchall():
            sample_data.append({
                "user_id": row[0],
                "location": row[1],
                "salary_range": row[2],
                "experience_level": row[3],
                "created_at": str(row[4])
            })
        
        cur.close()
        conn.close()
        
        return {
            "total_preferences": total_count,
            "sample_preferences": sample_data,
            "table_exists": True
        }
    except Exception as e:
        logging.error(f"Error checking job_preferences table: {e}")
        return {
            "error": str(e),
            "table_exists": False
        }

@app.get("/debug-job-data")
def debug_job_data():
    """Debug endpoint to check job data structure and content"""
    try:
        if jobs_dataframe is None:
            return {
                "error": "Job data not loaded",
                "jobs_loaded": False
            }
        
        # Get basic info
        total_jobs = len(jobs_dataframe)
        columns = list(jobs_dataframe.columns)
        
        # Check for required columns
        required_columns = ['job_id', 'job_title', 'job_desc', 'apply_link', 'org_name']
        missing_columns = [col for col in required_columns if col not in columns]
        
        # Sample data
        sample_jobs = []
        for i, (index, row) in enumerate(jobs_dataframe.head(3).iterrows()):
            sample_jobs.append({
                "job_id": row.get('job_id', 'N/A'),
                "job_title": row.get('job_title', 'N/A'),
                "apply_link": row.get('apply_link', 'N/A'),
                "org_name": row.get('org_name', 'N/A'),
                "has_embedding": row.get('embedding') is not None
            })
        
        # Check apply_link values
        apply_link_stats = {
            "total": total_jobs,
            "null_count": jobs_dataframe['apply_link'].isnull().sum(),
            "empty_count": (jobs_dataframe['apply_link'] == '').sum(),
            "valid_count": jobs_dataframe['apply_link'].notna().sum() - (jobs_dataframe['apply_link'] == '').sum()
        }
        
        return {
            "jobs_loaded": True,
            "total_jobs": total_jobs,
            "columns": columns,
            "missing_required_columns": missing_columns,
            "sample_jobs": sample_jobs,
            "apply_link_stats": apply_link_stats
        }
        
    except Exception as e:
        logging.error(f"Error checking job data: {e}")
        return {
            "error": str(e),
            "jobs_loaded": False
        }

@app.get("/get-job/{job_id}")
def get_job_by_id(job_id: int):
    """Get specific job data by ID for other services"""
    try:
        if jobs_dataframe is None:
            raise HTTPException(status_code=503, detail="Job data not loaded")
        
        job_row = jobs_dataframe[jobs_dataframe['job_id'] == job_id]
        if job_row.empty:
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        
        job = job_row.iloc[0]
        
        # Convert numpy types to Python types for JSON serialization
        def convert_numpy_types(value):
            if hasattr(value, 'item'):
                return value.item()
            elif hasattr(value, 'isoformat'):
                return value.isoformat()
            else:
                return value
        
        # Get all available columns and convert values
        job_data = {}
        for column in job.index:
            value = job[column]
            if value is not None:
                job_data[column] = convert_numpy_types(value)
            else:
                job_data[column] = None
        
        # Return a clean response with proper field mapping
        return {
            "job_id": convert_numpy_types(job.get('job_id')),
            "job_title": str(job.get('job_title', '')),
            "job_desc": str(job.get('job_desc', '')),
            "apply_link": str(job.get('apply_link', '')),
            "org_name": str(job.get('org_name', '')),
            "job_location": str(job.get('job_location', '')),  # Use job_location column
            "salary": str(job.get('salary', '')),
            "experience": str(job.get('experience', '')),
            "work_type": str(job.get('work_type', '')),
            "date_posted": str(job.get('date_posted', '')),
            "qualification": str(job.get('qualification', ''))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job data: {str(e)}")

@app.get("/user-applications/{user_id}")
def get_user_applications_endpoint(user_id: str):
    """Get user applications with job details"""
    try:
        applications = get_user_applications_with_job_details(user_id)
        return applications
    except Exception as e:
        logging.error(f"Error getting applications for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user applications")

@app.get("/dashboard-stats/{user_id}")
def get_dashboard_stats_endpoint(user_id: str):
    """Get dashboard statistics for a user"""
    try:
        stats = get_dashboard_stats(user_id)
        return stats
    except Exception as e:
        logging.error(f"Error getting dashboard stats for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard stats")

@app.get("/recent-activity/{user_id}")
def get_recent_activity_endpoint(user_id: str):
    """Get recent activity for a user"""
    try:
        activities = get_recent_activity(user_id)
        return activities
    except Exception as e:
        logging.error(f"Error getting recent activity for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recent activity")

@app.get("/service-usage/{user_id}")
def get_service_usage_endpoint(user_id: str):
    """Get service usage statistics for a user"""
    try:
        usage = get_service_usage(user_id)
        return usage
    except Exception as e:
        logging.error(f"Error getting service usage for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service usage")

@app.post("/test-create-preferences")
def test_create_preferences(
    user_id: str = Body(...),
    location: str = Body(...),
    salary_range: str = Body(...),
    experience_level: str = Body(...)
):
    """Test endpoint to manually create job preferences"""
    try:
        preferences = JobPreferencesRequest(
            user_id=user_id,
            keywords=["Python", "Machine Learning"],
            location=location,
            salary_range=salary_range,
            job_types=["Full-time"],
            experience_level=experience_level,
            industries=["Technology"]
        )
        
        save_job_preferences(user_id, preferences)
        
        return {
            "message": "Test preferences created successfully",
            "user_id": user_id,
            "location": location,
            "salary_range": salary_range,
            "experience_level": experience_level
        }
        
    except Exception as e:
        logging.error(f"❌ Test preferences creation failed: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002) 