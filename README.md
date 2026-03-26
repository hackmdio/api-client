# HackMD API Clients

This repository contains a set of packages for interacting with the [HackMD API](https://hackmd.io/).

## Node.JS

See [README](./nodejs)

## Examples

To help you get started quickly, we provide comprehensive usage examples in the `examples/` directory:

### Node.js Example

The `examples/nodejs/` directory contains a complete example project demonstrating:

- User information retrieval
- Note creation and management
- ETag support for caching
- Content updates
- Error handling with retry logic
- Environment variable configuration

To run the Node.js example:

1. Navigate to the example directory: `cd examples/nodejs`
2. Follow the setup instructions in [examples/nodejs/README.md](./examples/nodejs/README.md)
3. Set your HackMD access token
4. Run `npm start`

The example includes detailed comments and demonstrates best practices for using the HackMD API client.

### Book Mode Conference Note Example

The `examples/book-mode-conference/` directory contains a TypeScript example for creating a "book mode" conference note system:

- **Book Mode Notes**: Creates a master note that links to all session notes
- **Bulk Note Creation**: Automatically creates individual notes for each conference session
- **TypeScript Implementation**: Full type safety with tsx support for direct execution
- **Configurable Templates**: Customizable note templates and conference settings
- **Hierarchical Organization**: Sessions organized by day and time in the main book
- **Error Handling**: Graceful handling of API failures during bulk operations

To run the book mode conference example:

1. Navigate to the example directory: `cd examples/book-mode-conference`
2. Follow the setup instructions in [examples/book-mode-conference/README.md](./examples/book-mode-conference/README.md)
3. Customize the configuration constants and session data
4. Set your HackMD access token
5. Run `npm start`

This example demonstrates advanced usage patterns including bulk operations, team note management, and creating interconnected note structures for conferences or events.

### AI Conference Assistant (Web)

The `examples/ai-conference-assistant/` directory contains a web-based AI assistant that helps create book-mode conference notes through a chat interface:

- **Chat Interface**: Conversational AI (powered by Vercel AI SDK) guides you through conference note creation
- **Frontend API Key Entry**: Provide your HackMD and OpenAI API keys from the browser — no server-side secrets needed
- **Session Data Analysis**: Upload conference session JSON; the AI uses a jq-like tool to efficiently analyze data shape
- **Reference Note Fetching**: Point the AI to existing HackMD notes to replicate formatting from previous conferences
- **Markdown Preview**: Preview the generated homepage and all session pages before creating
- **Rate-Limit-Aware Creation**: Batch note creation with configurable delay and real-time SSE progress tracking

To run the AI conference assistant:

1. Navigate to the example directory: `cd examples/ai-conference-assistant`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) and enter your credentials

See [examples/ai-conference-assistant/README.md](./examples/ai-conference-assistant/README.md) for full documentation.

## LICENSE

MIT
