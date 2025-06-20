# @nimbu-cli/proxy-server

HTTP proxy server for Nimbu CLI development that forwards requests to the Nimbu simulator API.

## Features

- Lightweight HTTP server
- Request metadata extraction
- Template packing and forwarding
- File upload handling
- Simulator API integration

## Installation

```bash
npm install @nimbu-cli/proxy-server
```

## Usage

```typescript
import { ProxyServer } from '@nimbu-cli/proxy-server'

const server = new ProxyServer({
  port: 3000,
  host: 'localhost',
  apiUrl: 'https://api.nimbu.io',
  templatePath: './templates'
})

await server.start()
```

## API

### ProxyServer

Main server class that handles HTTP requests and forwards them to the Nimbu simulator.

#### Constructor Options

- `port: number` - Port to listen on
- `host?: string` - Host to bind to (default: 'localhost')
- `apiUrl?: string` - Nimbu API base URL
- `templatePath?: string` - Path to template files

#### Methods

- `start(options?: ProxyServerOptions): Promise<void>` - Start the server
- `stop(): Promise<void>` - Stop the server
- `use(middleware: ProxyMiddleware): void` - Add middleware