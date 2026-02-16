# LinkedIn X-ray Search Lead Generator

A Python script that uses Google Cloud Discovery Engine to perform Boolean X-ray searches and generate high-quality B2B leads from LinkedIn profiles.

## What This Does

This tool scrapes LinkedIn profile URLs using Boolean search queries via Google's Discovery Engine API. Unlike traditional lead gen tools that rely on pre-filtered databases, this searches Google's actual index—giving you more accurate, up-to-date results.

**Key Features:**
- 🎯 **Precise targeting** with Boolean search logic
- 📊 **Stateful pagination** - resume searches across multiple runs without losing progress
- 🚫 **Automatic deduplication** - never save the same lead twice
- 💰 **Cost-effective** - build your own lead database instead of paying per-lead
- ⚡ **Scalable** - generate thousands of leads over time

## How It Works

1. **Search**: Uses Boolean queries to find LinkedIn profiles matching your criteria
2. **Save**: Exports profile URLs, names, and snippets to CSV
3. **Enrich**: Feed the CSV to email finder tools (Hunter.io, Snov.io, Apollo, etc.) to get contact data

## Prerequisites

- Python 3.10+
- Google Cloud Platform account with Discovery Engine API enabled
- A configured Discovery Engine search engine

## Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd linkedin-xray-search
```

2. **Install dependencies**
```bash
pip install google-cloud-discoveryengine --break-system-packages
```

3. **Set up Google Cloud credentials**
```bash
# Download your service account key from GCP
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

4. **Configure the script**

Edit the configuration section at the top of the script:

```python
PROJECT_ID = "your-gcp-project-id"
LOCATION = "global"  # or your specific location
ENGINE_ID = "your-search-engine-id"
QUERY = 'your-boolean-search-query'
```

## Configuration

### Required Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `PROJECT_ID` | Your Google Cloud project ID | `"my-lead-gen-project"` |
| `LOCATION` | Discovery Engine location | `"global"` |
| `ENGINE_ID` | Your search engine ID | `"my-search-engine_1234567890"` |
| `QUERY` | Boolean search query | See examples below |

### Optional Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CSV_PATH` | `"ca_nmls_leads.csv"` | Output CSV filename |
| `LAST_TOKEN_PATH` | `"last_page_token.txt"` | Page token storage file |
| `PAGES_PER_RUN` | `10` | Number of pages to fetch per execution |
| `PAGE_SIZE` | `10` | Results per page (10-50 recommended) |

## Usage

### Basic Usage

Run the script to start collecting leads:

```bash
python script.py
```

**First run output:**
```
Already saved: 0 unique links
Resuming from previous page token: None (starting fresh)
Fetching page 1/10...
   Page had 10 results → added 10 new.
Fetching page 2/10...
   Page had 10 results → added 10 new.
...
New unique leads this run: 100
Next run will continue from page 11 onward.
```

**Subsequent runs:**
```bash
python script.py
```

```
Already saved: 100 unique links
Resuming from previous page token: Yes
Fetching page 11/10...
   Page had 10 results → added 10 new.
...
New unique leads this run: 100
Next run will continue from page 21 onward.
```

### Automated Collection

Set up a cron job to automatically collect leads:

```bash
# Run every hour
0 * * * * cd /path/to/script && python script.py >> lead_gen.log 2>&1

# Run daily at 9 AM
0 9 * * * cd /path/to/script && python script.py >> lead_gen.log 2>&1
```

## Boolean Query Examples

### Mortgage Brokers in California
```python
QUERY = '("Loan Broker" OR "Mortgage Broker" OR "Mortgage Loan Originator") "California" "NMLS"'
```

### SaaS Growth Marketers
```python
QUERY = '("Growth Marketing" OR "Demand Generation" OR "Marketing Manager") ("SaaS" OR "B2B") site:linkedin.com/in/'
```

### AI/ML Engineers at Startups
```python
QUERY = '("Machine Learning Engineer" OR "AI Engineer" OR "ML Engineer") ("startup" OR "series A" OR "series B") site:linkedin.com/in/'
```

### Sales Leaders in Fintech
```python
QUERY = '("VP Sales" OR "Head of Sales" OR "Chief Revenue Officer") ("fintech" OR "financial technology") site:linkedin.com/in/'
```

### Excluding Job Seekers
```python
QUERY = '"Software Engineer" "San Francisco" -"seeking opportunities" -"open to work" site:linkedin.com/in/'
```

## Output Format

Results are saved to a CSV file with the following columns:

| Column | Description |
|--------|-------------|
| `Name/Title` | Person's name or LinkedIn headline |
| `Link` | Full LinkedIn profile URL |
| `Snippet` | Preview text from the profile |

