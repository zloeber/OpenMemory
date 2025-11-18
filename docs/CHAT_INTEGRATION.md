# Chat History Integration API

This document describes the API endpoints for integrating chat history as a means to update memory namespaces.

## Overview

The Chat Integration API allows you to process conversation histories using an LLM (Large Language Model), which automatically extracts important information and stores it as memories in OpenMemory. The LLM analyzes the conversation and determines the appropriate memory types (sectors) for each piece of information.

## Configuration

The system uses LLM configuration that can be set via environment variables:

### Environment Variables

```bash
# LLM provider for processing chat history: ollama | openai
OM_LLM_CHAT_PROVIDER=ollama

# Model to use for chat processing
# For Ollama: llama3.2:latest, llama2, mistral, etc.
# For OpenAI: gpt-4, gpt-3.5-turbo, etc.
OM_LLM_CHAT_MODEL=llama3.2:latest

# Temperature for LLM responses (0.0 to 1.0)
# Lower = more deterministic, Higher = more creative
OM_LLM_CHAT_TEMPERATURE=0.7

# Maximum tokens in LLM response
OM_LLM_CHAT_MAX_TOKENS=2000
```

## API Endpoints

### 1. Get LLM Configuration

Get the current LLM configuration being used for chat processing.

**Endpoint:** `GET /api/chat/config`

**Response:**
```json
{
  "provider": "ollama",
  "model": "llama3.2:latest",
  "temperature": 0.7,
  "max_tokens": 2000,
  "ollama_url": "http://localhost:11434"
}
```

### 2. Process Chat History

Process a conversation history and extract memories using an LLM.

**Endpoint:** `POST /api/chat/integrate`

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I prefer using dark mode for coding",
      "timestamp": 1699999999000
    },
    {
      "role": "assistant",
      "content": "I've noted your preference for dark mode.",
      "timestamp": 1700000000000
    }
  ],
  "user_id": "user123",
  "namespace": "project-alpha",
  "model": "llama3.2:latest",
  "metadata": {
    "source": "chat_app",
    "session_id": "abc123"
  }
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | Array | Yes | Array of chat messages |
| `messages[].role` | String | Yes | Message role: `user`, `assistant`, or `system` |
| `messages[].content` | String | Yes | Message content |
| `messages[].timestamp` | Number | No | Unix timestamp in milliseconds |
| `user_id` | String | No | User ID or namespace for memory isolation |
| `namespace` | String | No | Alternative way to specify namespace |
| `model` | String | No | Override the default LLM model |
| `metadata` | Object | No | Additional metadata to attach to all memories |

**Note:** `user_id` or `namespace` can also be provided via the `X-Namespace` header.

**Response:**
```json
{
  "success": true,
  "memories_created": 3,
  "memories": [
    {
      "id": "mem-uuid-1",
      "primary_sector": "semantic",
      "sectors": ["semantic"],
      "chunks": 1
    },
    {
      "id": "mem-uuid-2",
      "primary_sector": "procedural",
      "sectors": ["procedural"],
      "chunks": 1
    }
  ],
  "extracted": [
    {
      "content": "User prefers dark mode for coding",
      "sector": "semantic",
      "tags": ["preference", "ui"],
      "metadata": {}
    },
    {
      "content": "User uses TypeScript for all projects",
      "sector": "procedural",
      "tags": ["programming", "typescript"],
      "metadata": {}
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether the operation succeeded |
| `memories_created` | Number | Number of memories created |
| `memories` | Array | Array of created memory objects |
| `extracted` | Array | Array of extracted memory information from LLM |

**Error Responses:**

- `400 Bad Request`: Invalid request format or missing required fields
- `500 Internal Server Error`: LLM processing or storage error

## Memory Sectors

The LLM automatically classifies memories into these sectors:

- **episodic**: Specific events, experiences, or interactions
- **semantic**: Facts, concepts, definitions, or general knowledge
- **procedural**: How-to knowledge, processes, or step-by-step instructions
- **emotional**: Emotional states, feelings, or sentiment-laden information
- **reflective**: Meta-thoughts, insights, or self-awareness

## Usage Examples

### Basic Usage with cURL

```bash
# Get LLM configuration
curl http://localhost:8080/api/chat/config

# Process chat history
curl -X POST http://localhost:8080/api/chat/integrate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I prefer dark mode for coding"
      },
      {
        "role": "assistant",
        "content": "Noted. Dark mode is easier on the eyes."
      },
      {
        "role": "user",
        "content": "I always use TypeScript in my projects"
      }
    ],
    "user_id": "user123"
  }'
```

### JavaScript/TypeScript Example

```typescript
const API_URL = "http://localhost:8080";

async function processChatHistory(messages, userId) {
  const response = await fetch(`${API_URL}/api/chat/integrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages,
      user_id: userId,
    }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Created ${result.memories_created} memories`);
    return result.memories;
  } else {
    throw new Error(result.error);
  }
}

// Usage
const messages = [
  { role: "user", content: "I work as a software engineer" },
  { role: "assistant", content: "That's great! What technologies do you use?" },
  { role: "user", content: "Mainly React and Node.js" },
];

const memories = await processChatHistory(messages, "user123");
```

### Python Example

```python
import requests

API_URL = "http://localhost:8080"

def process_chat_history(messages, user_id):
    response = requests.post(
        f"{API_URL}/api/chat/integrate",
        json={
            "messages": messages,
            "user_id": user_id
        }
    )
    
    result = response.json()
    
    if result.get("success"):
        print(f"Created {result['memories_created']} memories")
        return result["memories"]
    else:
        raise Exception(result.get("error"))

# Usage
messages = [
    {"role": "user", "content": "I work as a software engineer"},
    {"role": "assistant", "content": "That's great! What technologies do you use?"},
    {"role": "user", "content": "Mainly React and Node.js"}
]

memories = process_chat_history(messages, "user123")
```

## LLM Provider Setup

### Ollama Setup

1. Install Ollama from https://ollama.ai
2. Pull a model:
   ```bash
   ollama pull llama3.2:latest
   ```
3. Ensure Ollama is running (default: http://localhost:11434)
4. Set environment variables:
   ```bash
   OM_LLM_CHAT_PROVIDER=ollama
   OM_LLM_CHAT_MODEL=llama3.2:latest
   ```

### OpenAI Setup

1. Get an OpenAI API key from https://platform.openai.com
2. Set environment variables:
   ```bash
   OM_LLM_CHAT_PROVIDER=openai
   OM_LLM_CHAT_MODEL=gpt-4
   OPENAI_API_KEY=your-api-key-here
   ```

## Best Practices

1. **Batch Processing**: Process conversations in reasonable chunks (10-50 messages) for optimal LLM performance
2. **Namespace Isolation**: Always specify a `user_id` or `namespace` to keep memories isolated
3. **Error Handling**: Implement retry logic for LLM timeouts or rate limits
4. **Temperature**: Use lower temperature (0.3-0.5) for more consistent extraction
5. **Metadata**: Include relevant metadata like session IDs, timestamps, or source information

## Troubleshooting

### LLM Connection Errors

If you see "ECONNREFUSED" errors:
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check `OLLAMA_URL` environment variable
- For OpenAI: verify API key is valid

### Empty Memory Extraction

If no memories are created:
- Check LLM response in server logs
- Verify conversation has substantive content
- Try adjusting `OM_LLM_CHAT_TEMPERATURE`
- Use a different model

### Rate Limiting

For high-volume usage:
- Implement request queuing
- Use local models (Ollama) to avoid API rate limits
- Add delays between requests
