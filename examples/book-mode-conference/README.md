# Book Mode Conference Note Generator

This example demonstrates how to create a "book mode" conference note system using the HackMD API with resume functionality for production environments.

## What This Example Does

1. **Creates Individual Session Notes**: One note per session with:
   - Session title and speaker information
   - Time, room, and session details
   - Embedded announcement note
   - Sections for notes, Q&A, and discussion

2. **Creates Main Book Note**: A master index that:
   - Lists all session notes organized by day and time
   - Provides easy navigation between sessions
   - Serves as the conference note hub

3. **Resume Functionality**: 
   - Saves progress automatically
   - Can resume if interrupted (power outage, network issues, etc.)
   - Tracks completed sessions to avoid duplicates

## Setup

### 1. Install Dependencies
```bash
cd /path/to/api-client/examples/book-mode-conference
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

Required `.env` settings:
```bash
HACKMD_ACCESS_TOKEN=your_access_token_here
HACKMD_API_ENDPOINT=https://api.hackmd.io/v1
HACKMD_WEB_DOMAIN=https://hackmd.io
```

### 3. Customize Configuration

Edit the constants at the top of `index.ts`:

```typescript
// HackMD announcement note to embed in each session note
const ANNOUNCEMENT_NOTE = '@TechConf/announcement-note-id'

// Team path where notes will be created
const TEAM_PATH = 'TechConf'

// Conference name for titles and content
const CONFERENCE_NAME = 'TechConf 2025'
```

### 4. Prepare Session Data

Ensure `sessions.json` exists with your conference session data:

```json
[
  {
    "id": "session-001",
    "title": "Opening Keynote: The Future of Technology",
    "speaker": [
      {
        "speaker": {
          "public_name": "John Doe"
        }
      }
    ],
    "session_type": "keynote",
    "started_at": "2025-03-15T09:00:00Z",
    "finished_at": "2025-03-15T09:30:00Z",
    "tags": ["welcome", "keynote"],
    "classroom": {
      "tw_name": "主舞台",
      "en_name": "Main Stage"
    },
    "language": "en",
    "difficulty": "General"
  }
]
```

## Usage

### Test Mode (Recommended First)
```bash
# Creates only 3 sessions for testing
npx tsx index.ts --test
```

### Production Mode
```bash
# Create all session notes
npx tsx index.ts

# With rate limiting (recommended for large conferences)
npx tsx index.ts --delay-ms 300
```

### Resume Interrupted Execution
```bash
# If the script was interrupted, resume from where it left off
npx tsx index.ts --resume

# Resume with rate limiting
npx tsx index.ts --resume --delay-ms 500
```

### All Available Options
```bash
npx tsx index.ts [options]

Options:
  --test                 Test mode - create only first 3 sessions
  --resume               Resume from previous interrupted execution  
  --delay-ms <number>    Add delay (ms) between API requests
  --help, -h             Show help message
```

## Generated Output

### Session Notes
Each session gets a note with this structure:
```markdown
# Session Title - Speaker Name

**Time:** 09:00 ~ 09:30 | **Room:** Main Stage

{%hackmd @TechConf/announcement-note-id %}

> ==投影片==
> （講者請在此放置投影片連結）

> ==Q & A==
> （講者 Q&A 相關連結）

## 📝 筆記區
> 請從這裡開始記錄你的筆記

## ❓ Q&A 區域  
> 講者問答與現場互動

## 💬 討論區
> 歡迎在此進行討論與交流
```

### Main Book Note
The index book organizes sessions by day:
```markdown
TechConf 2025 共同筆記
===

## 歡迎來到 TechConf 2025！

- [HackMD 快速入門](https://hackmd.io/s/BJvtP4zGX)
- [HackMD 會議功能介紹](https://hackmd.io/s/BJHWlNQMX)

## 議程筆記

### 03/15
- 09:00 ~ 09:30 [Opening Keynote: The Future of Technology - John Doe](/session-note-id) (Main Stage)
- 10:00 ~ 10:45 [Advanced Cloud Architecture - Jane Smith](/session-note-id) (Room A)
```

## Resume Functionality

The script automatically saves progress to `progress.json`:

```json
{
  "completedSessions": ["session-001", "session-002"],
  "sessionNotes": {
    "session-001": "https://hackmd.io/abc123",
    "session-002": "https://hackmd.io/def456"
  },
  "mainBookCreated": false,
  "startedAt": "2025-01-15T10:00:00.000Z"
}
```

### When to Use Resume

Use `--resume` when:
- Script was interrupted (network issues, power outage, etc.)
- Hit API rate limits and need to continue later
- Want to add new sessions to existing conference notes

### Resume Workflow

```bash
# 1. Start generation
npx tsx index.ts --delay-ms 300

# 2. Script fails after 50 sessions (network issue)
# 3. Wait a few minutes for rate limits to reset
# 4. Resume from session 51
npx tsx index.ts --resume --delay-ms 400
```

## Troubleshooting

### Environment Variable Issues

Test if your `.env` file is loaded correctly:
```bash
node test-env.js
```

### Common Errors

**401 Authentication Error**
- Check `HACKMD_ACCESS_TOKEN` is correct
- Verify token has team permissions
- Ensure API endpoint is correct

**"Session file not found"**
- Ensure `sessions.json` exists in same directory
- Check JSON format is valid

**"Failed to create note"**
- Check team permissions
- Verify `TEAM_PATH` is correct
- Check API quota limits

### Manual Override

If `.env` isn't working:
```bash
export HACKMD_ACCESS_TOKEN=your_token_here
npx tsx index.ts --test
```

## Customization

The example is designed to be easily customizable:

### Session Note Template
Edit `generateSessionNoteContent()` function to change note structure.

### Book Organization  
Edit `generateBookContent()` function to change how sessions are grouped.

### Excluded Sessions
Edit `EXCLUDE_SESSIONS` array to filter out non-content sessions.

### Conference Details
Change `CONFERENCE_NAME`, `TEAM_PATH`, and `ANNOUNCEMENT_NOTE` constants.

## Production Tips

1. **Always test first**: Use `--test` to verify configuration
2. **Use rate limiting**: Add `--delay-ms 300` for large conferences  
3. **Monitor progress**: Keep `progress.json` until completion
4. **Plan for interruptions**: Use `--resume` if anything goes wrong
5. **Check permissions**: Ensure your token can create team notes

## License

This example is part of the HackMD API client and is licensed under the MIT License.