**Example CSV:**
```csv
Name/Title,Link,Snippet
John Doe - Senior Mortgage Broker,https://linkedin.com/in/johndoe,"Licensed NMLS broker specializing in..."
Jane Smith - Loan Officer,https://linkedin.com/in/janesmith,"10+ years experience in California..."
```

## Next Steps: Email Enrichment

Once you have your CSV of LinkedIn URLs, use email finder tools to get contact information:

### Option 1: Hunter.io
```bash
# Upload CSV to Hunter.io bulk finder
# Download enriched results with emails
```

### Option 2: Snov.io
```bash
# Use their LinkedIn URL to Email feature
# Bulk upload your CSV
```

### Option 3: Apollo.io API
```python
import requests

for profile_url in linkedin_urls:
    response = requests.post(
        "https://api.apollo.io/v1/people/match",
        headers={"x-api-key": "YOUR_API_KEY"},
        json={"linkedin_url": profile_url}
    )
    # Extract email from response
```

## How Stateful Pagination Works

The script saves progress between runs using a page token:

1. **First run**: Fetches pages 1-10, saves page token for page 11
2. **Second run**: Resumes from page 11, fetches 11-20, saves token for page 21
3. **Third run**: Resumes from page 21, fetches 21-30, etc.

This means you can:
- ✅ Collect thousands of leads without rate limit issues
- ✅ Stop and resume anytime without losing progress
- ✅ Run on a schedule to gradually build your database
- ✅ Never waste API calls re-fetching the same results

**Reset progress:**
```bash
rm last_page_token.txt  # Start fresh from page 1
```

## Deduplication

The script automatically prevents duplicate leads:

- Loads all existing LinkedIn URLs from the CSV before each run
- Checks each new result against the existing set
- Only adds URLs that haven't been saved before

**Result**: Your CSV stays clean, and you don't waste money enriching the same lead twice.

## Rate Limiting

The script includes a 0.8-second delay between page requests:

```python
time.sleep(0.8)
```

This prevents hitting API rate limits. Adjust if needed, but going faster may cause request failures.

## Troubleshooting

### "API error: 403 Permission Denied"
- Verify your GCP service account has Discovery Engine API permissions
- Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

### "No results found"
- Your Boolean query might be too restrictive
- Try broadening your search terms
- Verify your Discovery Engine is configured to search the web

### Page token expired
- Page tokens typically last 24-48 hours
- If you pause too long between runs, delete `last_page_token.txt` and restart
- Previously saved leads are preserved in the CSV

### Duplicate leads appearing
- The script deduplicates by LinkedIn URL only
- If profiles have different URLs but same person, they'll both be saved
- Clean these up during the email enrichment phase

## Cost Analysis

**Google Discovery Engine API:**
- First 1,000 queries/month: Free
- After that: ~$5 per 1,000 queries
- Each run = 10 queries (10 pages), so ~100 runs/month before charges

**Email Enrichment:**
- Hunter.io: ~$0.01-0.05 per email found
- Snov.io: ~$0.02-0.04 per email found
- Apollo.io: ~$0.03-0.06 per email found

**Comparison**: Traditional lead gen tools charge $0.50-2.00 per lead. This approach costs ~$0.05-0.10 per enriched lead.

## Best Practices

1. **Start broad, then refine**: Test your Boolean query with small runs first
2. **Monitor quality**: Review the first 50-100 results before scaling up
3. **Use negative keywords**: Filter out job seekers, recruiters, etc.
4. **Batch your enrichment**: Don't send emails to tools one-by-one; upload in bulk
5. **Validate emails**: Use email verification tools before outreach to maintain sender reputation

## Limitations

- Page tokens expire after 24-48 hours of inactivity
- Google's index may not include very new LinkedIn profiles (usually 1-2 day delay)
- Some LinkedIn profiles may be excluded from Google's index due to privacy settings
- API rate limits apply (usually 100 requests/minute)

## Security Notes

⚠️ **Never commit your credentials to version control**

```bash
# Add to .gitignore
service-account-key.json
*.csv
last_page_token.txt
*.log
```

## License

MIT License - feel free to modify and use commercially.

## Contributing

Pull requests welcome! Areas for improvement:
- [ ] Add support for multiple search engines
- [ ] Implement retry logic for failed requests
- [ ] Add email enrichment directly in the script
- [ ] Create a web UI for easier configuration
- [ ] Add support for other platforms (Twitter, GitHub, etc.)

## Support

Found a bug? Have a question? Open an issue on GitHub.

---

**Built by devs who were tired of paying $2/lead for garbage data.**
