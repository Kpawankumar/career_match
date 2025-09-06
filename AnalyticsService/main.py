from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import json
import logging
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

app = FastAPI(title="Analytics Service", description="Dashboard analytics and statistics service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

def get_db_connection():
    """Create database connection"""
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/")
def health_check():
    """Health check endpoint"""
    return {"status": "Analytics Service is running!", "timestamp": datetime.now().isoformat()}

@app.get("/debug-tables")
def debug_tables():
    """Debug endpoint to check table structure and data"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        debug_info = {}
        
        # Check jobs_applied table
        cur.execute("""
            SELECT COUNT(*) FROM jobs_applied
        """)
        jobs_applied_count = cur.fetchone()[0]
        
        cur.execute("""
            SELECT applicant_id, job_title, company_name, application_status 
            FROM jobs_applied 
            LIMIT 3
        """)
        sample_jobs = cur.fetchall()
        
        debug_info['jobs_applied'] = {
            'total_count': jobs_applied_count,
            'sample_data': [{'applicant_id': row[0], 'job_title': row[1], 'company': row[2], 'status': row[3]} for row in sample_jobs]
        }
        
        # Check enhanced_resumes table
        cur.execute("""
            SELECT COUNT(*) FROM enhanced_resumes
        """)
        resumes_count = cur.fetchone()[0]
        
        cur.execute("""
            SELECT user_id, created_at 
            FROM enhanced_resumes 
            LIMIT 3
        """)
        sample_resumes = cur.fetchall()
        
        debug_info['enhanced_resumes'] = {
            'total_count': resumes_count,
            'sample_data': [{'user_id': row[0], 'created_at': str(row[1])} for row in sample_resumes]
        }
        
        # Check cover_letter table
        cur.execute("""
            SELECT COUNT(*) FROM cover_letter
        """)
        cover_letters_count = cur.fetchone()[0]
        
        cur.execute("""
            SELECT applicant_id, cv_type, created_at 
            FROM cover_letter 
            LIMIT 3
        """)
        sample_cover_letters = cur.fetchall()
        
        debug_info['cover_letter'] = {
            'total_count': cover_letters_count,
            'sample_data': [{'applicant_id': row[0], 'cv_type': row[1], 'created_at': str(row[2])} for row in sample_cover_letters]
        }
        
        cur.close()
        conn.close()
        
        return debug_info
        
    except Exception as e:
        logging.error(f"Error in debug tables: {e}")
        return {"error": str(e)}

@app.post("/test-create-application")
def test_create_application(user_id: str = "yEP9dNXUcvdi88efBGv4pKvR0vk2"):
    """Test endpoint to create a sample application"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create a test application
        cur.execute("""
            INSERT INTO jobs_applied (
                applicant_id, job_id, application_date, application_status, created_at, updated_at
            )
            VALUES (
                %s, %s, CURRENT_DATE, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (job_id, applicant_id) DO NOTHING
        """, (user_id, 12345))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": f"Test application created for user {user_id}, job 12345"}
        
    except Exception as e:
        logging.error(f"Error creating test application: {e}")
        return {"error": str(e)}

@app.get("/dashboard-stats/{user_id}")
def get_dashboard_stats(user_id: str):
    """Get comprehensive dashboard statistics for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        stats = {}
        
        # 1. Get total applications
        cur.execute("""
            SELECT COUNT(*) as total_applications
            FROM jobs_applied 
            WHERE applicant_id = %s
        """, (user_id,))
        result = cur.fetchone()
        stats['totalApplications'] = result[0] if result else 0
        
        # Debug: Check if any applications exist
        cur.execute("""
            SELECT * FROM jobs_applied 
            WHERE applicant_id = %s
            LIMIT 1
        """, (user_id,))
        debug_applications = cur.fetchall()
        logging.info(f"Debug: Found {len(debug_applications)} applications for user {user_id}")
        if debug_applications:
            logging.info(f"Debug: Sample application columns: {[desc[0] for desc in cur.description]}")
            logging.info(f"Debug: Sample application data: {debug_applications[0]}")
        
        # Debug: Check all applications in the table
        cur.execute("""
            SELECT applicant_id, COUNT(*) as count 
            FROM jobs_applied 
            GROUP BY applicant_id
        """)
        all_applications = cur.fetchall()
        logging.info(f"Debug: All applications in table: {all_applications}")
        
        # Debug: Check if user has any applications with different user_id format
        cur.execute("""
            SELECT * FROM jobs_applied 
            LIMIT 3
        """)
        sample_all = cur.fetchall()
        if sample_all:
            logging.info(f"Debug: Sample applications from table: {sample_all}")
            logging.info(f"Debug: Sample applicant_id format: {sample_all[0][0] if sample_all[0] else 'None'}")
        
        # 2. Get enhanced resumes count
        cur.execute("""
            SELECT COUNT(*) as total_resumes
            FROM enhanced_resumes 
            WHERE user_id = %s
        """, (user_id,))
        result = cur.fetchone()
        stats['totalResumesGenerated'] = result[0] if result else 0
        
        # Debug: Check if any enhanced resumes exist
        cur.execute("""
            SELECT id, user_id, created_at 
            FROM enhanced_resumes 
            WHERE user_id = %s
            LIMIT 5
        """, (user_id,))
        debug_resumes = cur.fetchall()
        logging.info(f"Debug: Found {len(debug_resumes)} enhanced resumes for user {user_id}")
        for resume in debug_resumes:
            logging.info(f"Debug: Resume - ID: {resume[0]}, User: {resume[1]}, Created: {resume[2]}")
        
        # 3. Get cover letters count
        cur.execute("""
            SELECT COUNT(*) as total_cover_letters
            FROM cover_letter 
            WHERE applicant_id = %s
        """, (user_id,))
        result = cur.fetchone()
        stats['totalCoverLettersGenerated'] = result[0] if result else 0
        
        # 4. Get service usage for job matching
        cur.execute("""
            SELECT usage_count
            FROM service_usage 
            WHERE user_id = %s AND service_name = 'job_matcher'
        """, (user_id,))
        result = cur.fetchone()
        job_matcher_usage = result[0] if result else 0
        stats['totalJobsShown'] = job_matcher_usage * 10  # Assume 10 jobs shown per session
        stats['totalJobsSelected'] = stats['totalApplications']
        
        # 5. Calculate interviews (applications with interview status)
        cur.execute("""
            SELECT COUNT(*) as total_interviews
            FROM jobs_applied 
            WHERE applicant_id = %s AND application_status = 'interview'
        """, (user_id,))
        result = cur.fetchone()
        stats['totalInterviews'] = result[0] if result else 0
        
        # 6. Calculate saved jobs (mock data for now)
        stats['totalSavedJobs'] = int(stats['totalApplications'] * 0.3)  # Assume 30% saved
        
        # 7. Calculate profile views (mock based on applications)
        stats['profileViews'] = stats['totalApplications'] * 2
        
        # 8. Calculate success rate (interviews / applications)
        if stats['totalApplications'] > 0:
            stats['applicationSuccessRate'] = round((stats['totalInterviews'] / stats['totalApplications']) * 100)
        else:
            stats['applicationSuccessRate'] = 0
        
        # 9. Calculate average match score (mock data for now)
        stats['averageMatchScore'] = 85
        
        cur.close()
        conn.close()
        
        logging.info(f"Retrieved dashboard stats for user {user_id}: {stats}")
        return stats
        
    except Exception as e:
        logging.error(f"Error getting dashboard stats for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard stats: {str(e)}")

@app.get("/user-applications/{user_id}")
def get_user_applications(user_id: str):
    """Get detailed application data for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First, let's see what columns exist
        cur.execute("""
            SELECT * FROM jobs_applied 
            WHERE applicant_id = %s
            LIMIT 1
        """, (user_id,))
        
        sample = cur.fetchone()
        if not sample:
            logging.info(f"No applications found for user {user_id}")
            return []
        
        columns = [desc[0] for desc in cur.description]
        logging.info(f"Available columns in jobs_applied: {columns}")
        
        # Now query with job details from org_jobs table
        cur.execute("""
            SELECT 
                ja.applicant_id,
                ja.job_id,
                ja.application_date,
                ja.application_status,
                ja.sent_at,
                ja.updated_at,
                oj.job_title,
                oj.job_desc,
                oj.salary,
                oj.job_location,
                oj.experience,
                oj.work_type,
                oj.date_posted,
                oj.qualification,
                o.Org_Name as org_name
            FROM jobs_applied ja
            LEFT JOIN org_jobs oj ON ja.job_id = oj.job_id
            LEFT JOIN Organisation o ON oj.Org_ID = o.Org_ID
            WHERE ja.applicant_id = %s
            ORDER BY ja.application_date DESC
        """, (user_id,))
        
        results = cur.fetchall()
        applications = []
        
        logging.info(f"Debug: Raw results from user-applications query: {results}")
        
        for row in results:
            applications.append({
                "application_id": row[0],  # applicant_id
                "job_id": row[1],  # job_id
                "job_title": row[6] or f"Job #{row[1]}",  # job_title from org_jobs
                "org_name": row[14] or "Unknown Company",  # org_name from Organisation
                "job_location": row[9] or "Location not specified",  # job_location
                "applied_date": row[2].isoformat() if row[2] else datetime.now().isoformat().split('T')[0],
                "status": row[3] or "Applied",  # application_status
                "created_at": row[4].isoformat() if row[4] else datetime.now().isoformat(),  # sent_at
                "resume_sent": True,  # Default values
                "cover_letter_sent": True
            })
        
        cur.close()
        conn.close()
        
        logging.info(f"Retrieved {len(applications)} applications for user {user_id}")
        return applications
        
    except Exception as e:
        logging.error(f"Error getting applications for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get applications: {str(e)}")

@app.get("/user-enhanced-resumes/{user_id}")
def get_user_enhanced_resumes(user_id: str):
    """Get enhanced resumes data for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                er.id,
                er.user_id,
                er.original_resume_url,
                er.enhanced_resume_url,
                er.job_id,
                er.improvements,
                er.keywords,
                er.enhanced_content,
                er.created_at,
                oj.job_title,
                o.Org_Name as org_name
            FROM enhanced_resumes er
            LEFT JOIN org_jobs oj ON er.job_id = oj.job_id
            LEFT JOIN Organisation o ON oj.Org_ID = o.Org_ID
            WHERE er.user_id = %s
            ORDER BY er.created_at DESC
        """, (user_id,))
        
        results = cur.fetchall()
        resumes = []
        
        logging.info(f"Debug: Raw results from user-enhanced-resumes query: {results}")
        
        for row in results:
            # Handle improvements - it might be a list or JSON string
            improvements = row[5]
            if isinstance(improvements, str):
                try:
                    improvements = json.loads(improvements)
                except json.JSONDecodeError:
                    improvements = {"suggestions": [improvements] if improvements else []}
            elif isinstance(improvements, list):
                improvements = {"suggestions": improvements}
            else:
                improvements = {"suggestions": []}
            
            # Handle keywords - it might be a list or JSON string
            keywords = row[6]
            if isinstance(keywords, str):
                try:
                    keywords = json.loads(keywords)
                except json.JSONDecodeError:
                    keywords = [keywords] if keywords else []
            elif not isinstance(keywords, list):
                keywords = []
            
            resumes.append({
                "id": row[0],
                "job_title": row[9] or "Enhanced Resume",  # job_title from org_jobs
                "org_name": row[10] or "Unknown Company",  # org_name from Organisation
                "created_at": row[8].isoformat() if row[8] else datetime.now().isoformat(),
                "improvements": improvements,
                "keywords": keywords
            })
        
        cur.close()
        conn.close()
        
        logging.info(f"Retrieved {len(resumes)} enhanced resumes for user {user_id}")
        return resumes
        
    except Exception as e:
        logging.error(f"Error getting enhanced resumes for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get enhanced resumes: {str(e)}")

