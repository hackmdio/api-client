import HackMDAPI from '@hackmd/api';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for required environment variable
if (!process.env.HACKMD_ACCESS_TOKEN) {
  console.error('Error: HACKMD_ACCESS_TOKEN environment variable is not set.');
  console.error('Please set your HackMD access token using one of these methods:');
  console.error('1. Create a .env file with HACKMD_ACCESS_TOKEN=your_token_here');
  console.error('2. Set the environment variable directly: export HACKMD_ACCESS_TOKEN=your_token_here');
  process.exit(1);
}

// Create API client with retry configuration
const client = new HackMDAPI(process.env.HACKMD_ACCESS_TOKEN, 'https://api.hackmd.io/v1', {
  retryConfig: {
    maxRetries: 3,
    baseDelay: 100
  }
});

async function main() {
  try {
    // Example 1: Get user information
    console.log('Getting user information...');
    const me = await client.getMe();
    console.log('User email:', me.email);
    console.log('User name:', me.name);

    // Example 2: Create a new note
    console.log('\nCreating a new note...');
    const newNote = await client.createNote({
      title: 'Test Note',
      content: '# Hello from HackMD API\n\nThis is a test note created using the API client.',
      readPermission: 'guest',
      writePermission: 'owner'
    });
    console.log('Created note ID:', newNote.id);
    console.log('Note URL:', newNote.publishLink);

    // Example 3: Get note with ETag support
    console.log('\nGetting note with ETag support...');
    const note = await client.getNote(newNote.id);
    console.log('Note content:', note.content);
    
    // Second request with ETag
    const updatedNote = await client.getNote(newNote.id, { etag: note.etag });
    console.log('Note status:', updatedNote.status);

    // Example 4: Update note content
    console.log('\nUpdating note content...');
    const updatedContent = await client.updateNoteContent(newNote.id, '# Updated Content\n\nThis note has been updated!');
    console.log('Updated note content:', updatedContent.content);

    // Example 5: Get raw response (unwrapData: false)
    console.log('\nGetting raw response...');
    const rawResponse = await client.getNote(newNote.id, { unwrapData: false });
    console.log('Response headers:', rawResponse.headers);
    console.log('Response status:', rawResponse.status);

    // Example 6: Delete the test note
    console.log('\nCleaning up - deleting test note...');
    await client.deleteNote(newNote.id);
    console.log('Note deleted successfully');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

main(); 