/**
 * Validation error formatter for UI feedback
 * Provides field-level validation messages for user-friendly error display
 */

import { ValidationResult } from '../application/config-parser';

/**
 * Field-level validation error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Format validation errors into field-level errors for UI display
 * @param validationResult Validation result from config parser
 * @returns Array of field-level errors
 */
export function formatValidationErrors(validationResult: ValidationResult): FieldError[] {
  const fieldErrors: FieldError[] = [];
  
  for (const error of validationResult.errors) {
    const fieldError = parseErrorMessage(error);
    fieldErrors.push(fieldError);
  }
  
  return fieldErrors;
}

/**
 * Parse an error message to extract field name and message
 * @param error Error message string
 * @returns Field error object
 */
function parseErrorMessage(error: string): FieldError {
  // Platform errors
  if (error.includes('Platform') || error.includes('platform')) {
    return { field: 'platform', message: error };
  }
  
  // Version errors
  if (error.includes('Version') || error.includes('version')) {
    return { field: 'version', message: error };
  }
  
  // Branch name errors
  if (error.includes('Branch name') || error.includes('branch')) {
    return { field: 'branchName', message: error };
  }
  
  // Repository URL errors
  if (error.includes('Repository URL') || error.includes('repository')) {
    return { field: 'repositoryUrl', message: error };
  }
  
  // Source type errors
  if (error.includes('Source type') || error.includes('source')) {
    return { field: 'sourceType', message: error };
  }
  
  // Required squads errors
  if (error.includes('Required squad') || error.includes('squad')) {
    return { field: 'requiredSquads', message: error };
  }
  
  // Quality thresholds errors
  if (error.includes('Crash rate threshold') || error.includes('crash rate')) {
    return { field: 'qualityThresholds.crashRateThreshold', message: error };
  }
  
  if (error.includes('CPU exception rate threshold') || error.includes('CPU exception')) {
    return { field: 'qualityThresholds.cpuExceptionRateThreshold', message: error };
  }
  
  if (error.includes('Quality thresholds')) {
    return { field: 'qualityThresholds', message: error };
  }
  
  // Rollout stages errors
  if (error.includes('Rollout stage') || error.includes('rollout')) {
    return { field: 'rolloutStages', message: error };
  }
  
  // CI pipeline ID errors
  if (error.includes('CI pipeline')) {
    return { field: 'ciPipelineId', message: error };
  }
  
  // Analytics project ID errors
  if (error.includes('Analytics project')) {
    return { field: 'analyticsProjectId', message: error };
  }
  
  // Default to general error
  return { field: 'general', message: error };
}

/**
 * Group field errors by field name
 * @param fieldErrors Array of field errors
 * @returns Map of field name to array of error messages
 */
export function groupErrorsByField(fieldErrors: FieldError[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  
  for (const fieldError of fieldErrors) {
    const existing = grouped.get(fieldError.field) || [];
    existing.push(fieldError.message);
    grouped.set(fieldError.field, existing);
  }
  
  return grouped;
}

/**
 * Format field errors for display in UI
 * @param fieldErrors Array of field errors
 * @returns Formatted error message string
 */
export function formatFieldErrorsForDisplay(fieldErrors: FieldError[]): string {
  if (fieldErrors.length === 0) {
    return '';
  }
  
  const grouped = groupErrorsByField(fieldErrors);
  const messages: string[] = [];
  
  for (const [field, errors] of grouped.entries()) {
    if (field === 'general') {
      messages.push(...errors);
    } else {
      const fieldName = formatFieldName(field);
      messages.push(`${fieldName}: ${errors.join(', ')}`);
    }
  }
  
  return messages.join('\n');
}

/**
 * Format field name for display
 * @param field Field name
 * @returns Formatted field name
 */
function formatFieldName(field: string): string {
  // Handle nested fields
  if (field.includes('.')) {
    const parts = field.split('.');
    return parts.map(part => formatSingleFieldName(part)).join(' > ');
  }
  
  return formatSingleFieldName(field);
}

/**
 * Format a single field name for display
 * @param field Field name
 * @returns Formatted field name
 */
function formatSingleFieldName(field: string): string {
  // Convert camelCase to Title Case
  const withSpaces = field.replace(/([A-Z])/g, ' $1');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
