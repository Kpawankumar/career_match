import os
import logging
from google.cloud import storage
from google.oauth2 import service_account
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "dev-bucket-aaas")
UPLOAD_FOLDER_NAME = os.getenv("UPLOAD_FOLDER_NAME", "user1")

# Reconstruct multiline private key
private_key = os.getenv("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")

# Build credentials dictionary from environment
GCS_CREDENTIALS_DICT = {
    "type": os.getenv("GOOGLE_TYPE"),
    "project_id": os.getenv("GOOGLE_PROJECT_ID"),
    "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
    "private_key": private_key,
    "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
    "auth_uri": os.getenv("GOOGLE_AUTH_URI"),
    "token_uri": os.getenv("GOOGLE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("GOOGLE_AUTH_PROVIDER_X509_CERT_URL"),
    "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_X509_CERT_URL"),
    "universe_domain": os.getenv("GOOGLE_UNIVERSE_DOMAIN")
}

# Initialize GCS client
try:
    credentials = service_account.Credentials.from_service_account_info(GCS_CREDENTIALS_DICT)
    gcs_client = storage.Client(credentials=credentials, project=GCS_CREDENTIALS_DICT["project_id"])
    bucket = gcs_client.bucket(GCS_BUCKET_NAME)
    logging.info(f"Connected to GCS bucket: {GCS_BUCKET_NAME}")
except Exception as e:
    logging.error(f"Failed to initialize GCS client: {e}")
    raise Exception(f"Failed to initialize GCS client: {e}")

def upload_to_gcs(file, user_id: str) -> str:
    """
    Uploads a file to Google Cloud Storage and returns the GCS path.
    
    Args:
        file: The FastAPI UploadFile object to upload.
        user_id: The user ID to organize the file in GCS.
    
    Returns:
        str: The GCS path where the file is stored (e.g., 'uploads/user_id/filename').
    
    Raises:
        Exception: If the upload fails.
    """
    try:
        filename = secure_filename(file.filename).replace(" ", "_")
        gcs_path = f"{UPLOAD_FOLDER_NAME}/{user_id}/{filename}"
        blob = bucket.blob(gcs_path)
        blob.upload_from_file(file.file, content_type=file.content_type)
        logging.info(f"Uploaded file to GCS: {gcs_path}")
        return gcs_path
    except Exception as e:
        logging.error(f"Failed to upload file to GCS: {e}")
        raise
