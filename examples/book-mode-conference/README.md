# Book Mode Conference Note Generator

This example demonstrates how to create a "book mode" conference note system using the HackMD API. Book mode is a Markdown note that contains organized links to each session note page, making it easy for conference attendees to navigate between different session notes.

## What This Example Does

The script performs the following actions:

1. **Loads Session Data**: Reads conference session information from `sessions.json`
2. **Creates Individual Session Notes**: For each session, creates a dedicated HackMD note with:
   - Session title and speaker information
   - Embedded announcement note
   - Sections for notes, discussion, and related links
   - Appropriate tags and permissions
3. **Generates Main Book Note**: Creates a master note that:
   - Contains welcome information and useful links
   - Organizes all session notes by day and time
   - Provides easy navigation to all sessions
   - Serves as a central hub for the conference

## Features

- **TypeScript Implementation**: Written in TypeScript with full type safety
- **Configurable Constants**: All configuration is centralized at the top of the file
- **Comprehensive Comments**: Well-documented code explaining each section
- **Error Handling**: Graceful handling of API failures
- **tsx Support**: Can be run directly without compilation using tsx
- **Modular Design**: Functions are exportable for potential reuse
- **Flexible Session Data**: Supports various session types and multilingual content

## Setup

### Prerequisites

- Node.js (version 16 or higher)
- A HackMD account with API access
- Access to a HackMD team (for creating team notes)

### Installation

1. **Build the main HackMD API package** (if not already done):
   ```bash
   cd ../../nodejs
   npm install
   npm run build
   cd ../examples/book-mode-conference
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure your HackMD access token**:

   **Option A: Environment Variable**
   ```bash
   # For Unix/Linux/macOS
   export HACKMD_ACCESS_TOKEN=your_access_token_here
   
   # For Windows PowerShell
   $env:HACKMD_ACCESS_TOKEN="your_access_token_here"
   ```

   **Option B: .env File**
   ```bash
   cp .env.example .env
   # Edit .env and add your access token
   ```

   You can get your access token from the [HackMD API documentation](https://hackmd.io/@hackmd-api/developer-portal).

### Configuration

Before running the script, you may want to customize the configuration constants at the top of `index.ts`:

#### Essential Configuration

```typescript
// HackMD announcement note to embed in each session note
const ANNOUNCEMENT_NOTE = '@DevOpsDay/rkO2jyLMlg'

// Team path where notes will be created
const TEAM_PATH = 'DevOpsDay'

// Conference details
const CONFERENCE_CONFIG = {
  name: 'DevOpsDays Taipei 2025',
  website: 'https://devopsdays.tw/',
  community: 'https://www.facebook.com/groups/DevOpsTaiwan/',
  tags: 'DevOpsDays Taipei 2025'
}
```

#### Session Data Format

The script expects session data in `sessions.json` with the following structure:

```json
[
  {
    "id": "session-001",
    "title": "Session Title",
    "speaker": [
      {
        "speaker": {
          "public_name": "Speaker Name"
        }
      }
    ],
    "session_type": "talk",
    "started_at": "2025-03-15T09:00:00Z",
    "finished_at": "2025-03-15T09:30:00Z",
    "tags": ["tag1", "tag2"],
    "classroom": {
      "tw_name": "會議室名稱",
      "en_name": "Room Name"
    },
    "language": "en",
    "difficulty": "General"
  }
]
```

## Running the Example

### Development Mode (with file watching)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Direct Execution with tsx
```bash
npx tsx index.ts
```

## Sample Session Data

The included `sessions.json` contains sample conference session data with:

- **Multiple session types**: keynotes, talks, workshops
- **Multi-day schedule**: Sessions across different days
- **Bilingual support**: English and Traditional Chinese sessions
- **Various difficulty levels**: General, Beginner, Intermediate, Advanced
- **Multiple speakers**: Examples of single and multiple speaker sessions

## Generated Output

The script will create:

1. **Individual Session Notes**: Each with a dedicated HackMD note containing:
   - Session title with speaker names
   - Embedded announcement note
   - Sections for collaborative note-taking
   - Discussion area
   - Related links

2. **Main Conference Book**: A master note containing:
   - Conference welcome information
   - Organized schedule with links to all session notes
   - Quick navigation by day and time
   - Useful conference resources

### Example Output

```
=== Creating Individual Session Notes ===
✓ Created note for: Welcome to DevOpsDays - John Doe
✓ Created note for: Introduction to CI/CD - Jane Smith
✓ Created note for: Advanced Kubernetes Operations - Alex Chen & Sarah Wilson
...