@app.get("/user-cover-letters/{user_id}")
def get_user_cover_letters(user_id: str):
    """Get cover letters data for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                cl.cv_id,
                cl.applicant_id,
                cl.cv_type,
                cl.details,
                cl.job_id,
                cl.personalized,
                cl.created_at,
                oj.job_title,
                o.Org_Name as org_name
            FROM cover_letter cl
            LEFT JOIN org_jobs oj ON cl.job_id = oj.job_id
            LEFT JOIN Organisation o ON oj.Org_ID = o.Org_ID
            WHERE cl.applicant_id = %s
            ORDER BY cl.created_at DESC
        """, (user_id,))
        
        results = cur.fetchall()
        cover_letters = []
        
        for row in results:
            cover_letters.append({
                "id": row[0],
                "job_title": row[7] or "Cover Letter",  # job_title from org_jobs
                "org_name": row[8] or "Unknown Company",  # org_name from Organisation
                "created_at": row[6].isoformat() if row[6] else datetime.now().isoformat(),
                "content": row[3] or ""
            })
        
        cur.close()
        conn.close()
        
        logging.info(f"Retrieved {len(cover_letters)} cover letters for user {user_id}")
        return cover_letters
        
    except Exception as e:
        logging.error(f"Error getting cover letters for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get cover letters: {str(e)}")

