import { createContext, useContext, ReactNode, useMemo } from 'react';
import { APIClient, createAPIClient } from '../client';
import { ReleaseService } from '../services/ReleaseService';
import { MetricsService } from '../services/MetricsService';
import { HealthService } from '../services/HealthService';
import { ConfigService } from '../services/ConfigService';
import { PipelineExecutionService } from '../services/PipelineExecutionService';
import { TagStatusService } from '../services/TagStatusService';

/**
 * Services available through context
 */
export interface Services {
  apiClient: APIClient;
  releaseService: ReleaseService;
  metricsService: MetricsService;
  healthService: HealthService;
  configService: ConfigService;
  pipelineExecutionService: PipelineExecutionService;
  tagStatusService: TagStatusService;
}

/**
 * Services context
 */
const ServicesContext = createContext<Services | undefined>(undefined);

/**
 * Props for ServicesProvider
 */
interface ServicesProviderProps {
  children: ReactNode;
}

/**
 * Services Provider component
 * 
 * Provides service instances to the application
 */
export function ServicesProvider({ children }: ServicesProviderProps): JSX.Element {
  const services = useMemo(() => {
    const apiClient = createAPIClient();
    
    return {
      apiClient,
      releaseService: new ReleaseService(apiClient),
      metricsService: new MetricsService(apiClient),
      healthService: new HealthService(apiClient),
      configService: new ConfigService(apiClient),
      pipelineExecutionService: new PipelineExecutionService(apiClient),
      tagStatusService: new TagStatusService(apiClient),
    };
  }, []);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

/**
 * Hook to access services context
 * 
 * @returns Services context value
 * @throws Error if used outside ServicesProvider
 */
export function useServices(): Services {
  const context = useContext(ServicesContext);
  
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  
  return context;
}