=== Session URLs ===
[
  {
    "id": "session-001",
    "url": "https://hackmd.io/abc123",
    "title": "Welcome to DevOpsDays - John Doe"
  },
  ...
]

=== Main Conference Book Created ===
✓ Book URL: https://hackmd.io/xyz789
🎉 Book mode conference notes created successfully!
📚 Main book contains links to 6 session notes
```

## Customization

### Modifying Note Templates

You can customize the session note template by modifying the `generateSessionNoteContent` function:

```typescript
function generateSessionNoteContent(session: ProcessedSession): string {
  return `# ${session.title}

{%hackmd ${ANNOUNCEMENT_NOTE} %}

## Your Custom Section
> Add your custom content here

## ${SESSION_NOTE_CONFIG.sections.notes}
> ${SESSION_NOTE_CONFIG.sections.notesDescription}

// ... rest of template
`
}
```

### Changing the Book Structure

The book organization can be modified by changing the nesting keys in the main function:

```typescript
// Current: organize by day, then by start time
const nestedSessions = nest(sessionList.filter(s => s.noteUrl !== 'error'), ['day', 'startTime'])

// Alternative: organize by session type, then by day
const nestedSessions = nest(sessionList.filter(s => s.noteUrl !== 'error'), ['sessionType', 'day'])
```

### Adding Additional Metadata

You can extend the session data structure and processing by:

1. Adding new fields to the `ProcessedSession` interface
2. Updating the `loadAndProcessSessions` function to process new fields
3. Modifying the note templates to include the new information

## Error Handling

The script includes comprehensive error handling:

- **Missing Environment Variables**: Clear error messages with setup instructions
- **Missing Session File**: Helpful error message with expected file location
- **API Failures**: Individual session note failures don't stop the entire process
- **Network Issues**: The HackMD API client includes built-in retry logic

## Troubleshooting

### Common Issues

**"HACKMD_ACCESS_TOKEN environment variable is not set"**
- Solution: Set your access token using one of the methods in the Setup section

**"Sessions file not found"**
- Solution: Ensure `sessions.json` exists in the same directory as `index.ts`

**"Failed to create note for [session]"**
- Check your team permissions
- Verify the team path is correct
- Ensure your access token has team note creation permissions

**"Failed to create main book"**
- Same troubleshooting steps as individual notes
- Check that you have sufficient API quota remaining

### Development Tips

1. **Start Small**: Test with a few sessions first by modifying `sessions.json`
2. **Check Permissions**: Ensure your HackMD team allows note creation
3. **Monitor Rate Limits**: The script includes built-in retry logic, but be mindful of API limits
4. **Backup Data**: Consider backing up important notes before running the script

## API Features Demonstrated

This example showcases several HackMD API features:

- **Team Note Creation**: Creating notes within a team context
- **Permission Management**: Setting read/write permissions for notes
- **Content Templates**: Using consistent note structures
- **Bulk Operations**: Creating multiple notes programmatically
- **Error Handling**: Graceful handling of API errors

## License

This example is part of the HackMD API client and is licensed under the MIT License.

## Contributing

If you have suggestions for improving this example or find bugs, please open an issue or submit a pull request to the main repository.