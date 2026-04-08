/**
 * Message variable substitution utility
 * Handles replacing placeholders like {name} with actual contact data
 */

export interface ContactVariables {
  name: string
  phone?: string
  email?: string
  [key: string]: string | undefined
}

/**
 * Substitutes variables in a message template
 * Example: substituteVariables("Hello {name}!", { name: "John" }) => "Hello John!"
 * 
 * @param message - Message template with {variable} placeholders
 * @param variables - Object with variable values
 * @returns Message with variables substituted
 */
export function substituteVariables(
  message: string,
  variables: ContactVariables
): string {
  let result = message

  // Replace all {variable} placeholders with actual values
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g')
      result = result.replace(placeholder, String(value))
    }
  }

  return result
}

/**
 * Extracts available variable names from a message
 * Example: extractVariables("Hello {name}, your exam is {date}") => ["name", "date"]
 * 
 * @param message - Message template
 * @returns Array of variable names found in the message
 */
export function extractVariables(message: string): string[] {
  const matches = message.match(/\{(\w+)\}/g) || []
  return [...new Set(matches.map(m => m.slice(1, -1)))] // Remove braces and deduplicate
}

/**
 * Creates variable object from contact data
 * 
 * @param contact - Contact data with id, name, phoneNumber, etc.
 * @returns Variables object for substitution
 */
export function createVariablesFromContact(contact: {
  id?: number
  name: string
  phoneNumber: string
  email?: string
  [key: string]: any
}): ContactVariables {
  return {
    name: contact.name || '',
    phone: contact.phoneNumber || '',
    email: contact.email || '',
  }
}

/**
 * Validates that all required variables in a message have values
 * 
 * @param message - Message template
 * @param variables - Variables object
 * @returns Object with validation result and missing variables
 */
export function validateVariables(
  message: string,
  variables: ContactVariables
): { isValid: boolean; missingVariables: string[] } {
  const requiredVariables = extractVariables(message)
  const missingVariables = requiredVariables.filter(
    v => !variables[v] || variables[v] === undefined
  )

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  }
}

/**
 * Available variables documentation
 */
export const AVAILABLE_VARIABLES = {
  name: 'Contact name (e.g., John Smith)',
  phone: 'Contact phone number (e.g., +254712345678)',
  email: 'Contact email address (e.g., john@example.com)',
}

/**
 * Gets variable usage hint text
 */
export function getVariableHint(): string {
  return 'Use {name}, {phone}, or {email} in your message. Each recipient will see their own information.\n\nExample: "Hello {name}, your code is 1234"'
}
