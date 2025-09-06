import os
import base64
import json
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import pickle

# Gmail API scopes
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
]

class GmailService:
    def __init__(self):
        self.service = None
        self.credentials = None
        self.setup_gmail_service()

    def setup_gmail_service(self):
        """Set up Gmail API service"""
        try:
            # Load credentials from file
            creds = None
            token_path = 'token.pickle'
            credentials_path = 'credentials.json'

            # Check if we have valid credentials
            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    creds = pickle.load(token)

            # If no valid credentials available, let the user log in
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not os.path.exists(credentials_path):
                        raise FileNotFoundError(
                            "credentials.json not found. Please download from Google Cloud Console"
                        )
                    
                    flow = InstalledAppFlow.from_client_secrets_file(
                        credentials_path, SCOPES)
                    creds = flow.run_local_server(port=0)

                # Save the credentials for the next run
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)

            # Build the Gmail service
            self.service = build('gmail', 'v1', credentials=creds)
            self.credentials = creds
            logging.info("Gmail API service initialized successfully")

        except Exception as e:
            logging.error(f"Error setting up Gmail service: {e}")
            raise

    def send_email_with_attachment(self, to_email, subject, body, attachment_path, application_id):
        """Send email with attachment using Gmail API"""
        try:
            # Create message
            message = MIMEMultipart()
            message['to'] = to_email
            message['subject'] = subject

            # Add body
            msg = MIMEText(body)
            message.attach(msg)

            # Add custom headers for tracking
            message['X-Application-ID'] = str(application_id)
            message['X-Job-Title'] = subject.split(" - ")[0] if " - " in subject else "Application"

            # Add attachment if provided
            if attachment_path and os.path.exists(attachment_path):
                with open(attachment_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())

                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= Enhanced_Resume_{application_id}.pdf'
                )
                message.attach(part)

            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

            # Send the email
            sent_message = self.service.users().messages().send(
                userId='me', body={'raw': raw_message}
            ).execute()

            logging.info(f"Gmail email sent successfully. Message ID: {sent_message['id']}")
            return {
                'success': True,
                'message_id': sent_message['id'],
                'thread_id': sent_message.get('threadId')
            }

        except HttpError as error:
            logging.error(f"Gmail API error: {error}")
            return {'success': False, 'error': str(error)}
        except Exception as e:
            logging.error(f"Error sending Gmail email: {e}")
            return {'success': False, 'error': str(e)}

    def check_email_status(self, message_id):
        """Check the status of a sent email"""
        try:
            message = self.service.users().messages().get(
                userId='me', id=message_id, format='full'
            ).execute()

            # Check if email has been read (has labels like 'UNREAD' removed)
            labels = message.get('labelIds', [])
            is_read = 'UNREAD' not in labels

            return {
                'message_id': message_id,
                'is_read': is_read,
                'labels': labels,
                'snippet': message.get('snippet', ''),
                'internal_date': message.get('internalDate')
            }

        except HttpError as error:
            logging.error(f"Error checking email status: {error}")
            return {'error': str(error)}

    def list_sent_emails(self, max_results=10):
        """List recently sent emails"""
        try:
            results = self.service.users().messages().list(
                userId='me', labelIds=['SENT'], maxResults=max_results
            ).execute()

            messages = results.get('messages', [])
            return messages

        except HttpError as error:
            logging.error(f"Error listing sent emails: {error}")
            return []

    def get_email_thread(self, thread_id):
        """Get all messages in a thread"""
        try:
            thread = self.service.users().threads().get(
                userId='me', id=thread_id
            ).execute()

            return thread.get('messages', [])

        except HttpError as error:
            logging.error(f"Error getting email thread: {error}")
            return []

    def mark_as_read(self, message_id):
        """Mark an email as read"""
        try:
            self.service.users().messages().modify(
                userId='me', id=message_id, body={'removeLabelIds': ['UNREAD']}
            ).execute()
            return True

        except HttpError as error:
            logging.error(f"Error marking email as read: {error}")
            return False

    def add_label(self, message_id, label_name):
        """Add a custom label to an email"""
        try:
            # First, create the label if it doesn't exist
            try:
                label = self.service.users().labels().create(
                    userId='me',
                    body={
                        'name': label_name,
                        'labelListVisibility': 'labelShow',
                        'messageListVisibility': 'show'
                    }
                ).execute()
                label_id = label['id']
            except HttpError:
                # Label might already exist, try to find it
                labels = self.service.users().labels().list(userId='me').execute()
                label_id = None
                for label in labels.get('labels', []):
                    if label['name'] == label_name:
                        label_id = label['id']
                        break

            if label_id:
                self.service.users().messages().modify(
                    userId='me', id=message_id, body={'addLabelIds': [label_id]}
                ).execute()
                return True

        except HttpError as error:
            logging.error(f"Error adding label: {error}")
            return False

# Global Gmail service instance
gmail_service = None

def get_gmail_service():
    """Get or create Gmail service instance"""
    global gmail_service
    if gmail_service is None:
        gmail_service = GmailService()
    return gmail_service 