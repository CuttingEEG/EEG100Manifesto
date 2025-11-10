# Google Sheets Export Setup

This document explains how to export anonymized signatory data to Google Sheets.

## Overview

The `export_to_sheets.py` script:
- Fetches all records from the Supabase `signatories` table
- Removes identifying columns (id, first_name, last_name, email, orcid, comment)
- Exports the anonymized data to a Google Sheet

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" → "Enable APIs and Services"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Create a Service Account

1. In Google Cloud Console, go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Give it a name (e.g., "sheets-exporter")
4. Click "Create and Continue"
5. Grant it the "Editor" role (or minimum permissions needed)
6. Click "Done"

### 3. Create Service Account Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose JSON format
5. Download the JSON key file (keep it secure!)

### 4. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Copy the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Copy the `{SHEET_ID}` part
4. Share the sheet with the service account email:
   - Click "Share" button
   - Add the service account email (found in the JSON key file as `client_email`)
   - Give it "Editor" permissions

### 5. Set Up GitHub Secrets

Add these secrets to your GitHub repository:

1. **GOOGLE_SHEETS_CREDENTIALS**
   - Copy the entire contents of the JSON key file
   - Paste it as the value (it should be a single-line JSON string)

2. **GOOGLE_SHEET_ID**
   - Paste the Sheet ID you copied earlier

To add secrets in GitHub:
- Go to your repository → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Add each secret

### 6. Update GitHub Workflow (Optional)

If you want to automate the export, add this job to `.github/workflows/build_docs.yml`:

```yaml
  export_to_sheets:
    name: Export Anonymized Data to Google Sheets
    runs-on: ubuntu-latest
    needs: build_and_deploy  # Run after the main build
    
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      GOOGLE_SHEETS_CREDENTIALS: ${{ secrets.GOOGLE_SHEETS_CREDENTIALS }}
      GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install uv
        uses: astral-sh/setup-uv@v6
      
      - name: "Set up Python"
        uses: actions/setup-python@v5
        with:
          python-version-file: "pyproject.toml"
      
      - name: Install the project
        run: uv sync --locked --all-extras --dev
      
      - name: Export to Google Sheets
        run: uv run python export_to_sheets.py
```

## Manual Execution

To run the export manually:

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'  # Full JSON
export GOOGLE_SHEET_ID="your-sheet-id"

# Install dependencies
uv sync

# Run the export
uv run python export_to_sheets.py
```

## Data Privacy

The script excludes these identifying columns:
- `id` - Unique identifier
- `first_name` - First name
- `last_name` - Last name
- `affiliation` - Affiliation
- `email` - Email address
- `orcid` - ORCID identifier
- `comment` - Free text that may contain identifying info

## Exported Columns

The exported sheet will include:
- `created_at` - Timestamp of submission
- `show_name` - Whether signatory opted to show their name publicly
- `gender` - Gender
- `career_stage` - Career stage
- `country_of_origin` - Country of origin
- `age` - Age
- `country_of_residence` - Country of residence
- All pledge columns (`pledge_1_1_1`, `pledge_1_1_2`, etc.)

## Troubleshooting

### "Permission denied" error
- Ensure the Google Sheet is shared with the service account email
- Check that the service account has Editor permissions

### "Invalid credentials" error
- Verify that `GOOGLE_SHEETS_CREDENTIALS` contains valid JSON
- Check that the JSON hasn't been corrupted (no extra quotes or escaping issues)

### "Spreadsheet not found" error
- Verify the `GOOGLE_SHEET_ID` is correct
- Ensure the sheet exists and is accessible

### No data exported
- Check that the Supabase credentials are correct
- Verify that there is data in the `signatories` table
