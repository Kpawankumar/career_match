import os
import tempfile
import logging
import smtplib
import json
from email.message import EmailMessage
from dotenv import load_dotenv
from fastapi import FastAPI, Form, File, UploadFile, Path, HTTPException, Body, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import pandas as pd
import traceback
import sys
import re
import psycopg2
from psycopg2.extras import RealDictCursor
# Removed redundant imports - we'll get job data from JobMatcher service instead
from datetime import datetime
# import sendgrid
# from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition
# from sendgrid.helpers.mail import CustomArg

# Load .env variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
DATABASE_URL = os.getenv("DATABASE_URL")

# Add SendGrid configuration (commented out for now)
# SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
# SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", EMAIL_ADDRESS)

# Add Gmail API configuration (commented out for now)
# GMAIL_ENABLED = os.getenv("GMAIL_ENABLED", "false").lower() == "true"

# Import Gmail service if enabled (commented out for now)
# if GMAIL_ENABLED:
#     try:
#         from gmail_service import get_gmail_service
#         gmail_service = get_gmail_service()
#         logging.info("Gmail API service loaded successfully")
#     except Exception as e:
#         logging.warning(f"Failed to load Gmail service: {e}")
#         gmail_service = None
# else:
#     gmail_service = None

# Set both services to None for now
gmail_service = None

# Setup FastAPI
app = FastAPI(title="Automate Email Service", version="1.0.0")
templates = Jinja2Templates(directory="templates")
logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database engine
engine = create_engine(DATABASE_URL)

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Load jobs for matcher once - but we'll get job data from JobMatcher service instead
jobs_df = None  # We'll fetch job data from JobMatcher service when needed

# Email Utility