@app.get("/service-usage/{user_id}")
def get_service_usage(user_id: str):
    """Get service usage statistics for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                service_name,
                usage_count,
                last_used
            FROM service_usage 
            WHERE user_id = %s
            ORDER BY last_used DESC
        """, (user_id,))
        
        results = cur.fetchall()
        service_usage = []
        
        for row in results:
            service_usage.append({
                "service_name": row[0],
                "usage_count": row[1],
                "last_used": row[2].isoformat() if row[2] else None
            })
        
        cur.close()
        conn.close()
        
        logging.info(f"Retrieved service usage for user {user_id}: {len(service_usage)} services")
        return service_usage
        
    except Exception as e:
        logging.error(f"Error getting service usage for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get service usage: {str(e)}")

@app.get("/recent-activity/{user_id}")
def get_recent_activity(user_id: str):
    """Get recent activity for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        activities = []
        
        # Get recent applications
        cur.execute("""
            SELECT 
                job_id,
                application_date,
                application_status
            FROM jobs_applied 
            WHERE applicant_id = %s
            ORDER BY application_date DESC
            LIMIT 3
        """, (user_id,))
        
        for row in cur.fetchall():
            activities.append({
                "type": "application",
                "title": f"Applied to Job #{row[0]}",
                "subtitle": "Application Submitted",
                "date": row[1].isoformat().split('T')[0] if row[1] else datetime.now().isoformat().split('T')[0],
                "status": row[2] or "Applied"
            })
        
        # Get recent resume enhancements
        cur.execute("""
            SELECT 
                created_at
            FROM enhanced_resumes 
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 2
        """, (user_id,))
        
        for row in cur.fetchall():
            activities.append({
                "type": "resume",
                "title": f"Enhanced resume created",
                "subtitle": "Resume Enhancement",
                "date": row[0].isoformat().split('T')[0] if row[0] else datetime.now().isoformat().split('T')[0],
                "status": "Completed"
            })
        
        # Get recent cover letters
        cur.execute("""
            SELECT 
                created_at
            FROM cover_letter 
            WHERE applicant_id = %s
            ORDER BY created_at DESC
            LIMIT 2
        """, (user_id,))
        
        for row in cur.fetchall():
            activities.append({
                "type": "cover_letter",
                "title": f"Generated cover letter",
                "subtitle": "Cover Letter Generation",
                "date": row[0].isoformat().split('T')[0] if row[0] else datetime.now().isoformat().split('T')[0],
                "status": "Completed"
            })
        
        cur.close()
        conn.close()
        
        # Sort by date (most recent first)
        activities.sort(key=lambda x: x['date'], reverse=True)
        
        logging.info(f"Retrieved {len(activities)} recent activities for user {user_id}")
        return activities
        
    except Exception as e:
        logging.error(f"Error getting recent activity for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get recent activity: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9006) 