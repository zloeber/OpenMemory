# Namespaces in OpenMemory

Namespaces in OpenMemory provide complete data isolation for your memories, allowing you to logically separate and organize memory storage by context, project, or use case.

## Key Features of Namespaces
- **Complete Isolation**: Each namespace operates independently with its own isolated data storage, ensuring memories never overlap between namespaces.
- **Required Parameter**: All memory operations require a namespace to be specified, ensuring intentional data organization.
- **Scalability**: Easily add or remove namespaces as your needs evolve, allowing for flexible management of resources. Namespaces are created upon use.
- **Flexibility**: You can create memory systems that can simultaneously have history for one project path while also maintaining a broader history of your interactions by simply targeting multiple namespaces. For example, add a memory to both "global" and "project1" namespaces in a single call.

## Challenge

It can be putting quite a bit of strain to request that the calling LLM presort and store memories across multiple types. To work around this some we can use the `/memory/ingest` API endpoint. Sending via a POST command will automatically call the configured LLM and model to sort and add the memories for the data provided 

## Memory Types

OpenMemory stores memories across multiple cognitive sectors within each namespace:

- **Semantic Memory**: Facts, knowledge, conventions
- **Episodic Memory**: Events, failures, unique occurrences
- **Procedural Memory**: Workflows, processes, steps
- **Reflective Memory**: Reasoning, lessons learned
- **Emotional Memory**: User feedback, sentiment

> **NOTE** Knowledge graphs are supported as "Temporal" memories. This is a static memory and is not processed for salience decay over time. This is useful for post-memory processing to cement the most important knowledge. This process is still WIP.

## API Usage

All memory operations require a `namespaces` parameter:

```json
// Adding a memory
POST /memory/add
{
  "content": "Important fact to remember",
  "namespaces": ["project-alpha"],
  "tags": ["important"]
}

// Querying memories
POST /memory/query
{
  "query": "What do I know about the project?",
  "namespaces": ["project-alpha"],
  "k": 5
}

// Listing memories
GET /memory/all?namespace=project-alpha&l=100
```

## Managing Namespaces

Namespaces can be managed through the OpenMemory dashboard or via API calls:

```bash
# List all namespaces
GET /api/namespaces

# Get namespace details
GET /api/namespaces/{namespace}

# Create a namespace
POST /api/namespaces
{
  "namespace": "project-alpha",
  "description": "Memories for Project Alpha"
}

# Delete a namespace
DELETE /api/namespaces/{namespace}
```

## Best Practices

- Use descriptive namespace names (e.g., `user-123`, `project-alpha`, `team-engineering`)
- Create separate namespaces for different contexts or projects
- Consider namespace naming conventions for easier management
- Regularly audit and clean up unused namespaces
