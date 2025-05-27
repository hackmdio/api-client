# HackMD API Client Example

This is an example project demonstrating the usage of the HackMD API client.

## Setup

1. First, install the dependencies:
```bash
npm install
```

2. Set up your HackMD access token using one of these methods:

   a. Set it as an environment variable:
   ```bash
   # For Unix/Linux/macOS
   export HACKMD_ACCESS_TOKEN=your_access_token_here
   
   # For Windows PowerShell
   $env:HACKMD_ACCESS_TOKEN="your_access_token_here"
   ```

   b. Or create a `.env` file in the project root (not tracked by git):
   ```
   HACKMD_ACCESS_TOKEN=your_access_token_here
   ```

You can get your access token from [HackMD API documentation](https://hackmd.io/@hackmd-api/developer-portal).

## Running the Example

To run the example:

```bash
npm start
```

## What's Demonstrated

The example demonstrates several features of the HackMD API client:

1. Getting user information
2. Creating a new note
3. Using ETag support for caching
4. Updating note content
5. Getting raw response data
6. Deleting notes

## Features Shown

- Retry configuration with exponential backoff
- ETag support for caching
- Response data unwrapping
- Error handling
- Environment variable configuration 