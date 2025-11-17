import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ENV_PATH = path.resolve(process.cwd(), '../.env')
const IS_DOCKER = process.env.DOCKER_CONTAINER === 'true' || !fs.existsSync(ENV_PATH)

function parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {}
    const lines = content.split('\n')

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        const equalIndex = trimmed.indexOf('=')
        if (equalIndex === -1) continue

        const key = trimmed.substring(0, equalIndex).trim()
        const value = trimmed.substring(equalIndex + 1).trim()
        result[key] = value
    }

    return result
}

function getEnvironmentVariables(): Record<string, string> {
    const result: Record<string, string> = {}
    
    // Get all OM_* and related environment variables
    const relevantPrefixes = ['OM_', 'OPENAI_', 'GEMINI_', 'OLLAMA_', 'LOCAL_MODEL_', 'NEXT_PUBLIC_']
    
    for (const [key, value] of Object.entries(process.env)) {
        if (relevantPrefixes.some(prefix => key.startsWith(prefix)) && value !== undefined) {
            result[key] = value
        }
    }
    
    return result
}

function serializeEnvFile(updates: Record<string, string>): string {
    const lines: string[] = []

    for (const [key, value] of Object.entries(updates)) {
        lines.push(`${key}=${value}`)
    }

    return lines.join('\n')
}

export async function GET() {
    try {
        let settings: Record<string, string> = {}
        
        // In Docker or when .env file doesn't exist, read from process.env
        if (IS_DOCKER) {
            settings = getEnvironmentVariables()
        } else {
            // In local development, read from .env file if it exists
            if (fs.existsSync(ENV_PATH)) {
                const content = fs.readFileSync(ENV_PATH, 'utf-8')
                settings = parseEnvFile(content)
            } else {
                // Fallback to process.env if file doesn't exist
                settings = getEnvironmentVariables()
            }
        }

        // Mask sensitive values
        const masked = { ...settings }
        if (masked.OPENAI_API_KEY) masked.OPENAI_API_KEY = '***'
        if (masked.GEMINI_API_KEY) masked.GEMINI_API_KEY = '***'
        if (masked.OM_API_KEY) masked.OM_API_KEY = '***'
        if (masked.OM_PG_PASSWORD) masked.OM_PG_PASSWORD = '***'
        if (masked.OM_WEAVIATE_API_KEY) masked.OM_WEAVIATE_API_KEY = '***'
        if (masked.NEXT_PUBLIC_API_KEY) masked.NEXT_PUBLIC_API_KEY = '***'

        return NextResponse.json({
            exists: true,
            settings: masked,
            source: IS_DOCKER ? 'environment' : 'file'
        })
    } catch (e: any) {
        console.error('[Settings API] read error:', e)
        return NextResponse.json(
            { error: 'internal', message: e.message },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const updates = await request.json()

        if (!updates || typeof updates !== 'object') {
            return NextResponse.json(
                { error: 'invalid_body' },
                { status: 400 }
            )
        }

        // In Docker, we can't modify environment variables at runtime
        if (IS_DOCKER) {
            return NextResponse.json(
                { 
                    error: 'read_only',
                    message: 'Settings are read-only in Docker. Update docker-compose.yml or .env file and restart containers.'
                },
                { status: 403 }
            )
        }

        let content = ''
        let envExists = false

        if (fs.existsSync(ENV_PATH)) {
            content = fs.readFileSync(ENV_PATH, 'utf-8')
            envExists = true
        } else {
            const examplePath = path.resolve(process.cwd(), '../.env.example')
            if (fs.existsSync(examplePath)) {
                content = fs.readFileSync(examplePath, 'utf-8')
            }
        }

        const existing = content ? parseEnvFile(content) : {}
        const merged = { ...existing, ...updates }
        const newContent = serializeEnvFile(merged)

        fs.writeFileSync(ENV_PATH, newContent, 'utf-8')

        return NextResponse.json({
            ok: true,
            created: !envExists,
            message: 'Settings saved. Restart the backend to apply changes.'
        })
    } catch (e: any) {
        console.error('[Settings API] write error:', e)
        return NextResponse.json(
            { error: 'internal', message: e.message },
            { status: 500 }
        )
    }
}
