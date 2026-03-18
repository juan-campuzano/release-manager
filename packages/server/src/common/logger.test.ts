import { Logger, LogLevel } from './logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    logger = new Logger({ enableConsole: false });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Test info message');
    });
    
    it('should log info messages with context', () => {
      logger.info('Test info', { userId: '123', action: 'login' });
      
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toEqual({ userId: '123', action: 'login' });
    });
  });
  
  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning');
      
      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].message).toBe('Test warning');
    });
  });
  
  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].error).toBe(error);
      expect(logs[0].stackTrace).toBeDefined();
    });
    
    it('should log error messages with context', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { releaseId: 'rel-123' });
      
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toEqual({ releaseId: 'rel-123' });
    });
  });
  
  describe('critical', () => {
    it('should log critical messages', () => {
      const error = new Error('Critical failure');
      logger.critical('System failure', error);
      
      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe(LogLevel.CRITICAL);
      expect(logs[0].message).toBe('System failure');
    });
  });
  
  describe('log level filtering', () => {
    it('should respect minimum log level', () => {
      const warnLogger = new Logger({ minLevel: LogLevel.WARN, enableConsole: false });
      
      warnLogger.info('Should not be logged');
      warnLogger.warn('Should be logged');
      warnLogger.error('Should be logged');
      
      const logs = warnLogger.getRecentLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });
  });
  
  describe('getLogsByLevel', () => {
    it('should filter logs by level', () => {
      logger.info('Info 1');
      logger.warn('Warning 1');
      logger.error('Error 1');
      logger.info('Info 2');
      logger.warn('Warning 2');
      
      const warnings = logger.getLogsByLevel(LogLevel.WARN);
      expect(warnings).toHaveLength(2);
      expect(warnings[0].message).toBe('Warning 1');
      expect(warnings[1].message).toBe('Warning 2');
    });
  });
  
  describe('clearLogs', () => {
    it('should clear all logs', () => {
      logger.info('Test 1');
      logger.warn('Test 2');
      logger.error('Test 3');
      
      expect(logger.getRecentLogs()).toHaveLength(3);
      
      logger.clearLogs();
      
      expect(logger.getRecentLogs()).toHaveLength(0);
    });
  });
  
  describe('console output', () => {
    it('should output to console when enabled', () => {
      const consoleLogger = new Logger({ enableConsole: true });
      
      consoleLogger.info('Test info');
      expect(consoleLogSpy).toHaveBeenCalled();
      
      consoleLogger.warn('Test warn');
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleLogger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('should not output to console when disabled', () => {
      logger.info('Test info');
      logger.warn('Test warn');
      logger.error('Test error');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('buffer management', () => {
    it('should maintain buffer size limit', () => {
      const logger = new Logger({ enableConsole: false });
      
      // Add more than 1000 entries
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`);
      }
      
      const logs = logger.getRecentLogs(2000);
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });
});