def get_job_data_from_matcher_service(job_id: int):
    """Get job data from JobMatcher service instead of loading locally"""
    try:
        import requests
        response = requests.get(f"https://job-matching-1071432896229.asia-south2.run.app/get-job/{job_id}", timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        logging.error(f"Error fetching job data from JobMatcher service: {e}")
        return None

def get_job_data_from_cache(job_id: int):
    """Get job data from local cache if available, otherwise from JobMatcher service"""
    global jobs_df
    if jobs_df is not None:
        job_row = jobs_df[jobs_df['job_id'] == job_id]
        if not job_row.empty:
            return job_row.iloc[0]
    
    # Fallback: get from JobMatcher service
    return get_job_data_from_matcher_service(job_id)

def send_email_with_resume_and_cover(to_email, subject, body_text, resume_path, sender_email, sender_password):
    try:
        logging.info(f"Attempting to send email to: {to_email}")
        logging.info(f"Subject: {subject}")
        logging.info(f"From: {sender_email}")
        
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = format_sender(sender_email)
        msg['To'] = to_email
        msg.set_content(body_text)

        # Check if resume file exists and add attachment if provided
        if resume_path and os.path.exists(resume_path):
            with open(resume_path, 'rb') as f:
                file_data = f.read()
                msg.add_attachment(file_data, maintype='application', subtype='pdf', filename="Enhanced_Resume.pdf")
                logging.info(f"Resume attachment added: {len(file_data)} bytes")
        elif resume_path and not os.path.exists(resume_path):
            logging.error(f"Resume file not found: {resume_path}")
            raise FileNotFoundError(f"Resume file not found: {resume_path}")
        else:
            logging.info("No resume attachment - sending email with cover letter only")

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            logging.info("Connected to SMTP server")
            smtp.login(sender_email, sender_password)
            logging.info("SMTP login successful")
            smtp.send_message(msg)
            logging.info("Email sent successfully")
            
    except smtplib.SMTPAuthenticationError as e:
        logging.error(f"SMTP Authentication failed: {e}")
        raise
    except smtplib.SMTPRecipientsRefused as e:
        logging.error(f"Recipient email refused: {e}")
        raise
    except smtplib.SMTPServerDisconnected as e:
        logging.error(f"SMTP server disconnected: {e}")
        raise
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        raise

# def send_email_with_sendgrid(
#     to_email: str,
#     subject: str,
#     body_text: str,
#     resume_path: str,
#     application_id: int
# ):
#     """Send email using SendGrid with tracking"""
#     try:
#         sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
#         
#         # Create email
#         from_email = Email(SENDGRID_FROM_EMAIL)
#         to_email = To(to_email)
#         content = Content("text/plain", body_text)
#         mail = Mail(from_email, to_email, subject, content)
#         
#         # Add custom arguments for tracking
#         mail.add_custom_arg(CustomArg("application_id", str(application_id)))
#         mail.add_custom_arg(CustomArg("job_title", subject.split(" - ")[0] if " - " in subject else "Application"))
#         
#         # Add resume attachment
#         with open(resume_path, 'rb') as f:
#             resume_content = f.read()
#             resume_attachment = Attachment(
#                 FileContent(resume_content),
#                 FileName(f"Enhanced_Resume_{application_id}.pdf"),
#                 FileType("application/pdf"),
#                 Disposition("attachment")
#             )
#             mail.add_attachment(resume_attachment)
#         
#         # Send email
#         response = sg.send(mail)
#         
#         if response.status_code in [200, 201, 202]:
#             logging.info(f"SendGrid email sent successfully for application {application_id}")
#             return True
#         else:
#             logging.error(f"SendGrid email failed: {response.status_code} - {response.body}")
#             return False
#             
#     except Exception as e:
#         logging.error(f"Error sending SendGrid email: {e}")
#         return False

# def send_email_with_gmail_api(
#     to_email: str,
#     subject: str,
#     body_text: str,
#     resume_path: str,
#     application_id: int
# ):
#     """Send email using Gmail API with tracking"""
#     try:
#         if not gmail_service:
#             return {'success': False, 'error': 'Gmail service not available'}
#         
#         result = gmail_service.send_email_with_attachment(
#             to_email=to_email,
#             subject=subject,
#             body=body_text,
#             attachment_path=resume_path,
#             application_id=application_id
#         )
#         
#         if result['success']:
#             # Add custom label for tracking
#             gmail_service.add_label(result['message_id'], f"Application-{application_id}")
#             
#             logging.info(f"Gmail API email sent successfully for application {application_id}")
#             return result
#         else:
#             logging.error(f"Gmail API email failed: {result['error']}")
#             return result
#             
#     except Exception as e:
#         logging.error(f"Error sending Gmail API email: {e}")
#         return {'success': False, 'error': str(e)}

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

# Service usage tracking
def track_service_usage(user_id: str, service_name: str = "automate_email"):
    conn = None
    try:
        # Use the Firebase UID directly (string) since service_usage.user_id is character varying
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

def send_confirmation_email_to_applicant(
    applicant_email: str,
    applicant_name: str,
    job_title: str,
    company_name: str,
    application_id: int,
    sender_email: str,
    sender_password: str
):
    """Send confirmation email to applicant"""
    try:
        msg = EmailMessage()
        msg['Subject'] = f"Application Confirmation - {job_title} at {company_name}"
        msg['From'] = format_sender(sender_email)
        msg['To'] = applicant_email
        
        # Create professional confirmation email body
        email_body = f"""
Dear {applicant_name},

Thank you for your application! We're pleased to confirm that your enhanced resume and cover letter have been successfully sent to the HR department at {company_name}.

📋 Application Details:
• Position: {job_title}
• Company: {company_name}
• Application ID: #{application_id}
• Date Sent: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}

✅ What was sent:
• Your enhanced resume (optimized for ATS)
• Personalized cover letter
• Professional email to HR department

📊 Track Your Application:
You can track the status of your application in your dashboard:
• Sent: Email delivered to HR
• Read: HR has opened your application
• Responded: HR has sent a response

⏰ Next Steps:
• Most companies respond within 1-2 weeks
• Check your email regularly for responses
• Monitor your dashboard for status updates

🔗 Quick Links:
• View Application Status: [Dashboard Link]
• Apply to More Jobs: [Job Preferences]
• Download Your Resume: [Resume Download]

If you have any questions about your application, please don't hesitate to contact us.

Best of luck with your application!

Best regards,
The Employment Edge Team

---
This is an automated confirmation. Please do not reply to this email.
Application ID: {application_id}
        """.strip()

        msg.set_content(email_body)
        
        # Send the confirmation email
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
            
        logging.info(f"Confirmation email sent to {applicant_email} for application {application_id}")
        
    except Exception as e:
        logging.error(f"Error sending confirmation email to {applicant_email}: {e}")

def send_bulk_confirmation_email_to_applicant(
    applicant_email: str,
    applicant_name: str,
    applications: list,
    sender_email: str,
    sender_password: str
):
    """Send bulk confirmation email for multiple applications"""
    try:
        msg = EmailMessage()
        msg['Subject'] = f"Applications Confirmed - {len(applications)} Jobs Applied"
        msg['From'] = format_sender(sender_email)
        msg['To'] = applicant_email
        
        # Create concise, professional applications summary
        applications_summary = ""
        for i, app in enumerate(applications, 1):
            try:
                if app.get('date_sent'):
                    from datetime import datetime
                    date_obj = datetime.fromisoformat(app['date_sent'].replace('Z', '+00:00'))
                    formatted_date = date_obj.strftime('%B %d, %Y')
                else:
                    formatted_date = datetime.now().strftime('%B %d, %Y')
            except:
                formatted_date = datetime.now().strftime('%B %d, %Y')
            applications_summary += f"\n{i}. {app['job_title']} at {app['company_name']} (Applied: {formatted_date})"
        email_body = f"""
Dear {applicant_name},

Thank you for using AIPlaneTech CareerMatch. We have successfully sent your applications to the following jobs:
{applications_summary}

We wish you the best in your job search!

Best regards,
AIPlaneTech CareerMatch Team
""".strip()
        msg.set_content(email_body)
        
        # Send the confirmation email
        logging.info(f"📧 SENDING BULK CONFIRMATION EMAIL DETAILS:")
        logging.info(f"   FROM: {sender_email}")
        logging.info(f"   TO: {applicant_email}")
        logging.info(f"   SUBJECT: {msg['Subject']}")
        logging.info(f"   APPLICATIONS: {len(applications)} jobs")
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
            
        logging.info(f"✅ BULK CONFIRMATION EMAIL SENT SUCCESSFULLY!")
        logging.info(f"   FROM: {sender_email}")
        logging.info(f"   TO: {applicant_email}")
        logging.info(f"   APPLICATIONS: {len(applications)} jobs")
        
    except Exception as e:
        logging.error(f"Error sending bulk confirmation email to {applicant_email}: {e}")

@app.post("/auto-apply")
async def auto_apply_with_uploaded_resume(
    user_id: str = Form(...),
    job_id: int = Form(...),
    cover_letter: str = Form(...),
    resume_file: UploadFile = File(...)
):
    try:
        with engine.begin() as conn:
            # Fetch user profile from user_profiles
            user_result = conn.execute(text("SELECT * FROM user_profiles WHERE user_id = :uid"), {"uid": user_id}).fetchone()
            if not user_result:
                raise HTTPException(status_code=404, detail=f"No profile found for user_id '{user_id}'")
            user = dict(user_result._mapping)

            # Fetch user name from users table if needed
            user_name = user.get("name")
            if not user_name:
                user_row = conn.execute(text("SELECT email FROM users WHERE uid = :uid"), {"uid": user_id}).fetchone()
                user_name = user_row[0].split("@")[0] if user_row else user_id

            # Fetch job info from JobMatcher service
            job = get_job_data_from_matcher_service(job_id)
            if not job:
                # Fallback: try to get from JobMatcher service directly
                try:
                    import requests
                    response = requests.get(f"https://job-matching-1071432896229.asia-south2.run.app/jobs?ids={job_id}", timeout=5)
                    if response.status_code == 200:
                        jobs_data = response.json()
                        if jobs_data and len(jobs_data) > 0:
                            job = jobs_data[0]
                        else:
                            # Create a fallback job object if JobMatcher service is not available
                            logging.warning(f"JobMatcher service not available, creating fallback job for ID {job_id}")
                            job = {
                                'job_id': job_id,
                                'job_title': 'Unknown Position',
                                'org_name': 'Unknown Company',
                                'apply_link': EMAIL_ADDRESS  # Use sender's email as fallback
                            }
                    else:
                        # Create a fallback job object if JobMatcher service is not available
                        logging.warning(f"JobMatcher service not available, creating fallback job for ID {job_id}")
                        job = {
                            'job_id': job_id,
                            'job_title': 'Unknown Position',
                            'org_name': 'Unknown Company',
                            'apply_link': EMAIL_ADDRESS  # Use sender's email as fallback
                        }
                except Exception as e:
                    logging.error(f"Error fetching job from JobMatcher service: {e}")
                    # Create a fallback job object if JobMatcher service is not available
                    logging.warning(f"JobMatcher service not available, creating fallback job for ID {job_id}")
                    job = {
                        'job_id': job_id,
                        'job_title': 'Unknown Position',
                        'org_name': 'Unknown Company',
                        'apply_link': EMAIL_ADDRESS  # Use sender's email as fallback
                    }
            
            # Determine recipient email (HR department) - USE ANY EMAIL-LIKE STRING
            recipient_email = job.get('apply_link', '')
            logging.info(f"Raw apply_link from job data: {recipient_email}")
            
            # More flexible email validation - use any string that contains @
            if not recipient_email or recipient_email == 'null':
                logging.warning(f"No apply_link found for job {job_id}, apply_link: '{recipient_email}'")
                # Use a fallback email for testing/development
                recipient_email = EMAIL_ADDRESS  # Send to yourself for testing
                logging.info(f"Using fallback email: {recipient_email}")
            elif '@' in str(recipient_email):
                # Extract email from the apply_link (it might be a full URL or just an email)
                email_part = str(recipient_email)
                # If it's a URL, try to extract email from it
                if 'mailto:' in email_part:
                    email_part = email_part.replace('mailto:', '').split('?')[0]
                elif 'http' in email_part:
                    # Try to extract email from URL parameters
                    if 'email=' in email_part:
                        email_part = email_part.split('email=')[1].split('&')[0]
                    elif 'to=' in email_part:
                        email_part = email_part.split('to=')[1].split('&')[0]
                
                recipient_email = email_part.strip()
                logging.info(f"Using HR email from job data: {recipient_email}")
            else:
                # Even if it doesn't contain @, try to use it as an email address
                # (some companies might have non-standard email formats)
                recipient_email = str(recipient_email).strip()
                logging.info(f"Using non-standard email format from job data: {recipient_email}")
            
            logging.info(f"Final recipient email: {recipient_email}")
            
            job_domain = job.get('job_title', 'Unknown Position')

            # Check if already applied
            check_query = text("SELECT 1 FROM jobs_applied WHERE applicant_id = :user_id AND job_id = :job_id")
            exists = conn.execute(check_query, {"user_id": user_id, "job_id": job_id}).fetchone()
            if exists:
                return {"message": "⚠️ You have already applied to this job."}

            # Save resume to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await resume_file.read())
                resume_path = tmp.name

            # Send email to HR
            try:
                logging.info(f"📧 SENDING HR EMAIL:")
                logging.info(f"   FROM: {EMAIL_ADDRESS}")
                logging.info(f"   TO: {recipient_email}")
                logging.info(f"   SUBJECT: {user_name} - Application for {job_domain}")
                logging.info(f"   RESUME FILE: {resume_path}")
                logging.info(f"   APPLICANT: {user_name}")
                logging.info(f"   JOB: {job_domain}")
                
                send_email_with_resume_and_cover(
                    to_email=recipient_email,
                    subject=f"{user_name} - Application for {job_domain}",
                    body_text=cover_letter,
                    resume_path=resume_path,
                    sender_email=EMAIL_ADDRESS,
                    sender_password=EMAIL_PASSWORD
                )
                
                logging.info(f"✅ HR EMAIL SENT SUCCESSFULLY!")
                logging.info(f"   FROM: {EMAIL_ADDRESS}")
                logging.info(f"   TO: {recipient_email}")
                logging.info(f"   JOB: {job_domain}")
            except Exception as hr_email_error:
                logging.error(f"❌ HR EMAIL FAILED!")
                logging.error(f"   FROM: {EMAIL_ADDRESS}")
                logging.error(f"   TO: {recipient_email}")
                logging.error(f"   ERROR: {hr_email_error}")
                logging.error(f"   DETAILS: {str(hr_email_error)}")
                # Clean up temp file
                if os.path.exists(resume_path):
                    os.unlink(resume_path)
                raise HTTPException(status_code=500, detail=f"Failed to send HR email: {str(hr_email_error)}")

            # Record application
            insert_query = text("""
                INSERT INTO jobs_applied (applicant_id, job_id, application_date, application_status, sent_at, updated_at)
                VALUES (:user_id, :job_id, CURRENT_DATE, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """)
            conn.execute(insert_query, {"user_id": user_id, "job_id": job_id})

            # Track service usage
            track_service_usage(user_id, "automate_email")
            
            # Send confirmation email to applicant
            # try:
            #     send_confirmation_email_to_applicant(
            #         user.get("email", ""),
            #         user_name,
            #         job_domain,
            #         job.get('org_name', 'Unknown Company'),
            #         0,  # No application ID for this endpoint
            #         EMAIL_ADDRESS,
            #         EMAIL_PASSWORD
            #     )
            #     logging.info(f"Confirmation email sent to applicant {user_name}")
            # except Exception as email_error:
            #     logging.error(f"Failed to send confirmation email: {email_error}")
            #     # Don't fail the whole request for email errors

        return {"message": "✅ Application sent and recorded successfully!"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error in final auto-apply: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/auto-apply-url")
async def auto_apply_with_resume_url(
    user_id: str = Body(...),
    job_id: int = Body(...),
    cover_letter: str = Body(...),
    resume_url: str = Body(...)
):
    """Alternative endpoint that accepts resume URL instead of file upload"""
    try:
        import requests
        
        with engine.begin() as conn:
            # Fetch user profile from user_profiles
            user_result = conn.execute(text("SELECT * FROM user_profiles WHERE user_id = :uid"), {"uid": user_id}).fetchone()
            if not user_result:
                raise HTTPException(status_code=404, detail=f"No profile found for user_id '{user_id}'")
            user = dict(user_result._mapping)

            # Fetch user name from users table if needed
            user_name = user.get("name")
            if not user_name:
                user_row = conn.execute(text("SELECT email FROM users WHERE uid = :uid"), {"uid": user_id}).fetchone()
                user_name = user_row[0].split("@")[0] if user_row else user_id

            # Fetch job info
            job_row = jobs_df[jobs_df['job_id'] == job_id]
            if job_row.empty:
                raise HTTPException(status_code=404, detail=f"No job found with job_id {job_id}")
            job = job_row.iloc[0]
            recipient_email = job['apply_link']
            job_domain = job['job_title']

            # Check if already applied
            check_query = text("SELECT 1 FROM jobs_applied WHERE applicant_id = :user_id AND job_id = :job_id")
            exists = conn.execute(check_query, {"user_id": user_id, "job_id": job_id}).fetchone()
            if exists:
                return {"message": "⚠️ You have already applied to this job."}

            # Download resume from URL
            try:
                response = requests.get(resume_url, timeout=30)
                response.raise_for_status()
                
                # Save resume to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(response.content)
                    resume_path = tmp.name
            except Exception as e:
                logging.error(f"Error downloading resume from URL: {e}")
                raise HTTPException(status_code=400, detail=f"Failed to download resume from URL: {str(e)}")

            # Send email
            send_email_with_resume_and_cover(
                to_email=recipient_email,
                subject=f"{user_name} - Application for {job_domain}",
                body_text=cover_letter,
                resume_path=resume_path,
                sender_email=EMAIL_ADDRESS,
                sender_password=EMAIL_PASSWORD
            )

            # Ensure applicant exists in applicant table
            conn.execute(text("""
                INSERT INTO applicant (user_id, app_name, email, phone)
                VALUES (:user_id, :app_name, :email, :phone)
                ON CONFLICT (user_id) DO NOTHING
            """), {
                "user_id": user_id, 
                "app_name": user.get("name", "Applicant"), 
                "email": user.get("email", ""), 
                "phone": user.get("phone", "")
            })
            
            # Record application
            insert_query = text("""
                INSERT INTO jobs_applied (applicant_id, job_id, application_date, application_status, sent_at, updated_at)
                VALUES (:user_id, :job_id, CURRENT_DATE, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """)
            conn.execute(insert_query, {"user_id": user_id, "job_id": job_id})

            # Track service usage
            track_service_usage(user_id, "automate_email")

        return {"message": "✅ Application sent and recorded successfully!"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error in auto-apply with URL: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/cover-letter-apply")
async def cover_letter_apply(
    user_id: str = Form(...),
    job_id: int = Form(...),
    cover_letter: str = Form(...),
    job_title: str = Form(...),
    company_name: str = Form(...)
):
    """Apply with cover letter only (no resume file)"""
    try:
        logging.info(f"Cover letter application request received for user {user_id}, job {job_id}")
        
        # Get user profile
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Get user profile
            cur.execute("""
                SELECT name, email, phone, location, education, skills, experience, projects, achievements, societies, links
                FROM user_profiles 
                WHERE firebase_uid = %s
            """, (user_id,))
            user_profile = cur.fetchone()
            
            if not user_profile:
                raise HTTPException(status_code=404, detail="User profile not found")
            
            # Get job data
            job_data = get_job_data_from_matcher_service(job_id)
            if not job_data:
                raise HTTPException(status_code=404, detail="Job not found")
            
            # Determine recipient email (HR department) - USE ANY EMAIL-LIKE STRING
            recipient_email = job_data.get('apply_link', '')
            logging.info(f"Raw apply_link from job data: {recipient_email}")
            
            # More flexible email validation - use any string that contains @
            if not recipient_email or recipient_email == 'null':
                logging.warning(f"No apply_link found for job {job_id}, apply_link: '{recipient_email}'")
                # Use a fallback email for testing/development
                recipient_email = EMAIL_ADDRESS  # Send to yourself for testing
                logging.info(f"Using fallback email: {recipient_email}")
            elif '@' in str(recipient_email):
                # Extract email from the apply_link (it might be a full URL or just an email)
                email_part = str(recipient_email)
                # If it's a URL, try to extract email from it
                if 'mailto:' in email_part:
                    email_part = email_part.replace('mailto:', '').split('?')[0]
                elif 'http' in email_part:
                    # Try to extract email from URL parameters
                    if 'email=' in email_part:
                        email_part = email_part.split('email=')[1].split('&')[0]
                    elif 'to=' in email_part:
                        email_part = email_part.split('to=')[1].split('&')[0]
                
                recipient_email = email_part.strip()
                logging.info(f"Using HR email from job data: {recipient_email}")
            else:
                # Even if it doesn't contain @, try to use it as an email address
                # (some companies might have non-standard email formats)
                recipient_email = str(recipient_email).strip()
                logging.info(f"Using non-standard email format from job data: {recipient_email}")
            
            logging.info(f"Final recipient email: {recipient_email}")
            
            # Create application record
            cur.execute("""
                INSERT INTO applications (user_id, job_id, status, applied_at, cover_letter, resume_sent, cover_letter_sent)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                user_id,
                job_id,
                'applied',
                datetime.now(),
                cover_letter,
                False,  # No resume sent
                True    # Cover letter sent
            ))
            
            application_id = cur.fetchone()['id']
            conn.commit()
            
            # Track service usage
            track_service_usage(user_id, "automate_email")
            
            # Send email to HR with cover letter
            try:
                # Create professional email subject and body
                email_subject = f"Application for {job_title} Position - {user_profile['name']}"
                
                # Enhanced email body with professional formatting
                email_body = f"""
Dear Hiring Manager,

{cover_letter}

Best regards,
{user_profile['name']}
{user_profile['email']}

---
This application was submitted through our automated application system.
Position: {job_title}
Company: {company_name}
Application Date: {datetime.now().strftime('%B %d, %Y')}
                """.strip()

                # Send email to HR
                logging.info(f"📧 SENDING COVER LETTER EMAIL TO HR:")
                logging.info(f"   FROM: {EMAIL_ADDRESS}")
                logging.info(f"   TO: {recipient_email}")
                logging.info(f"   SUBJECT: {email_subject}")
                logging.info(f"   APPLICANT: {user_profile['name']} ({user_profile['email']})")
                logging.info(f"   COMPANY: {company_name}")
                
                send_email_with_resume_and_cover(
                    to_email=recipient_email,
                    subject=email_subject,
                    body_text=email_body,
                    resume_path=None,  # No resume file for cover letter only
                    sender_email=EMAIL_ADDRESS,
                    sender_password=EMAIL_PASSWORD
                )
                logging.info(f"✅ HR EMAIL SENT SUCCESSFULLY!")
                logging.info(f"   FROM: {EMAIL_ADDRESS}")
                logging.info(f"   TO: {recipient_email}")
                logging.info(f"   JOB: {job_title} at {company_name}")
            except Exception as hr_email_error:
                logging.error(f"❌ HR EMAIL FAILED!")
                logging.error(f"   FROM: {EMAIL_ADDRESS}")
                logging.error(f"   TO: {recipient_email}")
                logging.error(f"   ERROR: {hr_email_error}")
                logging.error(f"   DETAILS: {str(hr_email_error)}")
                # Don't fail the whole request for email errors
            
            # Send confirmation email to applicant
            # try:
            #     send_confirmation_email_to_applicant(
            #         user_profile['email'],
            #         user_profile['name'],
            #         job_title,
            #         company_name,
            #         application_id,
            #         EMAIL_ADDRESS,
            #         EMAIL_PASSWORD
            #     )
            #     logging.info(f"Confirmation email sent for application {application_id}")
            # except Exception as email_error:
            #     logging.error(f"Failed to send confirmation email: {email_error}")
            #     # Don't fail the whole request for email errors
            
            return {
                "success": True,
                "application_id": application_id,
                "message": "Application submitted successfully with cover letter",
                "job_title": job_title,
                "company_name": company_name,
                "resume_sent": False,
                "cover_letter_sent": True
            }
            
        finally:
            cur.close()
            conn.close()
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in cover_letter_apply: {e}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to submit application: {str(e)}")

@app.post("/enhanced-resume-apply")
async def enhanced_resume_apply(
    user_id: str = Form(...),
    job_id: int = Form(...),
    cover_letter: str = Form(...),
    resume_file: UploadFile = File(...),
    job_title: str = Form(...),
    company_name: str = Form(...)
):
    """Enhanced resume application endpoint with better HR targeting and tracking"""
    try:
        with engine.begin() as conn:
            # Fetch user profile from user_profiles
            user_result = conn.execute(text("SELECT * FROM user_profiles WHERE user_id = :uid"), {"uid": user_id}).fetchone()
            if not user_result:
                raise HTTPException(status_code=404, detail=f"No profile found for user_id '{user_id}'")
            user = dict(user_result._mapping)

            # Fetch user name and email
            user_name = user.get("name", "Applicant")
            user_email = user.get("email", "")
            
            # Fetch job info from JobMatcher service (no redundant database loading)
            job = get_job_data_from_cache(job_id)
            if job is None:
                # Fallback: try to get from JobMatcher service directly
                try:
                    import requests
                    response = requests.get(f"https://job-matching-1071432896229.asia-south2.run.app/jobs?ids={job_id}", timeout=5)
                    if response.status_code == 200:
                        jobs_data = response.json()
                        if jobs_data and len(jobs_data) > 0:
                            job = jobs_data[0]
                        else:
                            raise HTTPException(status_code=404, detail=f"No job found with job_id {job_id}")
                    else:
                        raise HTTPException(status_code=404, detail=f"No job found with job_id {job_id}")
                except Exception as e:
                    logging.error(f"Error fetching job from JobMatcher service: {e}")
                    raise HTTPException(status_code=404, detail=f"No job found with job_id {job_id}")
            
            # Determine recipient email (HR department) - USE ANY EMAIL-LIKE STRING
            recipient_email = job.get('apply_link', '')
            logging.info(f"Raw apply_link from job data: {recipient_email}")
            
            # More flexible email validation - use any string that contains @
            if not recipient_email or recipient_email == 'null':
                logging.warning(f"No apply_link found for job {job_id}, apply_link: '{recipient_email}'")
                # Use a fallback email for testing/development
                recipient_email = EMAIL_ADDRESS  # Send to yourself for testing
                logging.info(f"Using fallback email: {recipient_email}")
            elif '@' in str(recipient_email):
                # Extract email from the apply_link (it might be a full URL or just an email)
                email_part = str(recipient_email)
                # If it's a URL, try to extract email from it
                if 'mailto:' in email_part:
                    email_part = email_part.replace('mailto:', '').split('?')[0]
                elif 'http' in email_part:
                    # Try to extract email from URL parameters
                    if 'email=' in email_part:
                        email_part = email_part.split('email=')[1].split('&')[0]
                    elif 'to=' in email_part:
                        email_part = email_part.split('to=')[1].split('&')[0]
                
                recipient_email = email_part.strip()
                logging.info(f"Using HR email from job data: {recipient_email}")
            else:
                # Even if it doesn't contain @, try to use it as an email address
                # (some companies might have non-standard email formats)
                recipient_email = str(recipient_email).strip()
                logging.info(f"Using non-standard email format from job data: {recipient_email}")
            
            logging.info(f"Final recipient email: {recipient_email}")
            
            # Check if already applied
            check_query = text("SELECT 1 FROM jobs_applied WHERE applicant_id = :user_id AND job_id = :job_id")
            exists = conn.execute(check_query, {"user_id": user_id, "job_id": job_id}).fetchone()
            if exists:
                return {"message": "⚠️ You have already applied to this job."}

            # Save resume to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await resume_file.read())
                resume_path = tmp.name

            # Create professional email subject and body
            email_subject = f"Application for {job_title} Position - {user_name}"
            
            # Enhanced email body with professional formatting
            email_body = f"""
Dear Hiring Manager,

{cover_letter}

Best regards,
{user_name}
{user_email}

---
This application was submitted through our automated application system.
Position: {job_title}
Company: {company_name}
Application Date: {datetime.now().strftime('%B %d, %Y')}
            """.strip()

            # Send email with enhanced resume using SMTP (Gmail API and SendGrid commented out)
            logging.info(f"📧 EMAIL DETAILS FOR JOB {job_id}:")
            logging.info(f"   FROM: {EMAIL_ADDRESS}")
            logging.info(f"   TO: {recipient_email}")
            logging.info(f"   SUBJECT: {email_subject}")
            logging.info(f"   RESUME FILE: {resume_path}")
            logging.info(f"   APPLICANT: {user_name} ({user_email})")
            logging.info(f"   COMPANY: {company_name}")
            
            try:
                send_email_with_resume_and_cover(
                    to_email=recipient_email,
                    subject=email_subject,
                    body_text=email_body,
                    resume_path=resume_path,
                    sender_email=EMAIL_ADDRESS,
                    sender_password=EMAIL_PASSWORD
                )
                logging.info(f"✅ HR EMAIL SENT SUCCESSFULLY!")
                logging.info(f"   FROM: {EMAIL_ADDRESS}")
                logging.info(f"   TO: {recipient_email}")
                logging.info(f"   JOB: {job_title} at {company_name}")
            except Exception as email_error:
                logging.error(f"❌ HR EMAIL FAILED!")
                logging.error(f"   FROM: {EMAIL_ADDRESS}")
                logging.error(f"   TO: {recipient_email}")
                logging.error(f"   ERROR: {email_error}")
                logging.error(f"   DETAILS: {str(email_error)}")
                # Clean up temp file
                if os.path.exists(resume_path):
                    os.unlink(resume_path)
                raise HTTPException(status_code=500, detail=f"Failed to send HR email: {str(email_error)}")

            # Record application with enhanced details
            try:
                logging.info(f"Attempting to insert application for user {user_id}, job {job_id}")
                
                insert_query = text("""
                    INSERT INTO jobs_applied (
                        applicant_id, job_id, application_date, application_status, sent_at, updated_at
                    )
                    VALUES (
                        :user_id, :job_id, CURRENT_DATE, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (job_id, applicant_id) DO UPDATE SET
                        application_status = 'applied',
                        sent_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING job_id
                """)
                
                result = conn.execute(insert_query, {
                    "user_id": user_id, 
                    "job_id": job_id
                })
                
                application_id = result.fetchone()[0]
                logging.info(f"✅ Successfully inserted application with ID: {application_id}")
                
            except Exception as db_error:
                logging.error(f"❌ Database insertion failed for user {user_id}, job {job_id}: {db_error}")
                logging.error(f"Error details: {str(db_error)}")
                # Continue with the process even if DB insertion fails
                application_id = job_id  # Use job_id as fallback

            # Track service usage
            track_service_usage(user_id, "enhanced_resume_apply")

            # Send confirmation email to applicant
            # logging.info(f"Attempting to send confirmation email to applicant")
            # logging.info(f"Applicant email: {user_email}")
            # logging.info(f"Applicant name: {user_name}")
            
            # try:
            #     send_confirmation_email_to_applicant(
            #         applicant_email=user_email,
            #         applicant_name=user_name,
            #         job_title=job_title,
            #         company_name=company_name,
            #         application_id=application_id,
            #         sender_email=EMAIL_ADDRESS,
            #         sender_password=EMAIL_PASSWORD
            #     )
            #     logging.info(f"✅ Confirmation email sent successfully to applicant")
            # except Exception as email_error:
            #     logging.error(f"❌ Failed to send confirmation email: {email_error}")
            #     logging.error(f"Error details: {str(email_error)}")

            # Clean up temp file
            os.unlink(resume_path)

        return {
            "message": "✅ Enhanced resume application sent successfully!",
            "job_title": job_title,
            "company": company_name,
            "email_sent": True,
            "resume_sent": True,
            "cover_letter_sent": True,
            "application_id": application_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error in enhanced resume apply: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit enhanced resume application: {str(e)}")
        return {"error": str(e)}

@app.post("/send-bulk-confirmation")
async def send_bulk_confirmation(
    user_id: str = Body(...),
    applications: list = Body(...)
):
    """Send bulk confirmation email for multiple applications"""
    try:
        with engine.begin() as conn:
            # Fetch user profile
            user_result = conn.execute(text("SELECT * FROM user_profiles WHERE user_id = :uid"), {"uid": user_id}).fetchone()
            if not user_result:
                raise HTTPException(status_code=404, detail=f"No profile found for user_id '{user_id}'")
            user = dict(user_result._mapping)
            
            user_name = user.get("name", "Applicant")
            user_email = user.get("email", "")
            
            if not user_email:
                raise HTTPException(status_code=400, detail="User email not found")
            
            # Send bulk confirmation email
            logging.info(f"📧 SENDING BULK CONFIRMATION EMAIL:")
            logging.info(f"   FROM: {EMAIL_ADDRESS}")
            logging.info(f"   TO: {user_email}")
            logging.info(f"   APPLICANT: {user_name}")
            logging.info(f"   APPLICATIONS: {len(applications)} jobs")
            
            send_bulk_confirmation_email_to_applicant(
                applicant_email=user_email,
                applicant_name=user_name,
                applications=applications,
                sender_email=EMAIL_ADDRESS,
                sender_password=EMAIL_PASSWORD
            )
            
            logging.info(f"✅ BULK CONFIRMATION EMAIL SENT SUCCESSFULLY!")
            logging.info(f"   FROM: {EMAIL_ADDRESS}")
            logging.info(f"   TO: {user_email}")
            logging.info(f"   APPLICANT: {user_name}")
            
        return {"message": f"Bulk confirmation email sent for {len(applications)} applications"}
        
    except Exception as e:
        logging.error(f"Error sending bulk confirmation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/track-email-status")
async def track_email_status(
    application_id: int = Body(...),
    status: str = Body(...),  # 'delivered', 'read', 'responded'
    response_content: str = Body(None)
):
    """Track email delivery status and responses from HR"""
    try:
        with engine.begin() as conn:
            # Update application status
            update_query = text("""
                UPDATE jobs_applied 
                SET 
                    application_status = :status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :application_id
            """)
            
            conn.execute(update_query, {
                "application_id": application_id,
                "status": status
            })
            
            logging.info(f"Updated application {application_id} status to {status}")
            
        return {"message": f"Status updated to {status}"}
        
    except Exception as e:
        logging.error(f"Error tracking email status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-application-status/{application_id}")
def get_application_status(application_id: int):
    """Get real-time status of an application"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                id,
                job_title,
                company_name,
                application_status,
                application_date,
                created_at,
                updated_at,
                resume_sent,
                cover_letter_sent
            FROM jobs_applied 
            WHERE id = %s
        """, (application_id,))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Application not found")
        
        cur.close()
        conn.close()
        
        return {
            "id": result[0],
            "job_title": result[1],
            "company_name": result[2],
            "application_status": result[3],
            "application_date": result[4].isoformat() if result[4] else None,
            "created_at": result[5].isoformat() if result[5] else None,
            "updated_at": result[6].isoformat() if result[6] else None,
            "resume_sent": result[7],
            "cover_letter_sent": result[8]
        }
        
    except Exception as e:
        logging.error(f"Error getting application status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-real-time-stats/{user_id}")
def get_real_time_stats(user_id: str):
    """Get real-time application statistics"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get total applications
        cur.execute("""
            SELECT COUNT(*) as total
            FROM jobs_applied 
            WHERE applicant_id = %s
        """, (user_id,))
        total = cur.fetchone()[0]
        
        # Get delivered (status not 'sent')
        cur.execute("""
            SELECT COUNT(*) as delivered
            FROM jobs_applied 
            WHERE applicant_id = %s AND application_status != 'sent'
        """, (user_id,))
        delivered = cur.fetchone()[0]
        
        # Get read (status 'read' or 'responded')
        cur.execute("""
            SELECT COUNT(*) as read_count
            FROM jobs_applied 
            WHERE applicant_id = %s AND application_status IN ('read', 'responded')
        """, (user_id,))
        read_count = cur.fetchone()[0]
        
        # Get responses
        cur.execute("""
            SELECT COUNT(*) as responses
            FROM jobs_applied 
            WHERE applicant_id = %s AND application_status = 'responded'
        """, (user_id,))
        responses = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return {
            "totalSent": total,
            "delivered": delivered,
            "read": read_count,
            "responded": responses
        }
        
    except Exception as e:
        logging.error(f"Error getting real-time stats: {e}")
        # Return mock data if there's an error
        return {
            "totalSent": 0,
            "delivered": 0,
            "read": 0,
            "responded": 0
        }

@app.get("/get-total-applications/{user_id}")
def get_total_applications(user_id: str):
    try:
        cleaned_user_id = user_id.strip()
        with engine.connect() as conn:
            query = text("""
                SELECT COUNT(*) FROM jobs_applied
                WHERE TRIM(applicant_id) = :user_id
            """)
            result = conn.execute(query, {"user_id": cleaned_user_id}).scalar()
            return {"total_applications": result}
    except Exception as e:
        return {"error": str(e)}

@app.get("/get-applied-jobs/{user_id}")
def get_applied_jobs(user_id: str):
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT ja.job_id, oj.job_title, o.org_name AS company
                FROM jobs_applied ja
                JOIN org_jobs oj ON ja.job_id = oj.job_id
                LEFT JOIN organisation o ON oj.org_id = o.org_id
                WHERE ja.applicant_id = :user_id
            """)
            result = conn.execute(query, {"user_id": user_id}).fetchall()
            jobs = [dict(row._mapping) for row in result]
            return JSONResponse(content=jobs, status_code=200)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/email-webhook")
async def email_webhook(
    request: Request
):
    """Webhook endpoint to receive email delivery notifications"""
    try:
        # Get the webhook payload
        payload = await request.json()
        
        # Log the webhook for debugging
        logging.info(f"Received email webhook: {payload}")
        
        # Parse different webhook formats
        if "SendGrid" in str(payload):
            # SendGrid webhook format
            for event in payload:
                if event.get("event") in ["delivered", "open", "click"]:
                    application_id = extract_application_id_from_sendgrid(event)
                    status = map_sendgrid_status(event["event"])
                    
                    if application_id:
                        await update_application_status(application_id, status)
                        
        elif "Gmail" in str(payload):
            # Gmail webhook format
            for event in payload.get("events", []):
                if event.get("type") in ["delivered", "read"]:
                    application_id = extract_application_id_from_gmail(event)
                    status = map_gmail_status(event["type"])
                    
                    if application_id:
                        await update_application_status(application_id, status)
        
        return {"status": "success"}
        
    except Exception as e:
        logging.error(f"Error processing email webhook: {e}")
        return {"status": "error", "message": str(e)}

async def update_application_status(application_id: int, status: str):
    """Update application status in database"""
    try:
        with engine.begin() as conn:
            update_query = text("""
                UPDATE jobs_applied 
                SET 
                    status = :status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :application_id
            """)
            
            conn.execute(update_query, {
                "application_id": application_id,
                "status": status
            })
            
            logging.info(f"Updated application {application_id} status to {status}")
            
    except Exception as e:
        logging.error(f"Error updating application status: {e}")

def extract_application_id_from_sendgrid(event):
    """Extract application ID from SendGrid webhook event"""
    try:
        # Look for application ID in custom headers or email subject
        custom_args = event.get("custom_args", {})
        application_id = custom_args.get("application_id")
        
        if not application_id:
            # Try to extract from email subject
            subject = event.get("email", "")
            # Look for pattern like "Application for Job - ID:123"
            import re
            match = re.search(r"ID:(\d+)", subject)
            if match:
                application_id = int(match.group(1))
        
        return int(application_id) if application_id else None
        
    except Exception as e:
        logging.error(f"Error extracting application ID from SendGrid: {e}")
        return None

def extract_application_id_from_gmail(event):
    """Extract application ID from Gmail webhook event"""
    try:
        # Gmail webhook format
        message = event.get("message", {})
        headers = message.get("headers", [])
        
        for header in headers:
            if header.get("name") == "X-Application-ID":
                return int(header.get("value"))
        
        return None
        
    except Exception as e:
        logging.error(f"Error extracting application ID from Gmail: {e}")
        return None

def map_sendgrid_status(event_type: str) -> str:
    """Map SendGrid event type to application status"""
    mapping = {
        "delivered": "delivered",
        "open": "read", 
        "click": "read",
        "bounce": "failed",
        "dropped": "failed"
    }
    return mapping.get(event_type, "sent")

def map_gmail_status(event_type: str) -> str:
    """Map Gmail event type to application status"""
    mapping = {
        "delivered": "delivered",
        "read": "read"
    }
    return mapping.get(event_type, "sent")

@app.get("/auto-apply-form")
def auto_apply_form():
    return HTMLResponse("""
    <form action="/auto-apply" method="post">
      <label>User ID:</label> <input name="user_id" type="text"><br><br>
      <label>Job ID:</label> <input name="job_id" type="number"><br><br>
      <input type="submit" value="Send Application by Job ID">
    </form>
    """)

@app.get("/")
def root():
    return HTMLResponse("""
    <h2>Welcome to Auto Resume Sender</h2>
    <form action="/auto-apply" method="post">
      <label>User ID:</label> <input name="user_id" type="text"><br><br>
      <label>Top N Jobs:</label> <input name="top_n" type="number" value="3"><br><br>
      <input type="submit" value="Auto Apply">
    </form>
    """)

# @app.get("/gmail/check-email-status/{message_id}")
# def check_gmail_email_status(message_id: str):
#     """Check the status of a Gmail email"""
#     try:
#         if not gmail_service:
#             raise HTTPException(status_code=400, detail="Gmail service not available")
#         
#         status = gmail_service.check_email_status(message_id)
#         return status
#         
#     except Exception as e:
#         logging.error(f"Error checking Gmail email status: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/gmail/list-sent-emails")
# def list_gmail_sent_emails(max_results: int = 10):
#     """List recently sent Gmail emails"""
#     try:
#         if not gmail_service:
#             raise HTTPException(status_code=400, detail="Gmail service not available")
#         
#         emails = gmail_service.list_sent_emails(max_results)
#         return {"emails": emails}
#         
#     except Exception as e:
#         logging.error(f"Error listing Gmail sent emails: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/gmail/email-thread/{thread_id}")
# def get_gmail_email_thread(thread_id: str):
#     """Get all messages in a Gmail thread"""
#     try:
#         if not gmail_service:
#             raise HTTPException(status_code=400, detail="Gmail service not available")
#         
#         messages = gmail_service.get_email_thread(thread_id)
#         return {"messages": messages}
#         
#     except Exception as e:
#         logging.error(f"Error getting Gmail email thread: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/gmail/mark-as-read/{message_id}")
# def mark_gmail_as_read(message_id: str):
#     """Mark a Gmail email as read"""
#     try:
#         if not gmail_service:
#             raise HTTPException(status_code=400, detail="Gmail service not available")
#         
#         success = gmail_service.mark_as_read(message_id)
#         return {"success": success}
#         
#     except Exception as e:
#         logging.error(f"Error marking Gmail email as read: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/gmail/add-label/{message_id}")
# def add_gmail_label(message_id: str, label_name: str = Body(...)):
#     """Add a custom label to a Gmail email"""
#     try:
#         if not gmail_service:
#             raise HTTPException(status_code=400, detail="Gmail service not available")
#         
#         success = gmail_service.add_label(message_id, label_name)
#         print("✅ Gmail API and SendGrid code commented out successfully!")
#         return {"success": success}
#         
#     except Exception as e:
#         logging.error(f"Error adding Gmail label: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-email")
async def test_email(
    to_email: str = Body(...),
    subject: str = Body(...),
    body: str = Body(...)
):
    """Test endpoint to send a simple email without attachments"""
    try:
        logging.info(f"Testing email to: {to_email}")
        
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = format_sender(EMAIL_ADDRESS)
        msg['To'] = to_email
        msg.set_content(body)

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        
        logging.info("Test email sent successfully")
        return {"message": "Test email sent successfully", "to": to_email}
        
    except Exception as e:
        logging.error(f"Error sending test email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")

@app.get("/debug-jobs-applied")
def debug_jobs_applied():
    """Debug endpoint to check jobs_applied table"""
    try:
        with engine.begin() as conn:
            # Check total count
            count_result = conn.execute(text("SELECT COUNT(*) FROM jobs_applied"))
            total_count = count_result.fetchone()[0]
            
            # Get sample data
            sample_result = conn.execute(text("""
                SELECT applicant_id, job_id, application_date, application_status, sent_at
                FROM jobs_applied 
                ORDER BY sent_at DESC 
                LIMIT 10
            """))
            sample_data = [dict(row._mapping) for row in sample_result.fetchall()]
            
            return {
                "total_applications": total_count,
                "sample_applications": sample_data,
                "table_exists": True
            }
    except Exception as e:
        logging.error(f"Error checking jobs_applied table: {e}")
        return {
            "error": str(e),
            "table_exists": False
        }

@app.post("/test-create-application")
def test_create_application(
    user_id: str = Body(...),
    job_id: int = Body(...)
):
    """Test endpoint to manually create an application record"""
    try:
        with engine.begin() as conn:
            logging.info(f"Testing application creation for user {user_id}, job {job_id}")
            
            insert_query = text("""
                INSERT INTO jobs_applied (
                    applicant_id, job_id, application_date, application_status, sent_at, updated_at
                )
                VALUES (
                    :user_id, :job_id, CURRENT_DATE, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                ON CONFLICT (job_id, applicant_id) DO UPDATE SET
                    application_status = 'applied',
                    sent_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING job_id
            """)
            
            result = conn.execute(insert_query, {
                "user_id": user_id, 
                "job_id": job_id
            })
            
            application_id = result.fetchone()[0]
            logging.info(f"✅ Test application created with ID: {application_id}")
            
            return {
                "message": "Test application created successfully",
                "application_id": application_id,
                "user_id": user_id,
                "job_id": job_id
            }
            
    except Exception as e:
        logging.error(f"❌ Test application creation failed: {e}")
        return {
            "error": str(e),
            "user_id": user_id,
            "job_id": job_id
        }

@app.get("/debug-job-data/{job_id}")
def debug_job_data(job_id: int):
    """Debug endpoint to check job data for a specific job"""
    try:
        # Check if job exists in the loaded jobs data
        if jobs_df is not None and not jobs_df.empty:
            job_row = jobs_df[jobs_df['job_id'] == job_id]
            if not job_row.empty:
                job = job_row.iloc[0]
                return {
                    "job_id": job_id,
                    "job_title": job.get('job_title', 'N/A'),
                    "org_name": job.get('org_name', 'N/A'),
                    "apply_link": job.get('apply_link', 'N/A'),
                    "job_location": job.get('job_location', 'N/A'),
                    "salary": job.get('salary', 'N/A'),
                    "found": True
                }
            else:
                return {
                    "job_id": job_id,
                    "found": False,
                    "message": "Job not found in loaded data"
                }
        else:
            return {
                "job_id": job_id,
                "found": False,
                "message": "No jobs data loaded"
            }
    except Exception as e:
        logging.error(f"Error checking job data for job {job_id}: {e}")
        return {
            "job_id": job_id,
            "error": str(e)
        }

SENDER_DISPLAY_NAME = "AIPlaneTech CareerMatch"
def format_sender(email):
    return f"{SENDER_DISPLAY_NAME} <{email}>"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9005) 