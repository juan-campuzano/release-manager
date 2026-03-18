import { 
  formatValidationErrors, 
  groupErrorsByField, 
  formatFieldErrorsForDisplay,
  FieldError 
} from './validation-formatter';
import { ValidationResult } from '../application/config-parser';

describe('validation-formatter', () => {
  describe('formatValidationErrors', () => {
    it('should format platform errors', () => {
      const validationResult: ValidationResult = {
        valid: false,
        errors: ['Platform is required', 'Invalid platform: must be one of iOS, Android, Desktop']
      };
      
      const fieldErrors = formatValidationErrors(validationResult);
      
      expect(fieldErrors).toHaveLength(2);
      expect(fieldErrors[0].field).toBe('platform');
      expect(fieldErrors[1].field).toBe('platform');
    });
    
    it('should format version errors', () => {
      const validationResult: ValidationResult = {
        valid: false,
        errors: ['Version is required', 'Version must follow semantic versioning format (e.g., 1.2.3)']
      };
      
      const fieldErrors = formatValidationErrors(validationResult);
      
      expect(fieldErrors).toHaveLength(2);
      expect(fieldErrors[0].field).toBe('version');
      expect(fieldErrors[1].field).toBe('version');
    });
    
    it('should format branch name errors', () => {
      const validationResult: ValidationResult = {
        valid: false,
        errors: ['Branch name is required']
      };
      
      const fieldErrors = formatValidationErrors(validationResult);
      
      expect(fieldErrors[0].field).toBe('branchName');
    });
    
    it('should format quality threshold errors', () => {
      const validationResult: ValidationResult = {
        valid: false,
        errors: [
          'Crash rate threshold is required',
          'CPU exception rate threshold must be between 0 and 100'
        ]
      };
      
      const fieldErrors = formatValidationErrors(validationResult);
      
      expect(fieldErrors[0].field).toBe('qualityThresholds.crashRateThreshold');
      expect(fieldErrors[1].field).toBe('qualityThresholds.cpuExceptionRateThreshold');
    });
    
    it('should format squad errors', () => {
      const validationResult: ValidationResult = {
        valid: false,
        errors: ['At least one required squad must be specified']
      };
      
      const fieldErrors = formatValidationErrors(validationResult);
      
      expect(fieldErrors[0].field).toBe('requiredSquads');
    });
  });
  
  describe('groupErrorsByField', () => {
    it('should group errors by field name', () => {
      const fieldErrors: FieldError[] = [
        { field: 'platform', message: 'Platform is required' },
        { field: 'platform', message: 'Invalid platform' },
        { field: 'version', message: 'Version is required' }
      ];
      
      const grouped = groupErrorsByField(fieldErrors);
      
      expect(grouped.size).toBe(2);
      expect(grouped.get('platform')).toHaveLength(2);
      expect(grouped.get('version')).toHaveLength(1);
    });
  });
  
  describe('formatFieldErrorsForDisplay', () => {
    it('should format field errors for display', () => {
      const fieldErrors: FieldError[] = [
        { field: 'platform', message: 'Platform is required' },
        { field: 'version', message: 'Version must follow semantic versioning' }
      ];
      
      const formatted = formatFieldErrorsForDisplay(fieldErrors);
      
      expect(formatted).toContain('Platform: Platform is required');
      expect(formatted).toContain('Version: Version must follow semantic versioning');
    });
    
    it('should handle nested field names', () => {
      const fieldErrors: FieldError[] = [
        { field: 'qualityThresholds.crashRateThreshold', message: 'Must be between 0 and 100' }
      ];
      
      const formatted = formatFieldErrorsForDisplay(fieldErrors);
      
      expect(formatted).toContain('Quality Thresholds > Crash Rate Threshold');
    });
    
    it('should return empty string for no errors', () => {
      const formatted = formatFieldErrorsForDisplay([]);
      
      expect(formatted).toBe('');
    });
    
    it('should handle general errors', () => {
      const fieldErrors: FieldError[] = [
        { field: 'general', message: 'Configuration is invalid' }
      ];
      
      const formatted = formatFieldErrorsForDisplay(fieldErrors);
      
      expect(formatted).toBe('Configuration is invalid');
    });
  });
});
