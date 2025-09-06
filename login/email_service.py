import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

# --- Credentials Helper ---
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_EMAIL_PASSWORD = os.getenv("SENDER_EMAIL_PASSWORD")

# --- Function to Send Admin Welcome Email ---
async def send_admin_welcome_email(recipient_email: str, username: str, admin_id: str):
    """
    Sends a welcome email to a new admin with their unique Admin ID.
    """
    if not SENDER_EMAIL or not SENDER_EMAIL_PASSWORD:
        print("\n--- WARNING: Email sender credentials not set. Skipping admin welcome email. ---")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome! Your Admin Account is Ready"
    msg["From"] = SENDER_EMAIL
    msg["To"] = recipient_email

    text_content = f"""
    Hi {username},

    Welcome aboard! Your administrator account has been successfully created.

    Your unique Admin ID is: {admin_id}

    You can now log in using your email ({recipient_email}) and the password you created.

    Best regards,
    The Support Team
    AIPlanetech CareerMatch
    """

    html_content = f"""
    <html>
        <body>
            <p>Hi {username},</p>
            <p>Welcome aboard! Your administrator account has been successfully created.</p>
            <p>Your unique <strong>Admin ID</strong> is: <code>{admin_id}</code></p>
            <p>You can now log in using your email ({recipient_email}) and the password you created.</p>
            <p>Best regards,<br>The Support Team<br>
            <strong>AIPlanetech CareerMatch</strong></p>
        </body>
    </html>
    """

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, SENDER_EMAIL_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        print(f"Admin welcome email sent successfully to {recipient_email}")
    except Exception as e:
        print(f"Failed to send admin welcome email to {recipient_email}: {e}")

# --- Function to Send HR Welcome Email ---
async def send_hr_welcome_email(recipient_email: str, hr_name: str, hr_id: str):
    """
    Sends a welcome email to a new HR with their unique HR ID.
    """
    if not SENDER_EMAIL or not SENDER_EMAIL_PASSWORD:
        print("\n--- WARNING: Email sender credentials not set. Skipping HR welcome email. ---")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome! Your HR Account is Ready"
    msg["From"] = SENDER_EMAIL
    msg["To"] = recipient_email

    text_content = f"""
    Hi {hr_name},

    Welcome! Your HR account has been successfully created.

    Your unique HR ID is: {hr_id}

    You can now log in using your email ({recipient_email}) and the password you created.

    Best regards,
    The Admin Team
    AIPlanetech CareerMatch
    """

    html_content = f"""
    <html>
        <body>
            <p>Hi {hr_name},</p>
            <p>Welcome! Your HR account has been successfully created.</p>
            <p>Your unique <strong>HR ID</strong> is: <code>{hr_id}</code></p>
            <p>You can now log in using your email ({recipient_email}) and the password you created.</p>
            <p>Best regards,<br>The Admin Team<br>
            <strong>AIPlanetech CareerMatch</strong></p>
        </body>
    </html>
    """

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, SENDER_EMAIL_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        print(f"HR welcome email sent successfully to {recipient_email}")
    except Exception as e:
        print(f"Failed to send HR welcome email to {recipient_email}: {e}")

# --- Function to Send Applicant Welcome Email ---
async def send_applicant_welcome_email(recipient_email: str, applicant_name: str, applicant_id: str):
    """
    Sends a welcome email to a new applicant with their unique Applicant ID.
    """
    if not SENDER_EMAIL or not SENDER_EMAIL_PASSWORD:
        print("\n--- WARNING: Email sender credentials not set. Skipping applicant welcome email. ---")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome! Your Applicant Account is Ready"
    msg["From"] = SENDER_EMAIL
    msg["To"] = recipient_email

    text_content = f"""
    Dear {applicant_name},

    Congratulations! Your applicant account has been successfully registered.

    Your unique Applicant ID is: {applicant_id}

    You can now log in using your email ({recipient_email}) and the password you created.

    Best regards,
    The Registration Team
    AIPlanetech CareerMatch
    """

    html_content = f"""
    <html>
        <body>
            <p>Dear {applicant_name},</p>
            <p>Congratulations! Your applicant account has been successfully registered.</p>
            <p>Your unique <strong>Applicant ID</strong> is: <code>{applicant_id}</code></p>
            <p>You can now log in using your email ({recipient_email}) and the password you created.</p>
            <p>Best regards,<br>The Registration Team<br>
            <strong>AIPlanetech CareerMatch</strong></p>
        </body>
    </html>
    """

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, SENDER_EMAIL_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        print(f"Applicant welcome email sent successfully to {recipient_email}")
    except Exception as e:
        print(f"Failed to send applicant welcome email to {recipient_email}: {e}")
