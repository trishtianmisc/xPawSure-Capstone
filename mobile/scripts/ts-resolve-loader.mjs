import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Minimal resolver for the Node test runner.
 *
 * The application is bundled by Metro, which resolves extensionless TypeScript
 * imports. Node's native type stripping requires an explicit extension, so the
 * loader retries relative extensionless imports with `.ts`. Production code and
 * Metro resolution are unchanged.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier)
    if (!isRelative || hasExtension || !context.parentURL) throw error

    const candidate = new URL(`${specifier}.ts`, context.parentURL)
    if (existsSync(fileURLToPath(candidate))) {
      return nextResolve(candidate.href, context)
    }
    throw error
  }
}
