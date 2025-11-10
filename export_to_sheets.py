import os
import json
from supabase import create_client, Client
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# --- Configuration from Environment Variables ---
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
GOOGLE_SHEETS_CREDENTIALS = os.environ.get('GOOGLE_SHEETS_CREDENTIALS')  # JSON string
GOOGLE_SHEET_ID = os.environ.get('GOOGLE_SHEET_ID')  # The ID from the sheet URL

# Define columns to exclude (identifying information)
EXCLUDED_COLUMNS = [
    'id',
    'first_name', 
    'last_name',
    'affiliation',
    'email',
    'orcid',
    'comment',  # May contain identifying information
]

def fetch_all_submissions():
    """Fetches all submissions from Supabase using the service_role key."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase URL or Service Role Key environment variables are not set.")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try:
        # Fetch all data from signatories table
        response = supabase.table('signatories').select('*').execute()
        
        if response.data:
            print(f"Fetched {len(response.data)} records from Supabase")
            return response.data
        else:
            print(f"Error fetching data from Supabase: {response.error}")
            return None
    except Exception as e:
        print(f"An unexpected error occurred during Supabase fetch: {e}")
        return None

def anonymize_data(data):
    """Remove identifying columns from the data."""
    if not data:
        return []
    
    anonymized = []
    for row in data:
        # Create a new dict without excluded columns
        anon_row = {k: v for k, v in row.items() if k not in EXCLUDED_COLUMNS}
        anonymized.append(anon_row)
    
    print(f"Anonymized {len(anonymized)} records")
    print(f"Excluded columns: {', '.join(EXCLUDED_COLUMNS)}")
    
    return anonymized

def export_to_google_sheets(data):
    """Export anonymized data to Google Sheets."""
    if not GOOGLE_SHEETS_CREDENTIALS or not GOOGLE_SHEET_ID:
        raise ValueError("Google Sheets credentials or Sheet ID not set.")
    
    if not data:
        print("No data to export")
        return
    
    try:
        # Parse credentials from JSON string
        creds_dict = json.loads(GOOGLE_SHEETS_CREDENTIALS)
        credentials = Credentials.from_service_account_info(
            creds_dict,
            scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        
        # Build the Sheets API service
        service = build('sheets', 'v4', credentials=credentials)
        sheet = service.spreadsheets()
        
        # Get column headers from first record
        if data:
            headers = list(data[0].keys())
            
            # Prepare data for sheets (convert to list of lists)
            values = [headers]  # First row is headers
            for row in data:
                values.append([row.get(col) for col in headers])
            
            # Clear existing data first
            try:
                sheet.values().clear(
                    spreadsheetId=GOOGLE_SHEET_ID,
                    range='SignatureData'
                ).execute()
            except HttpError as clear_error:
                print(f"Warning: Could not clear sheet (may be empty): {clear_error}")
            
            # Write the data
            body = {
                'values': values
            }
            result = sheet.values().update(
                spreadsheetId=GOOGLE_SHEET_ID,
                range='SignatureData!A1',
                valueInputOption='RAW',
                body=body
            ).execute()
            
            print(f"Successfully exported {result.get('updatedRows')} rows to Google Sheets")
            print(f"Columns included: {', '.join(headers)}")
            
    except HttpError as error:
        print(f"An error occurred with Google Sheets API: {error}")
    except json.JSONDecodeError as error:
        print(f"Error parsing Google credentials JSON: {error}")
    except Exception as e:
        print(f"An unexpected error occurred during export: {e}")

def main():
    """Main execution function."""
    print("Starting anonymized data export to Google Sheets...")
    print("-" * 60)
    
    # Fetch data from Supabase
    data = fetch_all_submissions()
    
    if data is None:
        print("Failed to fetch data. Exiting.")
        return
    
    # Anonymize the data
    anonymized_data = anonymize_data(data)
    
    # Export to Google Sheets
    export_to_google_sheets(anonymized_data)
    
    print("-" * 60)
    print("Export process completed.")

if __name__ == "__main__":
    main()
